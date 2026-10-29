// TEMPORARY test harness — runs the agent/assistant matrix with service-role
// internal calls and returns raw outputs for accuracy checking. DELETE AFTER USE.
import { corsHeaders } from "../_shared/agentAuth.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface Spec {
  target: string;
  label: string;
  store_id: string;
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const specs: Spec[] = Array.isArray(body.tests) ? body.tests : [];
    if (specs.length === 0) return json({ error: "tests array required" }, 400);

    const base = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const runOne = async (spec: Spec) => {
      const started = Date.now();
      try {
        const payload: Record<string, unknown> = { store_id: spec.store_id };
        if (spec.message) payload.message = spec.message;
        const res = await fetch(`${base}/functions/v1/${spec.target}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        return {
          label: spec.label,
          target: spec.target,
          status: res.status,
          ms: Date.now() - started,
          data,
        };
      } catch (e: any) {
        return { label: spec.label, target: spec.target, status: 0, ms: Date.now() - started, error: String(e?.message || e) };
      }
    };

    // limited concurrency of 4 to be gentle on the AI gateway
    const results: Awaited<ReturnType<typeof runOne>>[] = [];
    for (let i = 0; i < specs.length; i += 4) {
      const chunk = specs.slice(i, i + 4);
      results.push(...(await Promise.all(chunk.map(runOne))));
    }
    return json({ results });
  } catch (e: any) {
    console.error("tmp-agent-test error:", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
