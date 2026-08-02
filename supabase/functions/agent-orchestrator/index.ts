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
    // Determine store_id from body or default to a store
    const body = await req.json().catch(() => ({}));
    const store_id = body.store_id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let storesToBrief: string[] = [];

    if (store_id) {
      storesToBrief.push(store_id);
    } else {
      // Running database-wide cron: check all stores where briefing_enabled is true
      const { data: activeSettings } = await supabase
        .from("agent_settings")
        .select("store_id")
        .eq("briefing_enabled", true);

      if (activeSettings) {
        storesToBrief = activeSettings.map((s) => s.store_id);
      }
    }

    if (storesToBrief.length === 0) {
      return new Response(JSON.stringify({ status: "skipped", message: "No active store briefings enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const callSpecialist = async (name: string, storeId: string) => {
      const url = `${supabaseUrl}/functions/v1/${name}`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ store_id: storeId }),
        });
        if (!res.ok) {
          throw new Error(`Specialist ${name} HTTP error: ${res.status}`);
        }
        const data = await res.json();
        return data.output || "Analysis unavailable.";
      } catch (err) {
        console.error(`Error calling ${name}:`, err);
        return `Specialist ${name} failed to report.`;
      }
    };

    const results = [];

    for (const id of storesToBrief) {
      // Call all 4 specialists concurrently
      const [salesOut, inventoryOut, purchasesOut, financeOut] = await Promise.all([
        callSpecialist("agent-sales", id),
        callSpecialist("agent-inventory", id),
        callSpecialist("agent-purchases", id),
        callSpecialist("agent-finance", id),
      ]);

      // Call LLM to synthesize final executive briefing
      const synthesisPrompt = `
You are the Lead Agent Orchestrator. Synthesize the following 4 department specialist briefs into a single, cohesive, bulletproof 3-4 sentence Executive Summary. Address overall risk, revenue prospects, and cash constraints:

Sales Brief: ${salesOut}
Inventory Brief: ${inventoryOut}
Purchases Brief: ${purchasesOut}
Finance Brief: ${financeOut}

Maintain professional tone and formatting (use ₹ symbol for currency).`;

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
              content: "You are the Lead Agent Orchestrator. Synthesize specialist metrics into an executive brief. Focus on actionable insights."
            },
            {
              role: "user",
              content: synthesisPrompt
            }
          ]
        })
      });

      const aiData = await aiRes.json();
      const summaryText = aiData.choices?.[0]?.message?.content || "Daily specialist sync completed.";

      // Insert into agent_briefings
      const { error: insertErr } = await supabase.from("agent_briefings").insert({
        store_id: id,
        generated_for_date: new Date().toISOString().split("T")[0],
        summary: summaryText,
        source: "automated",
        agent_outputs: {
          sales: salesOut,
          inventory: inventoryOut,
          purchases: purchasesOut,
          finance: financeOut,
        },
      });

      if (insertErr) {
        console.error(`Failed to insert briefing for store ${id}:`, insertErr);
        continue;
      }

      // Update agent_settings
      await supabase
        .from("agent_settings")
        .update({ last_briefing_at: new Date().toISOString() })
        .eq("store_id", id);

      results.push({ store_id: id, status: "success" });
    }

    return new Response(JSON.stringify({ status: "completed", results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("agent-orchestrator error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
