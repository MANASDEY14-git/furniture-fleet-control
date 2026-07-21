import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const WOOD_KEYWORDS = ['wood', 'bed', 'wardrobe', 'solid', 'teak', 'sheesham', 'mango', 'oak', 'walnut', 'dressing', 'almirah', 'cabinet', 'table', 'desk', 'cot'];
const UPHOLSTERY_KEYWORDS = ['sofa', 'fabric', 'mattress', 'cushion', 'upholstery', 'leather', 'recliner', 'diwan'];

function validateInput(body: unknown): { storeId: string } {
  if (typeof body !== 'object' || body === null) throw new Error('Invalid request body');
  const { storeId } = body as Record<string, unknown>;
  if (typeof storeId !== 'string' || !UUID_REGEX.test(storeId)) throw new Error('Invalid storeId: must be a valid UUID');
  return { storeId };
}

function getItemType(name: string): 'wood' | 'upholstery' | 'default' {
  const lower = name.toLowerCase();
  if (UPHOLSTERY_KEYWORDS.some(k => lower.includes(k))) return 'upholstery';
  if (WOOD_KEYWORDS.some(k => lower.includes(k))) return 'wood';
  return 'default';
}

function getIdleThreshold(type: string): number {
  if (type === 'wood') return 120;
  if (type === 'upholstery') return 45;
  return 60;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await authClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rawBody = await req.json();
    const { storeId } = validateInput(rawBody);

    const { data: hasAccess } = await authClient.rpc('user_has_store_access', { _store_id: storeId });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied to this store' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: items } = await supabase
      .from('items')
      .select('id, name, quantity_available, cost_price, selling_price, category_id')
      .eq('store_id', storeId);

    // 90-day sales window, exclude cancelled
    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: salesData } = await supabase
      .from('sales_order_items')
      .select('item_id, quantity, unit_price, sales_orders!inner(date, store_id, delivery_status)')
      .eq('sales_orders.store_id', storeId)
      .neq('sales_orders.delivery_status', 'Cancelled')
      .gte('sales_orders.date', cutoff90);

    // Aggregate per item
    const perfMap = new Map<string, { qty: number; revenue: number; lastDate: string }>();
    (salesData || []).forEach((sale: any) => {
      const cur = perfMap.get(sale.item_id) || { qty: 0, revenue: 0, lastDate: '' };
      cur.qty += sale.quantity;
      cur.revenue += sale.quantity * sale.unit_price;
      const d = sale.sales_orders?.date || '';
      if (d > cur.lastDate) cur.lastDate = d;
      perfMap.set(sale.item_id, cur);
    });

    const now = Date.now();
    const strategies: any[] = [];

    (items || []).forEach((item: any) => {
      const perf = perfMap.get(item.id) || { qty: 0, revenue: 0, lastDate: '' };
      const dailyVelocity = perf.qty / 90;
      const daysOfStock = dailyVelocity > 0 ? item.quantity_available / dailyVelocity : 9999;
      const daysSinceLastSale = perf.lastDate
        ? Math.floor((now - new Date(perf.lastDate).getTime()) / (1000 * 60 * 60 * 24))
        : 9999;

      const cost = item.cost_price || 0;
      const margin = item.selling_price - cost;
      const marginPct = item.selling_price > 0 ? (margin / item.selling_price) * 100 : 0;
      const forecastPerMonth = dailyVelocity * 30;

      const itemType = getItemType(item.name);
      const idleThreshold = getIdleThreshold(itemType);

      // HEAVY CLEARANCE — critically idle
      if (daysSinceLastSale > idleThreshold * 2 && daysOfStock > idleThreshold * 2) {
        strategies.push({
          item_id: item.id,
          item_name: item.name,
          strategy_type: 'clearance',
          current_price: item.selling_price,
          recommended_price: Math.round(item.selling_price * 0.7),
          discount_percentage: 30,
          reason: `Critical idle: No sales in ${daysSinceLastSale} days with ${item.quantity_available} units in stock`,
          estimated_impact: item.quantity_available * item.selling_price * 0.15,
          urgency: 'HIGH',
          action: 'Heavy clearance — consider 30% discount or relocation',
          idle_status: 'CRITICAL_IDLE',
        });
      }
      // CLEARANCE — idle items with no forecast demand
      else if (daysSinceLastSale > idleThreshold && daysOfStock > 30 && forecastPerMonth < 1) {
        strategies.push({
          item_id: item.id,
          item_name: item.name,
          strategy_type: 'clearance',
          current_price: item.selling_price,
          recommended_price: Math.round(item.selling_price * 0.8),
          discount_percentage: 20,
          reason: `No sales in ${daysSinceLastSale} days — forecast demand near zero`,
          estimated_impact: item.quantity_available * item.selling_price * 0.1,
          urgency: 'MEDIUM',
          action: 'Create clearance promotion',
          idle_status: 'IDLE',
        });
      }
      // PREMIUM PRICING — high margin, consistent demand, not idle
      else if (marginPct > 35 && perf.qty >= 3 && daysSinceLastSale < 30) {
        strategies.push({
          item_id: item.id,
          item_name: item.name,
          strategy_type: 'premium_pricing',
          current_price: item.selling_price,
          recommended_price: Math.round(item.selling_price * 1.1),
          discount_percentage: -10,
          reason: `Strong demand (${perf.qty} sold in 90 days) with ${marginPct.toFixed(0)}% margin`,
          estimated_impact: perf.qty * item.selling_price * 0.1,
          urgency: 'MEDIUM',
          action: 'Test gradual price increase',
          idle_status: 'OK',
        });
      }
      // BUNDLE — slow but not dead, same category potential
      else if (daysOfStock > 45 && perf.qty > 0 && perf.qty < 5 && marginPct > 20) {
        strategies.push({
          item_id: item.id,
          item_name: item.name,
          strategy_type: 'bundle',
          current_price: item.selling_price,
          recommended_price: Math.round(item.selling_price * 0.95),
          discount_percentage: 5,
          reason: `Slow-moving (${perf.qty} sold in 90 days) — bundle with faster items`,
          estimated_impact: perf.qty * item.selling_price * 0.15,
          urgency: 'LOW',
          action: 'Create product bundles with popular items',
          idle_status: 'SLOW',
        });
      }
      // COST OPTIMIZATION — low margin
      else if (marginPct < 15 && marginPct > 0 && perf.qty > 0) {
        strategies.push({
          item_id: item.id,
          item_name: item.name,
          strategy_type: 'cost_optimization',
          current_price: item.selling_price,
          recommended_price: Math.round(cost * 1.25),
          discount_percentage: 0,
          reason: `Low margin (${marginPct.toFixed(0)}%) — review supplier costs or increase price`,
          estimated_impact: perf.qty * cost * 0.1,
          urgency: 'MEDIUM',
          action: 'Review supplier costs or adjust pricing',
          idle_status: 'OK',
        });
      }
      // RESTOCK suggestion for items selling well but stock running low
      else if (dailyVelocity > 0 && daysOfStock < 14 && item.quantity_available > 0) {
        strategies.push({
          item_id: item.id,
          item_name: item.name,
          strategy_type: 'restock',
          current_price: item.selling_price,
          recommended_price: item.selling_price,
          discount_percentage: 0,
          reason: `Only ${Math.round(daysOfStock)} days of stock left with strong demand`,
          estimated_impact: dailyVelocity * 30 * margin,
          urgency: 'HIGH',
          action: 'Restock to avoid lost sales',
          idle_status: 'OK',
        });
      }
    });

    const urgencyOrder: Record<string, number> = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
    strategies.sort((a, b) => {
      const ua = urgencyOrder[a.urgency] ?? 3;
      const ub = urgencyOrder[b.urgency] ?? 3;
      if (ua !== ub) return ua - ub;
      return (b.estimated_impact || 0) - (a.estimated_impact || 0);
    });

    return new Response(JSON.stringify({
      strategies,
      summary: {
        total_recommendations: strategies.length,
        potential_revenue_increase: Math.round(strategies.reduce((s: number, st: any) => s + (st.estimated_impact || 0), 0)),
        slow_moving_items: strategies.filter((s: any) => s.strategy_type === 'clearance').length,
        idle_items: strategies.filter((s: any) => s.idle_status === 'IDLE' || s.idle_status === 'CRITICAL_IDLE').length,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sales-strategy:', error);
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
