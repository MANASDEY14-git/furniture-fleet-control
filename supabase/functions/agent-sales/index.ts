import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

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

    // Fetch sales data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: sales } = await supabase
      .from("sales_orders")
      .select("total_amount, balance_due, date, delivery_status, customer_name")
      .eq("store_id", store_id)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0]);

    const status = (s: any) => String(s?.delivery_status || "").trim().toLowerCase();
    // Cancelled orders never count towards sales figures
    const activeSales = (sales || []).filter((s) => status(s) !== "cancelled");
    const cancelledCount = (sales || []).length - activeSales.length;

    const totalSales = activeSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const completedSales = activeSales.filter((s) => status(s) === "delivered").length;
    const pendingSales = activeSales.filter((s) => status(s) !== "delivered").length;

    const statsText = `In the last 30 days, we recorded ₹${totalSales.toLocaleString("en-IN")} in sales across ${activeSales.length} active orders (${cancelledCount} cancelled orders excluded). Completed deliveries: ${completedSales}, pending orders: ${pendingSales}.`;

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
            content: "You are the Sales Agent for a furniture ERP. Write a highly professional 2-3 sentence executive briefing analyzing this month's sales status. Focus on conversion and delivery pipeline. Use Rupee symbol (₹)."
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
    console.error("agent-sales error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
