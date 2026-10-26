import { createClient } from "npm:@supabase/supabase-js@2";
import { authorizeAgentRequest, corsHeaders, denied } from "../_shared/agentAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { store_id, question } = await req.json().catch(() => ({ store_id: null, question: null }));
    if (!store_id) {
      return new Response(JSON.stringify({ error: "store_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = await authorizeAgentRequest(req, store_id);
    if (!auth.ok) return denied(auth);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Shared business facts RPCs (field names match the database functions).
    const [cashRes, duesRes, payablesRes] = await Promise.all([
      supabase.rpc("ai_get_cash_position", { _store_id: store_id }),
      supabase.rpc("ai_get_receivables", { _store_id: store_id }),
      supabase.rpc("ai_get_payables", { _store_id: store_id }),
    ]);

    for (const [name, res] of [["cash", cashRes], ["receivables", duesRes], ["payables", payablesRes]] as const) {
      if (res.error) {
        console.error(`finance facts (${name}) error:`, res.error);
        throw new Error(`Failed to load ${name} facts: ${res.error.message}`);
      }
    }

    const dues = duesRes.data;
    const cash = cashRes.data;
    const payables = payablesRes.data;
    const accounts = (cash.accounts || []) as any[];

    const factsSummary = `Store: ${dues.store_name}
As of: ${new Date().toISOString()} (all figures verified)
Cash & Bank Position (active accounts in the Bank Book):
- Total Balance: ₹${Number(cash.total_cash_and_bank || 0).toLocaleString("en-IN")} across ${accounts.length} account(s)
${accounts.map((a: any) => `  - ${a.account_name} (${a.account_type}): ₹${Number(a.current_balance).toLocaleString("en-IN")}`).join("\n") || "  No bank or cash accounts registered"}
Customer Receivables (orders only, excluding cancelled orders and quotes):
- Total Due from Customers: ₹${Number(dues.total_due || 0).toLocaleString("en-IN")} across ${dues.total_customers_with_dues} customers (${dues.total_open_orders} open orders)
- Aging: 0-30d ₹${Number(dues.aging_buckets?.bucket_0_30 || 0).toLocaleString("en-IN")}, 31-60d ₹${Number(dues.aging_buckets?.bucket_31_60 || 0).toLocaleString("en-IN")}, 61-90d ₹${Number(dues.aging_buckets?.bucket_61_90 || 0).toLocaleString("en-IN")}, >90d ₹${Number(dues.aging_buckets?.bucket_90_plus || 0).toLocaleString("en-IN")}
- Top debtors: ${(dues.customers || []).slice(0, 5).map((c: any) => `${c.customer_name} ₹${Number(c.outstanding).toLocaleString("en-IN")}`).join(", ") || "None"}
Supplier Payables (supplier ledger: purchases minus payments):
- Total Owed to Suppliers: ₹${Number(payables.total_payable_to_suppliers || 0).toLocaleString("en-IN")}
${((payables.suppliers_we_owe || []) as any[]).slice(0, 5).map((s: any) => `  - ${s.supplier_name}: ₹${Number(s.amount_owed).toLocaleString("en-IN")}`).join("\n") || "  None"}
- Advances paid to suppliers: ₹${Number(payables.total_advances_paid_to_suppliers || 0).toLocaleString("en-IN")}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = question
      ? `You are the Finance Agent for a furniture ERP. Answer the user's specific financial question using ONLY the provided verified facts. If a fact is missing (e.g. no bank accounts registered), say so plainly. Always state the store name and period. Quotes and cancelled orders NEVER count towards dues. Every number must match the facts. Use the Rupee symbol (₹).`
      : `You are the Finance Agent for a furniture ERP. Write a highly professional 2-3 sentence executive briefing analyzing cash position, customer collections due (with aging), and supplier payables. Quote verified facts only. Use the Rupee symbol (₹).`;

    const userPrompt = question
      ? `User Question: "${question}"\n\nVerified Facts:\n${factsSummary}`
      : `Verified Facts:\n${factsSummary}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error in agent-finance:", aiRes.status, errText);
      throw new Error(`AI Gateway error (${aiRes.status}): ${errText}`);
    }

    const aiData = await aiRes.json();
    const outputText = aiData.choices?.[0]?.message?.content;
    if (!outputText) {
      throw new Error("AI service returned an empty response");
    }

    return new Response(JSON.stringify({
      output: outputText,
      facts: { cash, receivables: dues, payables },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("agent-finance error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
