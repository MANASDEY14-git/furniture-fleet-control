import { createClient } from "npm:@supabase/supabase-js@2";

import { authorizeAgentRequest, corsHeaders, denied } from "../_shared/agentAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { store_id } = await req.json().catch(() => ({ store_id: null }));
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

    // Fetch purchase records
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: purchases } = await supabase
      .from("purchases")
      .select("total_cost, date")
      .eq("store_id", store_id)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0]);

    const totalPurchasesCost = purchases?.reduce((sum, p) => sum + (p.total_cost || 0), 0) || 0;

    // Fetch factual replenishment requirements
    const { data: reorderRows } = await supabase.rpc(
      "get_reorder_intelligence",
      { _store_id: store_id, _window_days: 365 }
    );

    const urgentItems = (reorderRows || []).filter((r: any) => r.decision === "reorder_now" && r.confidence !== "low");
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

    const statsText = `Procurement & Reorder Audit:
- Purchases in Last 30 Days: ${purchases?.length || 0} purchase orders totaling ₹${totalPurchasesCost.toLocaleString("en-IN")}.
- Urgent Replenishment Pipeline: ${urgentItems.length} items with verified repeat demand requiring ₹${Math.round(suggestedProcurementValue).toLocaleString("en-IN")} in purchase orders.
- Key Suppliers to Reorder: ${supplierBreakdown || "No immediate supplier orders required"}.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are the Purchases Agent for a furniture ERP. Write a highly professional 2-3 sentence executive briefing analyzing purchasing levels, supplier lead times, and imminent replenishment requirements. Quote ONLY the factual numbers provided below (past spend, suggested purchase orders, and supplier allocations). Do not invent sales velocities."
          },
          {
            role: "user",
            content: statsText
          }
        ]
      })
    });

    const aiData = await aiRes.json();
    const outputText = aiData.choices?.[0]?.message?.content || statsText;

    return new Response(JSON.stringify({ output: outputText }), {
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
