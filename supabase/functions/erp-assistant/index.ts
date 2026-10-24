import { createClient } from "npm:@supabase/supabase-js@2";
import { streamText, tool } from "npm:ai@4.1.45";
import { createOpenAI } from "npm:@ai-sdk/openai@1.1.9";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an accurate, truth-bound AI assistant for an ERP furniture manufacturing and retail system.

## STRICT HONESTY & FACT-CHECKING RULES:
1. Every number or financial metric you quote MUST come directly from a tool you fetched in this session. NEVER estimate, guess, extrapolate, or invent figures.
2. ALWAYS state the store name and the exact period/scope in your reply (e.g., "BIJOY FURNISHERS, all open orders as of today", or "BIJOY FURNISHERS, sales for October 2026").
3. If a question asks for information you have not fetched, USE THE MATCHING TOOL to fetch the facts first.
4. If a fact cannot be fetched (e.g. permission denied or no data found), say so plainly and directly instead of guessing.
5. Quotes and cancelled orders NEVER count towards sales or dues. The database tools automatically exclude them.
6. Format all currency in Indian Rupees with commas (e.g. ₹1,50,000).

## TOOL USAGE GUIDE:
- For questions about outstanding dues, receivables, who owes money, customer balances, or aging buckets (0-30d, 31-60d, 61-90d, >90d) -> use \`get_receivables\`.
- For questions about sales revenue, order counts, delivered vs pending orders, top products, top customers, or comparing this month vs last month or a specific date range -> use \`get_sales_summary\`.
- For questions about bank balance, ledger cash, bank accounts -> use \`get_cash_position\`.
- For questions about supplier dues, how much we owe vendors/suppliers, or supplier advances -> use \`get_payables\`.
- For questions about stock levels, low stock, out of stock, stock valuation, dead stock (>180d idle), or urgent reorder recommendations -> use \`get_stock_status\`.
- For questions about delivery schedules, late/overdue deliveries, upcoming dispatches -> use \`get_deliveries\`.
- For questions about follow-up tasks, collection calls, overdue actions -> use \`get_followups\`.
- If an executive department briefing or deeper specialized narrative is helpful, you can consult \`consult_sales_agent\`, \`consult_finance_agent\`, \`consult_inventory_agent\`, or \`consult_purchases_agent\`.

## App Navigation Reference:
- New Order: Sales -> New Order button -> select customer & items -> Create Order
- New Quote: Sales -> New Quote -> save as Draft, Sent, Accepted -> convert to Order
- Add Item: Inventory -> Add Item -> enter name, cost, selling price, stock
- Record Purchase: Purchases -> New Purchase -> select supplier & items
- Record Payment: Payments -> Record Payment -> link order/supplier
- Collections: Collections page (receivables aging & follow-up log)
- Dispatch Board: Dispatch page (calendar & delivery tracking)`;

function gatewayErrorMessage(status: number, body: string): string {
  if (status === 429) return "The AI assistant is receiving too many requests right now. Please wait a moment and try again.";
  if (status === 402) return "AI credits are exhausted. Please add credits in your Lovable workspace settings to keep using the assistant.";
  if (status === 403) return "AI access is blocked for this workspace. A workspace admin needs to enable Lovable AI or raise the credit limit.";
  if (status === 401) return "The AI assistant is not configured correctly (missing or invalid API key). Please contact your administrator.";
  if (status === 400) return "The AI assistant could not process this request. Please try rephrasing your question.";
  try {
    const parsed = JSON.parse(body);
    if (parsed?.error?.message) return `AI service error: ${parsed.error.message}`;
    if (parsed?.message) return `AI service error: ${parsed.message}`;
  } catch { /* ignore */ }
  return "The AI assistant is temporarily unavailable. Please try again in a moment.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user with their token
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { message, conversation_id, store_id } = await req.json().catch(() => ({}));

    if (!message || !store_id) {
      return new Response(JSON.stringify({ error: "message and store_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user store access
    const { data: hasAccess, error: accessErr } = await userClient.rpc("user_has_store_access", {
      _store_id: store_id,
    });

    if (accessErr || !hasAccess) {
      return new Response(JSON.stringify({ error: "Forbidden: No access to this store" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for DB operations and specialist coordination
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Get store details
    const { data: storeRow } = await serviceClient
      .from("stores")
      .select("id, name")
      .eq("id", store_id)
      .single();
    const storeName = storeRow?.name || "Store";

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const { data: conv, error: convErr } = await serviceClient
        .from("ai_conversations")
        .insert({ user_id: userId, store_id, title: message.substring(0, 80) })
        .select("id")
        .single();

      if (convErr) throw convErr;
      convId = conv.id;
    }

    // Save user message
    await serviceClient.from("ai_messages").insert({
      conversation_id: convId,
      role: "user",
      content: message,
    });

    // Load recent history (last 10 messages)
    const { data: history } = await serviceClient
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(10);

    const formattedHistory = (history || [])
      .reverse()
      .slice(0, -1) // exclude current message since we supply it as prompt
      .map((m: any) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));

    // Record tool invocations and results for "Based on" inspection
    const executedToolResults: Array<{ tool: string; args: any; result: any }> = [];
    const agentsConsulted: string[] = [];

    // Helper to call department specialists
    const callSpecialistAgent = async (agentName: string, questionText: string) => {
      agentsConsulted.push(agentName);
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/${agentName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ store_id, question: questionText }),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Specialist ${agentName} HTTP error: ${res.status} - ${errText}`);
        }
        const data = await res.json();
        return data.output || "Analysis unavailable.";
      } catch (err: any) {
        console.error(`Error invoking ${agentName}:`, err);
        return `Specialist ${agentName} was unable to report: ${err.message}`;
      }
    };

    // Initialize OpenAI client for Lovable AI Gateway
    const openai = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: LOVABLE_API_KEY,
    });

    // Define AI SDK tools that wrap the verified SECURITY DEFINER RPCs
    const tools = {
      get_receivables: tool({
        description:
          "Fetches verified customer receivables and dues for the store: total amount due, customer count, open unpaid order count, aging buckets (0-30d, 31-60d, 61-90d, >90d), and per-customer dues. Excludes quotes and cancelled orders.",
        parameters: z.object({}),
        execute: async () => {
          const { data, error } = await serviceClient.rpc("ai_get_receivables", { _store_id: store_id });
          if (error) {
            console.error("ai_get_receivables failed:", error);
            throw new Error(`Database error fetching receivables: ${error.message}`);
          }
          executedToolResults.push({ tool: "get_receivables", args: {}, result: data });
          return data;
        },
      }),

      get_sales_summary: tool({
        description:
          "Fetches verified sales summary: total revenue, order count, delivered vs pending deliveries, excluded cancelled orders, top products sold, top customers, and month-to-month comparison (this month vs last month). Optionally accepts from_date and to_date (YYYY-MM-DD).",
        parameters: z.object({
          from_date: z.string().optional().describe("Start date in YYYY-MM-DD format (defaults to start of current month)"),
          to_date: z.string().optional().describe("End date in YYYY-MM-DD format (defaults to end of current month)"),
        }),
        execute: async ({ from_date, to_date }) => {
          const { data, error } = await serviceClient.rpc("ai_get_sales_summary", {
            _store_id: store_id,
            _from_date: from_date || null,
            _to_date: to_date || null,
          });
          if (error) {
            console.error("ai_get_sales_summary failed:", error);
            throw new Error(`Database error fetching sales: ${error.message}`);
          }
          executedToolResults.push({ tool: "get_sales_summary", args: { from_date, to_date }, result: data });
          return data;
        },
      }),

      get_cash_position: tool({
        description:
          "Fetches verified bank and cash ledger balances for all active store accounts. Returns total balance and breakdown by account.",
        parameters: z.object({}),
        execute: async () => {
          const { data, error } = await serviceClient.rpc("ai_get_cash_position", { _store_id: store_id });
          if (error) {
            console.error("ai_get_cash_position failed:", error);
            throw new Error(`Database error fetching cash position: ${error.message}`);
          }
          executedToolResults.push({ tool: "get_cash_position", args: {}, result: data });
          return data;
        },
      }),

      get_payables: tool({
        description:
          "Fetches verified supplier payables and advances: total amount owed to suppliers, total advance payments made, net balance, and breakdown per supplier with purchases vs payments.",
        parameters: z.object({}),
        execute: async () => {
          const { data, error } = await serviceClient.rpc("ai_get_payables", { _store_id: store_id });
          if (error) {
            console.error("ai_get_payables failed:", error);
            throw new Error(`Database error fetching payables: ${error.message}`);
          }
          executedToolResults.push({ tool: "get_payables", args: {}, result: data });
          return data;
        },
      }),

      get_stock_status: tool({
        description:
          "Fetches catalog items stock status, out of stock count, low stock items (<5 pcs), total inventory valuation, and factual reorder intelligence (urgent reorders, reorder soon, dead stock >180d, never sold).",
        parameters: z.object({}),
        execute: async () => {
          const { data, error } = await serviceClient.rpc("ai_get_stock_status", { _store_id: store_id });
          if (error) {
            console.error("ai_get_stock_status failed:", error);
            throw new Error(`Database error fetching stock status: ${error.message}`);
          }
          executedToolResults.push({ tool: "get_stock_status", args: {}, result: data });
          return data;
        },
      }),

      get_deliveries: tool({
        description:
          "Fetches dispatch board and delivery status: total undelivered orders, overdue late deliveries, deliveries scheduled for today, this week, and unscheduled orders.",
        parameters: z.object({}),
        execute: async () => {
          const { data, error } = await serviceClient.rpc("ai_get_deliveries", { _store_id: store_id });
          if (error) {
            console.error("ai_get_deliveries failed:", error);
            throw new Error(`Database error fetching deliveries: ${error.message}`);
          }
          executedToolResults.push({ tool: "get_deliveries", args: {}, result: data });
          return data;
        },
      }),

      get_followups: tool({
        description:
          "Fetches customer followup worklist: collections due, slipping deliveries, paid undelivered orders, cold quotes, overdue actions, priority scores, and notes.",
        parameters: z.object({}),
        execute: async () => {
          const { data, error } = await serviceClient.rpc("ai_get_followups", { _store_id: store_id });
          if (error) {
            console.error("ai_get_followups failed:", error);
            throw new Error(`Database error fetching followups: ${error.message}`);
          }
          executedToolResults.push({ tool: "get_followups", args: {}, result: data });
          return data;
        },
      }),

      consult_sales_agent: tool({
        description:
          "Consults the Sales Specialist Agent for an expert sales analysis or to answer a specialized sales query.",
        parameters: z.object({
          question: z.string().describe("The user's question or specific focus for the sales agent"),
        }),
        execute: async ({ question }) => {
          const output = await callSpecialistAgent("agent-sales", question);
          executedToolResults.push({ tool: "consult_sales_agent", args: { question }, result: output });
          return { agent: "Sales Agent", briefing: output };
        },
      }),

      consult_finance_agent: tool({
        description:
          "Consults the Finance Specialist Agent for cash flow, collections efficiency, and supplier liabilities analysis.",
        parameters: z.object({
          question: z.string().describe("The user's question or specific focus for the finance agent"),
        }),
        execute: async ({ question }) => {
          const output = await callSpecialistAgent("agent-finance", question);
          executedToolResults.push({ tool: "consult_finance_agent", args: { question }, result: output });
          return { agent: "Finance Agent", briefing: output };
        },
      }),

      consult_inventory_agent: tool({
        description:
          "Consults the Inventory Specialist Agent for stockout risk, velocity analysis, and dead capital audit.",
        parameters: z.object({
          question: z.string().describe("The user's question or specific focus for the inventory agent"),
        }),
        execute: async ({ question }) => {
          const output = await callSpecialistAgent("agent-inventory", question);
          executedToolResults.push({ tool: "consult_inventory_agent", args: { question }, result: output });
          return { agent: "Inventory Agent", briefing: output };
        },
      }),

      consult_purchases_agent: tool({
        description:
          "Consults the Purchases Specialist Agent for procurement requirements, vendor lead times, and purchase recommendations.",
        parameters: z.object({
          question: z.string().describe("The user's question or specific focus for the purchases agent"),
        }),
        execute: async ({ question }) => {
          const output = await callSpecialistAgent("agent-purchases", question);
          executedToolResults.push({ tool: "consult_purchases_agent", args: { question }, result: output });
          return { agent: "Purchases Agent", briefing: output };
        },
      }),
    };

    // Run AI SDK streamText with tools and multi-step execution
    let fullResponseText = "";
    try {
      const result = streamText({
        model: openai("google/gemini-2.5-flash"),
        system: `${SYSTEM_PROMPT}\n\nCurrent Store: ${storeName} (Store ID: ${store_id})\nToday's Date: ${new Date().toISOString().split("T")[0]}`,
        messages: [
          ...formattedHistory,
          { role: "user" as const, content: message },
        ],
        tools,
        maxSteps: 10,
      });

      for await (const chunk of result.textStream) {
        fullResponseText += chunk;
      }
    } catch (err: any) {
      console.error("streamText execution error:", err);
      const status = typeof err?.status === "number" ? err.status : 500;
      const userMessage = gatewayErrorMessage(status, String(err?.message || ""));
      return new Response(
        JSON.stringify({ error: userMessage, conversation_id: convId }),
        { status: status >= 400 && status < 600 ? status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fullResponseText.trim()) {
      fullResponseText = "I checked the requested records for " + storeName + ", but could not formulate a complete answer. Please rephrase your question.";
    }

    // Save assistant message with tool results in metadata
    await serviceClient.from("ai_messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: fullResponseText,
      metadata: {
        store_id,
        store_name: storeName,
        as_of: new Date().toISOString(),
        tool_results: executedToolResults,
        agents_consulted: Array.from(new Set(agentsConsulted)),
      },
    });

    return new Response(
      JSON.stringify({
        response: fullResponseText,
        conversation_id: convId,
        agents_consulted: Array.from(new Set(agentsConsulted)),
        metadata: {
          store_name: storeName,
          tool_results: executedToolResults,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("erp-assistant fatal error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
