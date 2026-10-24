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

    // Call shared business facts RPC
    const { data: stockFacts, error: stockErr } = await supabase.rpc("ai_get_stock_status", {
      _store_id: store_id,
    });

    if (stockErr) {
      console.error("ai_get_stock_status error:", stockErr);
      throw new Error(`Failed to load stock facts: ${stockErr.message}`);
    }

    const reorder = stockFacts.reorder_intelligence || {};
    const topUrgentSample = (stockFacts.urgent_reorders || [])
      .slice(0, 3)
      .map((r: any) => `${r.item_name}: ${r.current_stock} in stock (${r.open_demand > 0 ? `${r.open_demand} reserved, ` : ''}need ${r.suggested_qty} pcs, ~₹${Math.round(r.suggested_order_cost).toLocaleString("en-IN")})`)
      .join("; ");

    const factsSummary = `Store: ${stockFacts.store_name}
As of: ${stockFacts.as_of}
Inventory & Catalog Health:
- Total Active Catalog Items: ${stockFacts.catalog_items_count}
- Out of Stock Items: ${stockFacts.out_of_stock_count}
- Low Stock Items (<5 pcs): ${stockFacts.low_stock_count_under_5}
- Total Catalog Stock Valuation: ₹${Math.round(stockFacts.total_stock_value || 0).toLocaleString("en-IN")}
Factual Reorder Intelligence:
- Urgent Reorders (High/Med Confidence): ${reorder.urgent_reorders_count || 0} items (${topUrgentSample || "None"})
- Reorder Soon: ${reorder.reorder_soon_count || 0} items
- Dead Stock (>180d no sales): ${reorder.dead_stock_count || 0} items with ₹${Math.round(reorder.dead_stock_locked_value || 0).toLocaleString("en-IN")} locked
- Never Sold Stock: ${reorder.never_sold_count || 0} items with ₹${Math.round(reorder.never_sold_locked_value || 0).toLocaleString("en-IN")} locked
- Low Confidence Items (requires manual review): ${reorder.low_confidence_count || 0} items
Top Low Stock Items on Shelf:
${(stockFacts.low_stock_items || []).slice(0, 5).map((i: any) => `  - ${i.item_name}: ${i.quantity_available} pcs available (Cost: ₹${i.cost_price}, Price: ₹${i.selling_price})`).join("\n") || "  None"}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = question
      ? `You are the Inventory Agent for a furniture ERP. Answer the user's specific inventory question using ONLY the provided verified facts. Strictly state the store name. Quote only factual counts and evidence sentences. Do NOT invent smooth daily velocity rates or continuous demand numbers (furniture demand is intermittent). If items have low confidence, advise manual review. Use Rupee symbol (₹).`
      : `You are the Inventory Agent for a furniture ERP. Write a highly professional 2-3 sentence executive briefing analyzing inventory health, stockout risks, and dead capital. Quote ONLY the factual data provided below. Do NOT invent smooth daily velocity rates. If items have low confidence, advise manual review. Use Rupee symbol (₹).`;

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
      console.error("AI gateway error in agent-inventory:", aiRes.status, errText);
      throw new Error(`AI Gateway error (${aiRes.status}): ${errText}`);
    }

    const aiData = await aiRes.json();
    const outputText = aiData.choices?.[0]?.message?.content;
    if (!outputText) {
      throw new Error("AI service returned an empty response");
    }

    return new Response(JSON.stringify({ output: outputText, facts: stockFacts }), {
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
