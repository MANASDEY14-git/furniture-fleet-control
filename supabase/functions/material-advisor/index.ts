import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Maximum length for customerPreferences to prevent excessive data
const MAX_PREFERENCES_LENGTH = 1000;

interface CustomerPreferences {
  budget?: string;
  style?: string;
  color?: string;
  quality?: string;
  [key: string]: unknown;
}

function validateInput(body: unknown): { itemId: string; componentId: string; customerPreferences: CustomerPreferences | null } {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid request body');
  }

  const { itemId, componentId, customerPreferences } = body as Record<string, unknown>;

  // Validate itemId
  if (typeof itemId !== 'string' || !UUID_REGEX.test(itemId)) {
    throw new Error('Invalid itemId: must be a valid UUID');
  }

  // Validate componentId
  if (typeof componentId !== 'string' || !UUID_REGEX.test(componentId)) {
    throw new Error('Invalid componentId: must be a valid UUID');
  }

  // Validate customerPreferences (optional, but must be object if provided)
  let validatedPreferences: CustomerPreferences | null = null;
  if (customerPreferences !== undefined && customerPreferences !== null) {
    if (typeof customerPreferences !== 'object' || Array.isArray(customerPreferences)) {
      throw new Error('Invalid customerPreferences: must be an object');
    }
    
    // Check total size of preferences to prevent excessive data
    const prefsString = JSON.stringify(customerPreferences);
    if (prefsString.length > MAX_PREFERENCES_LENGTH) {
      throw new Error(`customerPreferences exceeds maximum length of ${MAX_PREFERENCES_LENGTH} characters`);
    }
    
    // Sanitize preferences - only allow string values, limit each value length
    validatedPreferences = {};
    for (const [key, value] of Object.entries(customerPreferences as Record<string, unknown>)) {
      if (typeof key === 'string' && key.length <= 50) {
        if (typeof value === 'string' && value.length <= 200) {
          validatedPreferences[key] = value;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          validatedPreferences[key] = value;
        }
        // Skip invalid values silently
      }
    }
  }

  return { itemId, componentId, customerPreferences: validatedPreferences };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
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

    // Parse and validate input
    const rawBody = await req.json();
    const { componentId, customerPreferences } = validateInput(rawBody);
    
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
    
    // Check if it's a validation error (return 400)
    const isValidationError = error instanceof Error && 
      (error.message.includes('Invalid') || error.message.includes('must be') || error.message.includes('exceeds'));
    
    return new Response(JSON.stringify({ 
      error: isValidationError ? error.message : 'An unexpected error occurred. Please try again.' 
    }), {
      status: isValidationError ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateMaterialRecommendations(
  componentOptions: any[],
  historicalData: any[],
  customerPreferences: CustomerPreferences | null
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
