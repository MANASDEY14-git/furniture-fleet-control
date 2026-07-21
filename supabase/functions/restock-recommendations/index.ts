import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LEAD_TIME_DAYS = 7;

// Furniture-aware idle detection keywords
const WOOD_KEYWORDS = ['wood', 'bed', 'wardrobe', 'solid', 'teak', 'sheesham', 'mango', 'oak', 'walnut', 'dressing', 'almirah', 'cabinet', 'table', 'desk', 'cot'];
const UPHOLSTERY_KEYWORDS = ['sofa', 'fabric', 'mattress', 'cushion', 'upholstery', 'leather', 'recliner', 'diwan'];

function validateInput(body: unknown): { storeId: string } {
  if (typeof body !== 'object' || body === null) throw new Error('Invalid request body');
  const { storeId } = body as Record<string, unknown>;
  if (typeof storeId !== 'string' || !UUID_REGEX.test(storeId)) throw new Error('Invalid storeId: must be a valid UUID');
  return { storeId };
}

function getItemCategory(name: string): 'wood' | 'upholstery' | 'default' {
  const lower = name.toLowerCase();
  if (UPHOLSTERY_KEYWORDS.some(k => lower.includes(k))) return 'upholstery';
  if (WOOD_KEYWORDS.some(k => lower.includes(k))) return 'wood';
  return 'default';
}

function getIdleThresholdDays(category: 'wood' | 'upholstery' | 'default'): number {
  switch (category) {
    case 'wood': return 120;
    case 'upholstery': return 45;
    default: return 60;
  }
}

function getIdleStatus(daysSinceLastSale: number, daysOfStock: number, category: 'wood' | 'upholstery' | 'default'): string {
  const threshold = getIdleThresholdDays(category);
  if (daysSinceLastSale > threshold * 2 && daysOfStock > threshold * 2) return 'CRITICAL_IDLE';
  if (daysSinceLastSale > threshold && daysOfStock > threshold) return 'IDLE';
  if (daysSinceLastSale > threshold * 0.5) return 'SLOW';
  return 'OK';
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

    // Get items with category info
    const { data: items } = await supabase
      .from('items')
      .select('id, name, quantity_available, cost_price, selling_price, category_id')
      .eq('store_id', storeId);

    // Get sales data for last 180 days (non-cancelled)
    const cutoff180 = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: salesData } = await supabase
      .from('sales_order_items')
      .select('item_id, quantity, created_at, sales_orders!inner(date, store_id, delivery_status)')
      .eq('sales_orders.store_id', storeId)
      .neq('sales_orders.delivery_status', 'Cancelled')
      .gte('sales_orders.date', cutoff180);

    // Build sales velocity per item
    const salesByItem = new Map<string, { totalSold: number; lastSaleDate: string }>();
    (salesData || []).forEach((sale: any) => {
      const existing = salesByItem.get(sale.item_id) || { totalSold: 0, lastSaleDate: '' };
      existing.totalSold += sale.quantity;
      const saleDate = sale.sales_orders?.date || '';
      if (saleDate > existing.lastSaleDate) existing.lastSaleDate = saleDate;
      salesByItem.set(sale.item_id, existing);
    });

    const now = Date.now();
    const recommendations = (items || []).map((item: any) => {
      const sales = salesByItem.get(item.id) || { totalSold: 0, lastSaleDate: '' };
      const dailyVelocity = sales.totalSold / 180;
      const daysOfStock = dailyVelocity > 0 ? item.quantity_available / dailyVelocity : 9999;
      const daysSinceLastSale = sales.lastSaleDate
        ? Math.floor((now - new Date(sales.lastSaleDate).getTime()) / (1000 * 60 * 60 * 24))
        : 9999;

      const itemCategory = getItemCategory(item.name);
      const leadTime = DEFAULT_LEAD_TIME_DAYS;

      // Determine priority based on demand + lead time
      let priority: string;
      let action: string;
      let recommendedQuantity = 0;

      if (item.quantity_available === 0 && dailyVelocity > 0) {
        priority = 'CRITICAL';
        action = 'restock_immediately';
        recommendedQuantity = Math.ceil(dailyVelocity * 30);
      } else if (daysOfStock < leadTime) {
        priority = 'CRITICAL';
        action = 'restock_immediately';
        recommendedQuantity = Math.ceil(dailyVelocity * 30);
      } else if (daysOfStock < leadTime * 2) {
        priority = 'HIGH';
        action = 'restock_soon';
        recommendedQuantity = Math.ceil(dailyVelocity * 21);
      } else if (daysOfStock < leadTime * 3) {
        priority = 'MEDIUM';
        action = 'plan_restock';
        recommendedQuantity = Math.ceil(dailyVelocity * 14);
      } else if (daysOfStock > leadTime * 5 && dailyVelocity > 0) {
        priority = 'OVERSTOCK';
        action = 'reduce_orders';
        recommendedQuantity = 0;
      } else {
        priority = 'LOW';
        action = 'monitor';
        recommendedQuantity = 0;
      }

      // Use correct cost based on costing method (items don't have costing_method, use cost_price)
      const unitCost = item.cost_price || 0;
      const profitMargin = item.selling_price - unitCost;
      const profitPercentage = item.selling_price > 0 ? (profitMargin / item.selling_price) * 100 : 0;

      const idleStatus = getIdleStatus(daysSinceLastSale, daysOfStock, itemCategory);

      return {
        item_id: item.id,
        item_name: item.name,
        current_stock: item.quantity_available,
        daily_velocity: Math.round(dailyVelocity * 100) / 100,
        days_until_stockout: Math.min(Math.round(daysOfStock), 9999),
        days_since_last_sale: Math.min(daysSinceLastSale, 9999),
        priority,
        action,
        recommended_quantity: recommendedQuantity,
        estimated_cost: Math.round(recommendedQuantity * unitCost * 100) / 100,
        profit_margin: Math.round(profitMargin * 100) / 100,
        profit_percentage: Math.round(profitPercentage * 100) / 100,
        idle_status: idleStatus,
        item_category: itemCategory,
        reason: generateReason(priority, daysOfStock, dailyVelocity, idleStatus, daysSinceLastSale),
      };
    });

    // Sort: CRITICAL > HIGH > OVERSTOCK > MEDIUM > LOW, then by days_until_stockout
    const priorityOrder: Record<string, number> = { 'CRITICAL': 0, 'HIGH': 1, 'OVERSTOCK': 2, 'MEDIUM': 3, 'LOW': 4 };
    recommendations.sort((a: any, b: any) => {
      const pa = priorityOrder[a.priority] ?? 5;
      const pb = priorityOrder[b.priority] ?? 5;
      if (pa !== pb) return pa - pb;
      return a.days_until_stockout - b.days_until_stockout;
    });

    return new Response(JSON.stringify({
      recommendations,
      summary: {
        total_items: items?.length || 0,
        critical_items: recommendations.filter((r: any) => r.priority === 'CRITICAL').length,
        high_priority: recommendations.filter((r: any) => r.priority === 'HIGH').length,
        overstock_items: recommendations.filter((r: any) => r.priority === 'OVERSTOCK').length,
        idle_items: recommendations.filter((r: any) => r.idle_status === 'IDLE' || r.idle_status === 'CRITICAL_IDLE').length,
      },
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

function generateReason(priority: string, daysOfStock: number, dailyVelocity: number, idleStatus: string, daysSinceLastSale: number): string {
  if (idleStatus === 'CRITICAL_IDLE') {
    return `No sales in ${daysSinceLastSale} days — consider clearance or relocation`;
  }
  if (idleStatus === 'IDLE') {
    return `Idle inventory — no sales in ${daysSinceLastSale} days`;
  }
  if (priority === 'CRITICAL') {
    return daysOfStock <= 0
      ? 'Out of stock with active demand — restock immediately'
      : `Only ${Math.round(daysOfStock)} days of stock remaining at current sales rate`;
  }
  if (priority === 'HIGH') {
    return `Low stock — ${Math.round(daysOfStock)} days remaining, approaching lead time`;
  }
  if (priority === 'OVERSTOCK') {
    return `Overstocked — ${Math.round(daysOfStock)} days of supply at current rate`;
  }
  if (priority === 'MEDIUM') {
    return `Stock getting low — plan restock within ${Math.round(daysOfStock)} days`;
  }
  if (dailyVelocity === 0) {
    return 'No recent sales activity — monitor demand';
  }
  return `Adequate stock for ${Math.round(daysOfStock)} days`;
}
