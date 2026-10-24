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
    const [salesRes, duesRes] = await Promise.all([
      supabase.rpc("ai_get_sales_summary", { _store_id: store_id }),
      supabase.rpc("ai_get_receivables", { _store_id: store_id }),
    ]);

    if (salesRes.error) {
      console.error("ai_get_sales_summary error:", salesRes.error);
      throw new Error(`Failed to load sales facts: ${salesRes.error.message}`);
    }
    if (duesRes.error) {
      console.error("ai_get_receivables error:", duesRes.error);
      throw new Error(`Failed to load receivables facts: ${duesRes.error.message}`);
    }

    const salesFacts = salesRes.data;
    const duesFacts = duesRes.data;

    const factsSummary = `Store: ${salesFacts.store_name}
As of: ${salesFacts.as_of}
This Month Sales (${salesFacts.comparisons?.this_month?.from} to ${salesFacts.comparisons?.this_month?.to}):
- Total Revenue: ₹${Number(salesFacts.comparisons?.this_month?.revenue || 0).toLocaleString("en-IN")} across ${salesFacts.comparisons?.this_month?.orders_count || 0} active orders
- Last Month Revenue: ₹${Number(salesFacts.comparisons?.this_month ? salesFacts.comparisons.last_month?.revenue : 0).toLocaleString("en-IN")} across ${salesFacts.comparisons?.last_month?.orders_count || 0} active orders
Selected Period (${salesFacts.period?.from_date} to ${salesFacts.period?.to_date}):
- Total Revenue: ₹${Number(salesFacts.total_revenue || 0).toLocaleString("en-IN")} (${salesFacts.total_orders} orders)
- Delivered Orders: ${salesFacts.delivered_orders}, Pending Deliveries: ${salesFacts.pending_orders}
- Excluded Cancelled Orders: ${salesFacts.cancelled_orders_excluded}
Outstanding Customer Dues:
- Total Due: ₹${Number(duesFacts.total_due || 0).toLocaleString("en-IN")} across ${duesFacts.total_customers_with_dues} customers (${duesFacts.total_open_orders} open orders)
- Dues 0-30 days: ₹${Number(duesFacts.aging_buckets?.bucket_0_30 || 0).toLocaleString("en-IN")}
- Dues 31-60 days: ₹${Number(duesFacts.aging_buckets?.bucket_31_60 || 0).toLocaleString("en-IN")}
- Dues 61-90 days: ₹${Number(duesFacts.aging_buckets?.bucket_61_90 || 0).toLocaleString("en-IN")}
- Dues >90 days: ₹${Number(duesFacts.aging_buckets?.bucket_90_plus || 0).toLocaleString("en-IN")}
Top Debtors:
${(duesFacts.customers || []).slice(0, 5).map((c: any) => `  - ${c.customer_name}: ₹${Number(c.outstanding).toLocaleString("en-IN")} (${c.open_orders} orders, oldest ${c.oldest_age_days}d)`).join("\n") || "  None"}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = question
      ? `You are the Sales Agent for a furniture ERP. Answer the user's specific question using ONLY the provided verified business facts. Strictly state the store name and time period. Every figure quoted must match the facts exactly. Never guess or estimate. Use Rupee symbol (₹).`
      : `You are the Sales Agent for a furniture ERP. Write a highly professional 2-3 sentence executive briefing analyzing this month's sales status and customer receivables. Focus on conversion, pipeline, and total dues. Quote verified facts only. Use Rupee symbol (₹).`;

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
      console.error("AI gateway error in agent-sales:", aiRes.status, errText);
      throw new Error(`AI Gateway error (${aiRes.status}): ${errText}`);
    }

    const aiData = await aiRes.json();
    const outputText = aiData.choices?.[0]?.message?.content;
    if (!outputText) {
      throw new Error("AI service returned an empty response");
    }

    return new Response(JSON.stringify({ output: outputText, facts: { sales: salesFacts, receivables: duesFacts } }), {
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
