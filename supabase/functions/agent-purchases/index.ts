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
    const [payablesRes, stockRes] = await Promise.all([
      supabase.rpc("ai_get_payables", { _store_id: store_id }),
      supabase.rpc("ai_get_stock_status", { _store_id: store_id }),
    ]);

    for (const [name, res] of [["payables", payablesRes], ["stock", stockRes]] as const) {
      if (res.error) {
        console.error(`purchases facts (${name}) error:`, res.error);
        throw new Error(`Failed to load ${name} facts: ${res.error.message}`);
      }
    }

    const payables = payablesRes.data;
    const stock = stockRes.data;
    const urgentItems = (stock.urgent_reorders || []) as any[];
    const suppliersOwed = ((payables.suppliers_we_owe || []) as any[]).filter((s: any) => Number(s.amount_owed) > 0);

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

    const factsSummary = `Store: ${stock.store_name}
As of: ${new Date().toISOString()} (all figures verified)
Supplier Payables (supplier ledger: purchases minus payments):
- Total Owed to Suppliers: ₹${Number(payables.total_payable_to_suppliers || 0).toLocaleString("en-IN")} across ${suppliersOwed.length} supplier(s)
${suppliersOwed.slice(0, 5).map((s: any) => `  - ${s.supplier_name}: ₹${Number(s.amount_owed).toLocaleString("en-IN")}`).join("\n") || "  Nothing owed"}
- Advances paid to suppliers: ₹${Number(payables.total_advances_paid_to_suppliers || 0).toLocaleString("en-IN")}
Factual Replenishment Requirements (reorder engine, last 365 days of real sales):
- Urgent Items Requiring Reorder: ${urgentItems.length} items
- Estimated Procurement Order Value: ₹${Math.round(suggestedProcurementValue).toLocaleString("en-IN")}
- Top Suppliers Requiring Purchase Orders: ${supplierBreakdown || "No immediate supplier orders required"}
Top urgent items:
${urgentItems.slice(0, 5).map((r: any) => `  - ${r.item_name}: ${r.current_stock} in stock${Number(r.open_demand) > 0 ? `, ${r.open_demand} reserved` : ""}, suggested ${r.suggested_qty} pcs (~₹${Math.round(Number(r.suggested_order_cost) || 0).toLocaleString("en-IN")}, supplier: ${r.supplier_name || "Unassigned"})`).join("\n") || "  None"}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = question
      ? `You are the Purchases Agent for a furniture ERP. Answer the user's specific purchasing/supplier question using ONLY the provided verified facts. Always state the store name. Quote only factual amounts and allocations. Do not invent sales velocities. Use the Rupee symbol (₹).`
      : `You are the Purchases Agent for a furniture ERP. Write a highly professional 2-3 sentence executive briefing analyzing supplier payables and imminent replenishment requirements. Quote ONLY the factual numbers provided below. Use the Rupee symbol (₹).`;

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
      facts: { payables, replenishment: stock },
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
