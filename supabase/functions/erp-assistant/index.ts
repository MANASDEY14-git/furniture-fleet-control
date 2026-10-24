import { createClient } from "npm:@supabase/supabase-js@2";
import { streamText, tool, stepCountIs } from "npm:ai@5";
import { createOpenAI } from "npm:@ai-sdk/openai@2";
import { z } from "npm:zod@3.25.76";
import { createLovableAiGatewayRunIdFetch } from "../_shared/run-id.ts";
import {
  FACT_LABELS, getCashPosition, getDeliveries, getFollowups, getPayables,
  getReceivables, getReorder, getSalesSummary, getStockStatus,
} from "../_shared/businessFacts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "openai/gpt-5.6-sol";

const SYSTEM_PROMPT = `You are the AI business assistant for a furniture retail ERP. You coordinate the Sales, Inventory, Purchases and Finance departments, and you answer the owner's and staff's questions.

## Honesty rules (never break these)
1. Every number you quote MUST come from a tool result fetched in this conversation turn. Never estimate, extrapolate or invent figures. If you have not fetched it, call the tool first.
2. Always say the store and the scope/period of the figure, e.g. "BIJOY FURNISHERS — all open orders as of 24 Oct 2026".
3. If a tool fails or returns no data, say so plainly (e.g. "I couldn't read the bank balances — you may not have finance access"). Never fill the gap with a guess.
4. Quotes and cancelled orders never count as sales or dues (the tools already exclude them).
5. Use Indian Rupees with Indian digit grouping (₹1,50,000). Be concise: lead with the direct answer, then a short breakdown.
6. Furniture demand is intermittent: never invent daily velocity or "weeks of cover". Quote the reorder engine's evidence sentences.

## Which tool
- Money customers owe, dues, receivables, who owes most, aging → get_receivables
- Sales/revenue/orders for any period, top items/customers, comparisons → get_sales_summary (call once per period to compare)
- Bank/cash balance → get_cash_position
- Money owed to suppliers → get_payables
- Stock on hand, out of stock, stock value → get_stock_status
- What to reorder, dead stock → get_reorder_suggestions
- Pending/late deliveries → get_deliveries
- Follow-ups and collection calls to make → get_followups
Call several tools when the question needs them. For greetings or "how do I…" app questions, no tool is needed.

## App navigation
- New order / quote: Sales hub → Create Order / New Quote (quotes convert to orders once Accepted)
- Add item: Inventory → Add Item. Record purchase: Purchasing → New Purchase
- Record payment: Finance → Payments. Collections (dues aging) and Dispatch Board live in Daily Work
- Stock transfers between godowns: Inventory → Transfers`;

function errorMessage(status: number): string {
  if (status === 429) return "The AI assistant is receiving too many requests right now. Please wait a moment and try again.";
  if (status === 402) return "AI credits are exhausted. Please add credits in your Lovable workspace settings to keep using the assistant.";
  if (status === 403) return "AI access is blocked for this workspace. A workspace admin needs to enable Lovable AI or raise the credit limit.";
  if (status === 401) return "The AI assistant is not configured correctly. Please contact your administrator.";
  return "The AI assistant is temporarily unavailable. Please try again in a moment.";
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: errorMessage(401) }, 500);

    // User-scoped client: every fact is read with the user's own permissions.
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub;

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";
    const store_id = typeof body.store_id === "string" ? body.store_id : "";
    if (!message || !store_id) return json({ error: "message and store_id are required" }, 400);

    const { data: hasAccess } = await userClient.rpc("user_has_store_access", { _store_id: store_id });
    if (!hasAccess) return json({ error: "No access to this store" }, 403);

    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: storeRow } = await service.from("stores").select("name").eq("id", store_id).single();
    const storeName = storeRow?.name || "this store";

    let convId: string | null = typeof body.conversation_id === "string" ? body.conversation_id : null;
    if (convId) {
      const { data: own } = await service.from("ai_conversations").select("id").eq("id", convId).eq("user_id", userId).maybeSingle();
      if (!own) convId = null;
    }
    if (!convId) {
      const { data: conv, error } = await service.from("ai_conversations")
        .insert({ user_id: userId, store_id, title: message.substring(0, 80) }).select("id").single();
      if (error) throw error;
      convId = conv.id;
    }

    const { data: history } = await service.from("ai_messages").select("role, content")
      .eq("conversation_id", convId).order("created_at", { ascending: false }).limit(20);
    const priorMessages = (history || []).reverse().map((m: any) => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: String(m.content || ""),
    }));

    const { error: saveUserErr } = await service.from("ai_messages").insert({ conversation_id: convId, role: "user", content: message });
    if (saveUserErr) console.error("save user message failed:", saveUserErr);

    const evidence: Array<{ tool: string; label: string; args?: unknown; result?: unknown; error?: string }> = [];
    const run = <A,>(name: string, fn: (a: A) => Promise<unknown>) => async (args: A) => {
      try {
        const result = await fn(args);
        evidence.push({ tool: name, label: FACT_LABELS[name], args, result });
        return result;
      } catch (e: any) {
        const msg = String(e?.message || e);
        console.error(`${name} failed:`, msg);
        evidence.push({ tool: name, label: FACT_LABELS[name], args, error: msg });
        return { error: `Could not read this data: ${msg}` };
      }
    };
    const empty = z.object({});

    const tools = {
      get_receivables: tool({ description: "Total money customers owe this store, aging buckets and top debtors.", inputSchema: empty, execute: run("get_receivables", () => getReceivables(userClient, store_id)) }),
      get_sales_summary: tool({
        description: "Sales for an inclusive date range: orders, revenue, collected, still due, deliveries, top items and customers.",
        inputSchema: z.object({ from_date: z.string().describe("YYYY-MM-DD"), to_date: z.string().describe("YYYY-MM-DD") }),
        execute: run("get_sales_summary", ({ from_date, to_date }: { from_date: string; to_date: string }) => {
          if (!isDate(from_date) || !isDate(to_date)) throw new Error("Dates must be YYYY-MM-DD");
          return getSalesSummary(userClient, store_id, from_date, to_date);
        }),
      }),
      get_cash_position: tool({ description: "Current bank and cash balances.", inputSchema: empty, execute: run("get_cash_position", () => getCashPosition(userClient, store_id)) }),
      get_payables: tool({ description: "Money owed to suppliers.", inputSchema: empty, execute: run("get_payables", () => getPayables(userClient, store_id)) }),
      get_stock_status: tool({ description: "Stock on hand: item counts, units, value, lowest stock.", inputSchema: empty, execute: run("get_stock_status", () => getStockStatus(userClient, store_id)) }),
      get_reorder_suggestions: tool({ description: "Reorder and dead-stock list from the factual reorder engine.", inputSchema: empty, execute: run("get_reorder_suggestions", () => getReorder(userClient, store_id)) }),
      get_deliveries: tool({ description: "Pending and overdue deliveries.", inputSchema: empty, execute: run("get_deliveries", () => getDeliveries(userClient, store_id)) }),
      get_followups: tool({ description: "Today's follow-up worklist.", inputSchema: empty, execute: run("get_followups", () => getFollowups(userClient, store_id)) }),
    };

    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: LOVABLE_API_KEY,
      headers: { "Lovable-API-Key": LOVABLE_API_KEY, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    let text = "";
    try {
      const result = streamText({
        model: provider.responses(MODEL),
        system: `${SYSTEM_PROMPT}\n\nStore: ${storeName}\nToday (IST): ${today}`,
        messages: [...priorMessages, { role: "user", content: message }],
        tools,
        stopWhen: stepCountIs(50),
        abortSignal: req.signal,
        providerOptions: {
          openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
        },
      });
      text = (await result.text).trim();
    } catch (err: any) {
      const status = Number(err?.statusCode || err?.status || err?.lastError?.statusCode || 503);
      console.error("AI call failed:", status, err?.message, err?.responseBody);
      return json({ error: errorMessage(status), conversation_id: convId }, status >= 400 && status < 600 ? status : 503);
    }
    if (!text) return json({ error: "The assistant could not produce an answer. Please try again.", conversation_id: convId }, 502);

    const sources = Array.from(new Set(evidence.map((e) => e.label)));
    const { error: saveErr } = await service.from("ai_messages").insert({
      conversation_id: convId, role: "assistant", content: text,
      metadata: { store_name: storeName, as_of: new Date().toISOString(), sources, evidence },
    });
    if (saveErr) console.error("save assistant message failed:", saveErr);

    return json({ response: text, conversation_id: convId, agents_consulted: sources, evidence });
  } catch (e: any) {
    console.error("erp-assistant error:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
