import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeId } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get inventory with sales performance
    const { data: items } = await supabase
      .from('items')
      .select('id, name, quantity_available, cost_price, selling_price')
      .eq('store_id', storeId);

    // Get recent sales data for analysis
    const { data: recentSales } = await supabase
      .from('sales_order_items')
      .select('item_id, quantity, unit_price, sales_orders!inner(date)')
      .eq('sales_orders.store_id', storeId)
      .gte('sales_orders.date', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    // Generate sales strategies
    const strategies = await generateSalesStrategies(items, recentSales);

    return new Response(JSON.stringify({
      strategies,
      summary: {
        total_recommendations: strategies.length,
        potential_revenue_increase: strategies.reduce((sum, s) => sum + (s.estimated_impact || 0), 0),
        slow_moving_items: strategies.filter(s => s.strategy_type === 'clearance').length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sales-strategy:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateSalesStrategies(items: any[], salesData: any[]) {
  // Calculate sales velocity and performance metrics
  const itemPerformance = new Map();
  
  salesData?.forEach(sale => {
    const current = itemPerformance.get(sale.item_id) || { quantity: 0, revenue: 0 };
    itemPerformance.set(sale.item_id, {
      quantity: current.quantity + sale.quantity,
      revenue: current.revenue + (sale.quantity * sale.unit_price)
    });
  });

  const strategies = [];

  items?.forEach(item => {
    const performance = itemPerformance.get(item.id) || { quantity: 0, revenue: 0 };
    const profitMargin = item.selling_price - item.cost_price;
    const profitPercentage = (profitMargin / item.selling_price) * 100;
    
    // High inventory + low sales = clearance strategy
    if (item.quantity_available > 50 && performance.quantity < 5) {
      strategies.push({
        item_id: item.id,
        item_name: item.name,
        strategy_type: 'clearance',
        current_price: item.selling_price,
        recommended_price: item.selling_price * 0.8, // 20% discount
        discount_percentage: 20,
        reason: 'High inventory with slow movement - clearance recommended',
        estimated_impact: item.quantity_available * item.selling_price * 0.1, // Estimated additional revenue
        urgency: 'HIGH',
        action: 'Create clearance promotion'
      });
    }
    
    // High margin + high demand = premium pricing opportunity
    else if (profitPercentage > 40 && performance.quantity > 20) {
      strategies.push({
        item_id: item.id,
        item_name: item.name,
        strategy_type: 'premium_pricing',
        current_price: item.selling_price,
        recommended_price: item.selling_price * 1.1, // 10% increase
        discount_percentage: -10,
        reason: 'High demand item with good margins - price increase opportunity',
        estimated_impact: performance.quantity * item.selling_price * 0.1,
        urgency: 'MEDIUM',
        action: 'Test gradual price increase'
      });
    }
    
    // Medium inventory + good sales = bundle opportunity
    else if (item.quantity_available > 10 && performance.quantity > 10 && profitPercentage > 20) {
      strategies.push({
        item_id: item.id,
        item_name: item.name,
        strategy_type: 'bundle',
        current_price: item.selling_price,
        recommended_price: item.selling_price * 0.95, // 5% discount for bundles
        discount_percentage: 5,
        reason: 'Popular item suitable for bundle deals',
        estimated_impact: performance.quantity * item.selling_price * 0.15,
        urgency: 'LOW',
        action: 'Create product bundles'
      });
    }
    
    // Low margin items = cost optimization
    else if (profitPercentage < 15 && performance.quantity > 0) {
      strategies.push({
        item_id: item.id,
        item_name: item.name,
        strategy_type: 'cost_optimization',
        current_price: item.selling_price,
        recommended_price: item.cost_price * 1.25, // 25% markup minimum
        discount_percentage: 0,
        reason: 'Low profit margin - consider cost optimization or price adjustment',
        estimated_impact: performance.quantity * (item.cost_price * 0.1),
        urgency: 'MEDIUM',
        action: 'Review supplier costs or adjust pricing'
      });
    }
  });

  // Sort by estimated impact and urgency
  return strategies.sort((a, b) => {
    const urgencyOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    return (b.estimated_impact || 0) - (a.estimated_impact || 0);
  });
}