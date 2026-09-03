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

    // Fetch factual reorder intelligence
    const { data: reorderRows, error: rpcError } = await supabase.rpc(
      "get_reorder_intelligence",
      { _store_id: store_id, _window_days: 365 }
    );

    if (rpcError) {
      console.error("agent-inventory RPC error:", rpcError);
    }

    const rows = reorderRows || [];
    const urgentItems = rows.filter((r: any) => r.decision === "reorder_now" && r.confidence !== "low");
    const reorderSoonItems = rows.filter((r: any) => r.decision === "reorder_soon");
    const deadStockItems = rows.filter((r: any) => r.decision === "dead_stock");
    const neverSoldItems = rows.filter((r: any) => r.decision === "never_sold");
    const lowConfidenceItems = rows.filter((r: any) => r.confidence === "low");

    const deadStockLocked = deadStockItems.reduce((sum: number, r: any) => sum + (Number(r.stock_value) || 0), 0);
    const neverSoldLocked = neverSoldItems.reduce((sum: number, r: any) => sum + (Number(r.stock_value) || 0), 0);

    const topUrgentSample = urgentItems.slice(0, 3).map((r: any) => 
      `${r.item_name}: ${r.current_stock} in stock (need ${r.suggested_qty} pcs, sold ${r.units_sold_365d} in 12m)`
    ).join("; ");

    const statsText = `Factual Inventory Audit:
- Active Catalog Products Tracked: ${rows.length}
- Urgent Reorders (High/Med Confidence): ${urgentItems.length} items (${topUrgentSample || "None"})
- Reorder Soon: ${reorderSoonItems.length} items
- Dead Stock (>180d idle): ${deadStockItems.length} items with ₹${Math.round(deadStockLocked).toLocaleString("en-IN")} locked
- Never Sold Stock: ${neverSoldItems.length} items with ₹${Math.round(neverSoldLocked).toLocaleString("en-IN")} locked
- Low Confidence Items (requires manual review): ${lowConfidenceItems.length} items`;

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
            content: "You are the Inventory Agent for a furniture ERP. Write a highly professional 2-3 sentence executive briefing analyzing inventory health, urgent stockout risks, and dead capital. Quote ONLY the factual data provided below. Do NOT invent smooth daily velocity rates or continuous demand numbers (furniture retail demand is intermittent). If items have low confidence, advise manual review."
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
    console.error("agent-inventory error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
