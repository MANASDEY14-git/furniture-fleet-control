import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { store_id } = await req.json();
    if (!store_id) {
      return new Response(JSON.stringify({ error: "store_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch cash flow / bank account details
    const { data: accounts } = await supabase
      .from("bank_accounts")
      .select("current_balance, account_name")
      .eq("store_id", store_id);

    const { data: salesDues } = await supabase
      .from("sales_orders")
      .select("balance_due")
      .eq("store_id", store_id)
      .gt("balance_due", 0);

    const totalCash = accounts?.reduce((sum, a) => sum + (a.current_balance || 0), 0) || 0;
    const totalDues = salesDues?.reduce((sum, d) => sum + (d.balance_due || 0), 0) || 0;

    const statsText = `Total ledger balance across bank accounts is ₹${totalCash.toLocaleString("en-IN")}. Outstanding collections due from customers totals ₹${totalDues.toLocaleString("en-IN")}.`;

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
            content: "You are the Finance Agent for a furniture ERP. Write a highly professional 2-3 sentence executive briefing analyzing this month's cash position, collections efficiency, and outstanding receivables. Use Rupee symbol (₹)."
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
    console.error("agent-finance error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
