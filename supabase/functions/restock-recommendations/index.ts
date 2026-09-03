import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateInput(body: unknown): { storeId: string } {
  if (typeof body !== 'object' || body === null) throw new Error('Invalid request body');
  const { storeId } = body as Record<string, unknown>;
  if (typeof storeId !== 'string' || !UUID_REGEX.test(storeId)) throw new Error('Invalid storeId: must be a valid UUID');
  return { storeId };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await authClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.json();
    const { storeId } = validateInput(rawBody);

    const { data: hasAccess } = await authClient.rpc('user_has_store_access', { _store_id: storeId });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied to this store' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call factual get_reorder_intelligence RPC using service client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_reorder_intelligence', {
      _store_id: storeId,
      _window_days: 365,
    });

    if (rpcError) {
      console.error('get_reorder_intelligence RPC error:', rpcError);
      throw rpcError;
    }

    const recommendations = (rpcData || []).map((r: any) => {
      let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      let action: string;
      let idleStatus = 'OK';

      switch (r.decision) {
        case 'reorder_now':
          priority = 'CRITICAL';
          action = 'reorder_now';
          break;
        case 'reorder_soon':
          priority = 'HIGH';
          action = 'reorder_soon';
          break;
        case 'dead_stock':
          priority = 'MEDIUM';
          action = 'clear_dead_stock';
          idleStatus = 'CRITICAL_IDLE';
          break;
        case 'never_sold':
          priority = 'MEDIUM';
          action = 'promote_or_clear';
          idleStatus = 'IDLE';
          break;
        case 'sell_through':
        default:
          priority = 'LOW';
          action = 'monitor';
          break;
      }

      const profitMargin = (r.selling_price || 0) - (r.cost_price || 0);
      const profitPercentage = r.selling_price > 0 ? (profitMargin / r.selling_price) * 100 : 0;

      return {
        item_id: r.item_id,
        item_name: r.item_name,
        current_stock: r.current_stock,
        daily_velocity: Math.round(((r.estimated_monthly_demand || 0) / 30.0) * 100) / 100,
        days_until_stockout: r.cover_days !== null ? Math.min(Math.round(r.cover_days), 9999) : 9999,
        days_since_last_sale: r.days_since_last_sale !== null ? Math.min(r.days_since_last_sale, 9999) : 9999,
        priority,
        action,
        recommended_quantity: r.suggested_qty,
        estimated_cost: r.suggested_order_cost,
        profit_margin: Math.round(profitMargin * 100) / 100,
        profit_percentage: Math.round(profitPercentage * 100) / 100,
        idle_status: idleStatus,
        item_category: r.category_name || 'General',
        reason: r.evidence_sentence,
        // Enriched factual fields
        demand_class: r.demand_class,
        confidence: r.confidence,
        demand_rate_basis: r.demand_rate_basis,
        open_demand: r.open_demand,
        net_stock: r.net_stock,
        supplier_name: r.supplier_name,
        supplier_lead_days: r.supplier_lead_days,
        units_sold_30d: r.units_sold_30d,
        units_sold_90d: r.units_sold_90d,
        units_sold_365d: r.units_sold_365d,
        orders_count_365d: r.orders_count_365d,
        evidence_sentence: r.evidence_sentence,
      };
    });

    // Sort: CRITICAL > HIGH > MEDIUM > LOW, then by days_until_stockout
    const priorityOrder: Record<string, number> = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    recommendations.sort((a: any, b: any) => {
      const pa = priorityOrder[a.priority] ?? 4;
      const pb = priorityOrder[b.priority] ?? 4;
      if (pa !== pb) return pa - pb;
      return a.days_until_stockout - b.days_until_stockout;
    });

    const summary = {
      total_items: recommendations.length,
      critical_items: recommendations.filter((r: any) => r.priority === 'CRITICAL').length,
      high_priority: recommendations.filter((r: any) => r.priority === 'HIGH').length,
      overstock_items: recommendations.filter((r: any) => r.action === 'monitor').length,
      idle_items: recommendations.filter((r: any) => r.idle_status === 'IDLE' || r.idle_status === 'CRITICAL_IDLE').length,
      low_confidence_items: recommendations.filter((r: any) => r.confidence === 'low').length,
    };

    return new Response(JSON.stringify({
      recommendations,
      summary,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in restock-recommendations:', error);
    const isValidationError = error instanceof Error &&
      (error.message.includes('Invalid') || error.message.includes('must be'));
    return new Response(JSON.stringify({
      error: isValidationError ? error.message : 'An unexpected error occurred. Please try again.'
    }), {
      status: isValidationError ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
