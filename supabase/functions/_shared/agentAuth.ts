import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export type AuthResult =
  | { ok: true; internal: boolean; userId: string | null }
  | { ok: false; status: number; error: string };

/**
 * Authorizes an agent request.
 * - Service-role bearer token => internal call (cron / orchestrator -> specialist).
 * - Otherwise a valid user JWT is required, and when `storeId` is provided the
 *   user must have access to that store (public.user_has_store_access).
 */
export async function authorizeAgentRequest(
  req: Request,
  storeId?: string | null,
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { ok: false, status: 401, error: "Missing Authorization header" };
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (token === serviceKey) {
    return { ok: true, internal: true, userId: null };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, error: "Invalid or expired session" };
  }

  if (storeId) {
    const { data: hasAccess, error: accessErr } = await userClient.rpc(
      "user_has_store_access",
      { _store_id: storeId },
    );
    if (accessErr) {
      console.error("user_has_store_access failed:", accessErr);
      return { ok: false, status: 403, error: "Unable to verify store access" };
    }
    if (!hasAccess) {
      return { ok: false, status: 403, error: "Forbidden: no access to this store" };
    }
  }

  return { ok: true, internal: false, userId: userData.user.id };
}

export function denied(result: Extract<AuthResult, { ok: false }>) {
  return new Response(JSON.stringify({ error: result.error }), {
    status: result.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
