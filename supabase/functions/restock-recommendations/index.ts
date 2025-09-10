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

    // Get current inventory levels
    const { data: items } = await supabase
      .from('items')
      .select('id, name, quantity_available, cost_price, selling_price, category_id')
      .eq('store_id', storeId);

    // Get sales velocity data (last 90 days)
    const { data: salesData } = await supabase
      .from('sales_order_items')
      .select('item_id, quantity, sales_orders!inner(date, store_id)')
      .eq('sales_orders.store_id', storeId)
      .gte('sales_orders.date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    // Calculate sales velocity and generate recommendations
    const recommendations = await generateRestockRecommendations(items, salesData);

    return new Response(JSON.stringify({
      recommendations,
      summary: {
        total_items: items?.length || 0,
        critical_items: recommendations.filter(r => r.priority === 'CRITICAL').length,
        high_priority: recommendations.filter(r => r.priority === 'HIGH').length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in restock-recommendations:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateRestockRecommendations(items: any[], salesData: any[]) {
  // Calculate sales velocity for each item
  const salesVelocity = new Map();
  
  salesData?.forEach(sale => {
    const current = salesVelocity.get(sale.item_id) || 0;
    salesVelocity.set(sale.item_id, current + sale.quantity);
  });

  const recommendations = items?.map(item => {
    const totalSold = salesVelocity.get(item.id) || 0;
    const dailyVelocity = totalSold / 90; // Sales per day
    const daysUntilStockout = dailyVelocity > 0 ? item.quantity_available / dailyVelocity : 999;
    
    let priority = 'LOW';
    let action = 'monitor';
    let recommendedQuantity = 0;

    if (daysUntilStockout <= 7) {
      priority = 'CRITICAL';
      action = 'restock_immediately';
      recommendedQuantity = Math.ceil(dailyVelocity * 30); // 30 days supply
    } else if (daysUntilStockout <= 14) {
      priority = 'HIGH';
      action = 'restock_soon';
      recommendedQuantity = Math.ceil(dailyVelocity * 21); // 21 days supply
    } else if (daysUntilStockout <= 30) {
      priority = 'MEDIUM';
      action = 'plan_restock';
      recommendedQuantity = Math.ceil(dailyVelocity * 14); // 14 days supply
    }

    const profitMargin = item.selling_price - item.cost_price;
    const profitPercentage = (profitMargin / item.selling_price) * 100;

    return {
      item_id: item.id,
      item_name: item.name,
      current_stock: item.quantity_available,
      daily_velocity: Math.round(dailyVelocity * 100) / 100,
      days_until_stockout: Math.round(daysUntilStockout),
      priority,
      action,
      recommended_quantity: recommendedQuantity,
      estimated_cost: recommendedQuantity * item.cost_price,
      profit_margin: profitMargin,
      profit_percentage: Math.round(profitPercentage * 100) / 100,
      reason: generateReason(daysUntilStockout, dailyVelocity, priority)
    };
  }) || [];

  // Sort by priority and days until stockout
  return recommendations.sort((a, b) => {
    const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.days_until_stockout - b.days_until_stockout;
  });
}

function generateReason(daysUntilStockout: number, dailyVelocity: number, priority: string): string {
  if (priority === 'CRITICAL') {
    return `Stock will run out in ${Math.round(daysUntilStockout)} days at current sales rate`;
  } else if (priority === 'HIGH') {
    return `Low stock level with ${Math.round(daysUntilStockout)} days remaining`;
  } else if (priority === 'MEDIUM') {
    return `Stock level getting low, plan restock within 2 weeks`;
  } else if (dailyVelocity === 0) {
    return 'No recent sales activity - monitor demand';
  } else {
    return `Adequate stock level for ${Math.round(daysUntilStockout)} days`;
  }
}