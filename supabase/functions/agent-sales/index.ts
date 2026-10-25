import { createClient } from "npm:@supabase/supabase-js@2";
import { authorizeAgentRequest, corsHeaders, denied } from "../_shared/agentAuth.ts";

// IST calendar helpers: all sales periods follow the store's local calendar.
const istDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

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

    // Shared business facts. Quotes and cancelled orders are excluded by the RPCs.
    const today = istDate(); // YYYY-MM-DD
    const [y, m] = today.split("-").map(Number);
    const thisMonthFrom = `${y}-${String(m).padStart(2, "0")}-01`;
    const prevMonth = new Date(Date.UTC(y, m - 2, 1));
    const lastMonthFrom = prevMonth.toISOString().slice(0, 10);
    const lastMonthTo = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10);
    const thisYearFrom = `${y}-01-01`;

    const [curMonthRes, prevMonthRes, yearRes, duesRes] = await Promise.all([
      supabase.rpc("ai_get_sales_summary", { _store_id: store_id, _from: thisMonthFrom, _to: today }),
      supabase.rpc("ai_get_sales_summary", { _store_id: store_id, _from: lastMonthFrom, _to: lastMonthTo }),
      supabase.rpc("ai_get_sales_summary", { _store_id: store_id, _from: thisYearFrom, _to: today }),
      supabase.rpc("ai_get_receivables", { _store_id: store_id }),
    ]);

    for (const [name, res] of [["this month", curMonthRes], ["last month", prevMonthRes], ["year", yearRes], ["receivables", duesRes]] as const) {
      if (res.error) {
        console.error(`sales facts (${name}) error:`, res.error);
        throw new Error(`Failed to load sales facts: ${res.error.message}`);
      }
    }

    const dues = duesRes.data;
    const monthLine = (p: any, label: string) => {
      if (!p) return "";
      return `${label} (${p.from} to ${p.to}):
- Revenue: ₹${Number(p.revenue || 0).toLocaleString("en-IN")} across ${Number(p.orders || 0)} orders
- Collected: ₹${Number(p.collected || 0).toLocaleString("en-IN")}, Still due on these orders: ₹${Number(p.still_due || 0).toLocaleString("en-IN")}
- Delivered: ${Number(p.delivered_orders || 0)}, Awaiting delivery: ${Number(p.undelivered_orders || 0)}, Cancelled orders excluded: ${Number(p.cancelled_orders_excluded || 0)}`;
    };

    const factsSummary = `Store: ${dues.store_name}
As of: ${new Date().toISOString()} (all figures verified)
${monthLine(curMonthRes.data, "This month")}
${monthLine(prevMonthRes.data, "Last month")}
This year (${thisYearFrom} to ${today}):
- Revenue: ₹${Number(yearRes.data.revenue || 0).toLocaleString("en-IN")} across ${Number(yearRes.data.orders || 0)} orders
Top sellers this month:
${(curMonthRes.data.top_items || []).slice(0, 5).map((i: any) => `  - ${i.item_name}: ${Number(i.units || 0)} units, ₹${Number(i.value || 0).toLocaleString("en-IN")}`).join("\n") || "  None yet"}
Outstanding customer dues (orders only; quotes and cancelled orders excluded):
- Total Due: ₹${Number(dues.total_due || 0).toLocaleString("en-IN")} across ${dues.total_customers_with_dues} customers (${dues.total_open_orders} open orders)
- Aging: 0-30d ₹${Number(dues.aging_buckets?.bucket_0_30 || 0).toLocaleString("en-IN")}, 31-60d ₹${Number(dues.aging_buckets?.bucket_31_60 || 0).toLocaleString("en-IN")}, 61-90d ₹${Number(dues.aging_buckets?.bucket_61_90 || 0).toLocaleString("en-IN")}, >90d ₹${Number(dues.aging_buckets?.bucket_90_plus || 0).toLocaleString("en-IN")}
Top debtors:
${(dues.customers || []).slice(0, 5).map((c: any) => `  - ${c.customer_name}: ₹${Number(c.outstanding).toLocaleString("en-IN")} (${c.open_orders} orders, oldest ${c.oldest_age_days}d)`).join("\n") || "  None"}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = question
      ? `You are the Sales Agent for a furniture ERP. Answer the user's specific question using ONLY the provided verified business facts. If the question needs a period you cannot compute from the facts, say exactly that instead of guessing. Always state the store name and period. Every figure must match the facts exactly. Never guess or estimate. Use the Rupee symbol (₹).`
      : `You are the Sales Agent for a furniture ERP. Write a highly professional 2-3 sentence executive briefing on this month's sales versus last month and customer receivables (total dues and aging). Quote verified facts only. Use the Rupee symbol (₹).`;

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
      console.error("AI gateway error in agent-sales:", aiRes.status, errText);
      throw new Error(`AI Gateway error (${aiRes.status}): ${errText}`);
    }

    const aiData = await aiRes.json();
    const outputText = aiData.choices?.[0]?.message?.content;
    if (!outputText) {
      throw new Error("AI service returned an empty response");
    }

    return new Response(JSON.stringify({
      output: outputText,
      facts: { this_month: curMonthRes.data, last_month: prevMonthRes.data, year_to_date: yearRes.data, receivables: dues },
    }), {
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
