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
    const { storeId, timeframe = '6' } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get historical sales data
    const { data: salesData, error } = await supabase
      .from('sales_orders')
      .select('date, total_amount, store_id, sales_order_items(*)')
      .eq('store_id', storeId)
      .gte('date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

    // Process sales data for trends
    const monthlyData = processSalesData(salesData);
    
    // Generate AI predictions using OpenAI
    const predictions = await generateSalesPredictions(monthlyData, timeframe);

    return new Response(JSON.stringify({
      historical: monthlyData,
      predictions,
      insights: await generateInsights(monthlyData, predictions)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sales-forecast:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function processSalesData(salesData: any[]) {
  const monthlyTotals = new Map();
  
  salesData.forEach(sale => {
    const month = sale.date.substring(0, 7); // YYYY-MM format
    const current = monthlyTotals.get(month) || 0;
    monthlyTotals.set(month, current + parseFloat(sale.total_amount));
  });

  return Array.from(monthlyTotals.entries()).map(([month, total]) => ({
    month,
    total,
    year: parseInt(month.split('-')[0]),
    monthNum: parseInt(month.split('-')[1])
  }));
}

async function generateSalesPredictions(historicalData: any[], timeframe: string) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured');

  const prompt = `
    Based on the following historical sales data, predict sales for the next ${timeframe} months.
    Historical data: ${JSON.stringify(historicalData)}
    
    Consider:
    - Seasonal patterns
    - Growth trends
    - Market conditions
    
    Return a JSON array with predicted monthly sales amounts and confidence levels.
    Format: [{"month": "2024-01", "predicted_amount": 50000, "confidence": 85}]
  `;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: 'You are a sales forecasting expert. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
    }),
  });

  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return [];
  }
}

async function generateInsights(historical: any[], predictions: any[]) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) return [];

  const prompt = `
    Analyze this sales data and provide 3-5 key business insights:
    Historical: ${JSON.stringify(historical.slice(-12))}
    Predictions: ${JSON.stringify(predictions)}
    
    Return actionable insights as a JSON array of strings.
  `;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: 'You are a business analyst. Return only valid JSON array of insight strings.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
    }),
  });

  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return [];
  }
}