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
    const { itemId, componentId, customerPreferences } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get BOM component options
    const { data: componentOptions } = await supabase
      .from('bom_component_options')
      .select('*, materials(*)')
      .eq('bom_component_id', componentId);

    // Get historical customization data
    const { data: historicalCustomizations } = await supabase
      .from('sales_customizations')
      .select('selected_material_id, selected_option_name, sales_orders!inner(customer_name)')
      .eq('bom_component_id', componentId);

    // Generate AI-powered recommendations
    const recommendations = await generateMaterialRecommendations(
      componentOptions,
      historicalCustomizations,
      customerPreferences
    );

    return new Response(JSON.stringify({
      recommendations,
      popular_choices: getPopularChoices(historicalCustomizations),
      component_options: componentOptions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in material-advisor:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateMaterialRecommendations(
  componentOptions: any[],
  historicalData: any[],
  customerPreferences: any
) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    return generateBasicRecommendations(componentOptions, historicalData);
  }

  const prompt = `
    Recommend the best materials for a customizable product component based on:
    
    Available Options: ${JSON.stringify(componentOptions?.map(opt => ({
      name: opt.option_name,
      material: opt.materials?.name,
      cost: opt.materials?.cost_price
    })))}
    
    Historical Customer Choices: ${JSON.stringify(historicalData?.slice(-20))}
    
    Customer Preferences: ${JSON.stringify(customerPreferences)}
    
    Provide 3-5 ranked recommendations with reasoning. Consider:
    - Popularity among customers
    - Cost-effectiveness
    - Quality and durability
    - Aesthetic appeal
    
    Return JSON format: [{"option_name": "name", "score": 85, "reason": "explanation"}]
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: 'You are a materials expert specializing in product customization. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('AI recommendation error:', error);
    return generateBasicRecommendations(componentOptions, historicalData);
  }
}

function generateBasicRecommendations(componentOptions: any[], historicalData: any[]) {
  // Fallback algorithm when AI is not available
  const popularity = new Map();
  
  historicalData?.forEach(custom => {
    const count = popularity.get(custom.selected_option_name) || 0;
    popularity.set(custom.selected_option_name, count + 1);
  });

  return componentOptions?.map(option => {
    const popularityScore = popularity.get(option.option_name) || 0;
    const costScore = option.materials?.cost_price ? 100 - (option.materials.cost_price / 100) : 50;
    
    const totalScore = (popularityScore * 40 + costScore * 30 + 30); // Base quality score
    
    return {
      option_name: option.option_name,
      score: Math.min(100, Math.round(totalScore)),
      reason: `Popular choice (${popularityScore} times selected) with balanced cost-quality ratio`
    };
  }).sort((a, b) => b.score - a.score) || [];
}

function getPopularChoices(historicalData: any[]) {
  const choices = new Map();
  
  historicalData?.forEach(custom => {
    const count = choices.get(custom.selected_option_name) || 0;
    choices.set(custom.selected_option_name, count + 1);
  });

  return Array.from(choices.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}