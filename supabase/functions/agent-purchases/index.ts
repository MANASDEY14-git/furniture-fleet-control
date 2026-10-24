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
    const [payablesRes, stockRes] = await Promise.all([
      supabase.rpc("ai_get_payables", { _store_id: store_id }),
      supabase.rpc("ai_get_stock_status", { _store_id: store_id }),
    ]);

    if (payablesRes.error) {
      console.error("ai_get_payables error:", payablesRes.error);
      throw new Error(`Failed to load supplier payables: ${payablesRes.error.message}`);
    }
    if (stockRes.error) {
      console.error("ai_get_stock_status error:", stockRes.error);
      throw new Error(`Failed to load replenishment data: ${stockRes.error.message}`);
    }

    const payablesFacts = payablesRes.data;
    const stockFacts = stockRes.data;
    const urgentItems = stockFacts.urgent_reorders || [];

    const suggestedProcurementValue = urgentItems.reduce(
      (sum: number, r: any) => sum + (Number(r.suggested_order_cost) || 0),
      0
    );

    // Group suppliers needing orders
    const suppliersNeedingOrders = new Map<string, number>();
    urgentItems.forEach((r: any) => {
      const sName = r.supplier_name || "Unassigned";
      suppliersNeedingOrders.set(sName, (suppliersNeedingOrders.get(sName) || 0) + (Number(r.suggested_order_cost) || 0));
    });

    const supplierBreakdown = Array.from(suppliersNeedingOrders.entries())
      .slice(0, 3)
      .map(([sName, val]) => `${sName}: ₹${Math.round(val).toLocaleString("en-IN")}`)
      .join(", ");

    const factsSummary = `Store: ${payablesFacts.store_name}
As of: ${payablesFacts.as_of}
Supplier Liabilities & Payables:
- Total Amount Owed to Suppliers: ₹${Number(payablesFacts.total_payable_to_suppliers || 0).toLocaleString("en-IN")} across ${payablesFacts.suppliers_with_dues_count} suppliers
- Total Supplier Advances: ₹${Number(payablesFacts.total_advances_paid_to_suppliers || 0).toLocaleString("en-IN")} across ${payablesFacts.suppliers_with_advance_count} suppliers
- Net Payables Balance: ₹${Number(payablesFacts.net_balance || 0).toLocaleString("en-IN")}
Top Suppliers Owed Money:
${(payablesFacts.suppliers_we_owe || []).slice(0, 5).map((s: any) => `  - ${s.supplier_name}: ₹${Number(s.amount_owed).toLocaleString("en-IN")} (purchases ₹${Number(s.total_purchases).toLocaleString("en-IN")}, paid ₹${Number(s.total_payments).toLocaleString("en-IN")})`).join("\n") || "  None"}
Factual Replenishment Requirements:
- Urgent Items Requiring Reorder: ${urgentItems.length} items
- Estimated Procurement Order Value: ₹${Math.round(suggestedProcurementValue).toLocaleString("en-IN")}
- Top Suppliers Requiring Purchase Orders: ${supplierBreakdown || "No immediate supplier orders required"}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = question
      ? `You are the Purchases Agent for a furniture ERP. Answer the user's specific purchasing/supplier question using ONLY the provided verified facts. Strictly state the store name. Quote only factual amounts and allocations. Do not invent sales velocities. Use Rupee symbol (₹).`
      : `You are the Purchases Agent for a furniture ERP. Write a highly professional 2-3 sentence executive briefing analyzing supplier payables, lead times, and imminent replenishment requirements. Quote ONLY the factual numbers provided below. Use Rupee symbol (₹).`;

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
      console.error("AI gateway error in agent-purchases:", aiRes.status, errText);
      throw new Error(`AI Gateway error (${aiRes.status}): ${errText}`);
    }

    const aiData = await aiRes.json();
    const outputText = aiData.choices?.[0]?.message?.content;
    if (!outputText) {
      throw new Error("AI service returned an empty response");
    }

    return new Response(JSON.stringify({
      output: outputText,
      facts: { payables: payablesFacts, replenishment: stockFacts }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("agent-purchases error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
