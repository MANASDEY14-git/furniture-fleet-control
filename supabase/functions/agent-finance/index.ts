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

    // Call shared business facts RPCs
    const [cashRes, duesRes, payablesRes] = await Promise.all([
      supabase.rpc("ai_get_cash_position", { _store_id: store_id }),
      supabase.rpc("ai_get_receivables", { _store_id: store_id }),
      supabase.rpc("ai_get_payables", { _store_id: store_id }),
    ]);

    if (cashRes.error) {
      console.error("ai_get_cash_position error:", cashRes.error);
      throw new Error(`Failed to load cash position: ${cashRes.error.message}`);
    }
    if (duesRes.error) {
      console.error("ai_get_receivables error:", duesRes.error);
      throw new Error(`Failed to load customer dues: ${duesRes.error.message}`);
    }
    if (payablesRes.error) {
      console.error("ai_get_payables error:", payablesRes.error);
      throw new Error(`Failed to load supplier payables: ${payablesRes.error.message}`);
    }

    const cashFacts = cashRes.data;
    const duesFacts = duesRes.data;
    const payablesFacts = payablesRes.data;

    const factsSummary = `Store: ${cashFacts.store_name}
As of: ${cashFacts.as_of}
Cash & Bank Position:
- Total Ledger Balance in Bank/Cash: ₹${Number(cashFacts.total_cash_and_bank || 0).toLocaleString("en-IN")} across ${cashFacts.accounts_count} accounts
${(cashFacts.accounts || []).map((a: any) => `  - ${a.account_name} (${a.bank_name || a.account_type}): ₹${Number(a.current_balance).toLocaleString("en-IN")}`).join("\n") || "  No bank accounts registered"}
Customer Receivables (Orders only, excluding cancelled and quotes):
- Total Due from Customers: ₹${Number(duesFacts.total_due || 0).toLocaleString("en-IN")} across ${duesFacts.total_customers_with_dues} customers (${duesFacts.total_open_orders} open orders)
- Dues Aging: 0-30d: ₹${Number(duesFacts.aging_buckets?.bucket_0_30 || 0).toLocaleString("en-IN")}, 31-60d: ₹${Number(duesFacts.aging_buckets?.bucket_31_60 || 0).toLocaleString("en-IN")}, 61-90d: ₹${Number(duesFacts.aging_buckets?.bucket_61_90 || 0).toLocaleString("en-IN")}, >90d: ₹${Number(duesFacts.aging_buckets?.bucket_90_plus || 0).toLocaleString("en-IN")}
Supplier Payables:
- Total Amount Owed to Suppliers: ₹${Number(payablesFacts.total_payable_to_suppliers || 0).toLocaleString("en-IN")} (${payablesFacts.suppliers_with_dues_count} suppliers)
- Total Supplier Advances Paid: ₹${Number(payablesFacts.total_advances_paid_to_suppliers || 0).toLocaleString("en-IN")}
- Net Balance: ₹${Number(payablesFacts.net_balance || 0).toLocaleString("en-IN")}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = question
      ? `You are the Finance Agent for a furniture ERP. Answer the user's specific financial question using ONLY the provided verified facts. Strictly state the store name and time period. Quotes and cancelled orders NEVER count towards dues. Every number must match the facts. Use Rupee symbol (₹).`
      : `You are the Finance Agent for a furniture ERP. Write a highly professional 2-3 sentence executive briefing analyzing cash position, customer collections due, and supplier payables. Quote verified facts only. Use Rupee symbol (₹).`;

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
          { role: "user", content: userPrompt }
        ]
      })
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
      facts: { cash: cashFacts, receivables: duesFacts, payables: payablesFacts }
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
