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
    const statsText = `In the last 30 days, we placed ${purchases?.length || 0} purchase orders totaling ₹${totalPurchasesCost.toLocaleString("en-IN")}.`;

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
            content: "You are the Purchases Agent for a furniture ERP. Write a highly professional 2-3 sentence executive briefing analyzing this month's purchasing levels, procurement status, and supplier payments. Use Rupee symbol (₹)."
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
