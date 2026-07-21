import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_TIMEFRAMES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function validateInput(body: unknown): { storeId: string; timeframe: string } {
  if (typeof body !== 'object' || body === null) throw new Error('Invalid request body');
  const { storeId, timeframe = '6' } = body as Record<string, unknown>;
  if (typeof storeId !== 'string' || !UUID_REGEX.test(storeId)) throw new Error('Invalid storeId: must be a valid UUID');
  const timeframeStr = String(timeframe);
  if (!VALID_TIMEFRAMES.includes(timeframeStr)) throw new Error('Invalid timeframe: must be a number between 1 and 12');
  return { storeId, timeframe: timeframeStr };
}

// ============================================================
// STATISTICAL FORECAST ENGINE — No OpenAI dependency
// ============================================================

const WMA_WEIGHTS = [0.40, 0.25, 0.15, 0.10, 0.06, 0.04]; // most recent first

function weightedMovingAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const recent = values.slice(-6).reverse(); // most recent first
  let weightSum = 0;
  let weighted = 0;
  for (let i = 0; i < recent.length; i++) {
    const w = WMA_WEIGHTS[i] ?? WMA_WEIGHTS[WMA_WEIGHTS.length - 1];
    weighted += recent[i] * w;
    weightSum += w;
  }
  return weightSum > 0 ? weighted / weightSum : 0;
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += values[i]; sumXY += i * values[i]; sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function computeSeasonalityIndex(monthlyData: { monthNum: number; total: number }[]): Map<number, number> {
  const monthTotals = new Map<number, number[]>();
  monthlyData.forEach(d => {
    const arr = monthTotals.get(d.monthNum) || [];
    arr.push(d.total);
    monthTotals.set(d.monthNum, arr);
  });
  const overallAvg = monthlyData.reduce((s, d) => s + d.total, 0) / monthlyData.length;
  const index = new Map<number, number>();
  if (overallAvg === 0) return index;
  monthTotals.forEach((vals, m) => {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    index.set(m, avg / overallAvg);
  });
  return index;
}

function computeConfidence(monthsUsed: number, values: number[]): { confidence: string; dataQuality: string } {
  const n = values.length;
  let confidence = 'LOW';
  let dataQuality = 'POOR';

  if (n >= 6) { confidence = 'MEDIUM'; dataQuality = 'LIMITED'; }
  if (n >= 9) { confidence = 'HIGH'; dataQuality = 'GOOD'; }

  // Check variance — high variance lowers confidence
  if (n >= 3) {
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    if (cv > 0.8 && confidence === 'HIGH') confidence = 'MEDIUM';
    if (cv > 1.2) confidence = 'LOW';
  }

  return { confidence, dataQuality };
}

function getMonthLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function addMonths(year: number, month: number, offset: number): { year: number; month: number } {
  const total = (year * 12 + (month - 1)) + offset;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

function generateForecast(
  monthlyData: { month: string; total: number; year: number; monthNum: number }[],
  timeframe: number
) {
  // Current month — exclude if incomplete
  const now = new Date();
  const currentMonthLabel = getMonthLabel(now.getFullYear(), now.getMonth() + 1);
  const filtered = monthlyData.filter(d => d.month < currentMonthLabel);

  if (filtered.length === 0) {
    return {
      predictions: [],
      confidence: 'LOW',
      dataQuality: 'POOR',
      monthsUsed: 0,
      method: 'none',
      fallbackUsed: null,
    };
  }

  const values = filtered.map(d => d.total);
  const wma = weightedMovingAverage(values);
  const { slope } = linearRegression(values);
  const seasonality = filtered.length >= 12 ? computeSeasonalityIndex(filtered) : null;
  const { confidence, dataQuality } = computeConfidence(filtered.length, values);

  const lastEntry = filtered[filtered.length - 1];
  const predictions: any[] = [];

  for (let i = 1; i <= timeframe; i++) {
    const { year, month } = addMonths(lastEntry.year, lastEntry.monthNum, i);
    // Base = WMA + 50% trend correction
    let predicted = wma + slope * i * 0.5;
    // Seasonality
    if (seasonality && seasonality.has(month)) {
      predicted *= seasonality.get(month)!;
    }
    // Floor at zero
    predicted = Math.max(0, Math.round(predicted * 100) / 100);

    // Confidence score per prediction (degrades with distance)
    const distancePenalty = Math.max(0, 1 - (i - 1) * 0.08);
    const confNum = confidence === 'HIGH' ? 90 : confidence === 'MEDIUM' ? 70 : 45;
    const predConfidence = Math.round(confNum * distancePenalty);

    predictions.push({
      month: getMonthLabel(year, month),
      predicted_amount: predicted,
      confidence: predConfidence,
    });
  }

  return {
    predictions,
    confidence,
    dataQuality,
    monthsUsed: filtered.length,
    method: seasonality ? 'WMA + Trend + Seasonality' : 'WMA + Trend',
    fallbackUsed: filtered.length < 3 ? 'limited_data' : null,
  };
}

function generateDeterministicInsights(
  historical: { month: string; total: number }[],
  predictions: { month: string; predicted_amount: number }[],
  monthsUsed: number
): string[] {
  const insights: string[] = [];
  if (historical.length === 0) return ['No historical data available for analysis.'];

  const values = historical.map(h => h.total);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // Month-over-month trend
  if (values.length >= 2) {
    const last = values[values.length - 1];
    const prev = values[values.length - 2];
    if (prev > 0) {
      const change = ((last - prev) / prev) * 100;
      if (Math.abs(change) >= 5) {
        insights.push(
          change > 0
            ? `Sales grew ${change.toFixed(0)}% last month compared to the previous month.`
            : `Sales declined ${Math.abs(change).toFixed(0)}% last month compared to the previous month.`
        );
      }
    }
  }

  // Best / worst month
  if (values.length >= 3) {
    const maxIdx = values.indexOf(Math.max(...values));
    const minIdx = values.indexOf(Math.min(...values));
    insights.push(`Best performing month: ${historical[maxIdx].month} (₹${Math.round(values[maxIdx]).toLocaleString()})`);
    if (minIdx !== maxIdx) {
      insights.push(`Lowest month: ${historical[minIdx].month} (₹${Math.round(values[minIdx]).toLocaleString()})`);
    }
  }

  // Prediction trend
  if (predictions.length >= 2) {
    const predTotal = predictions.reduce((s, p) => s + p.predicted_amount, 0);
    const predAvg = predTotal / predictions.length;
    if (avg > 0) {
      const diff = ((predAvg - avg) / avg) * 100;
      if (diff > 5) insights.push(`Forecast indicates ${diff.toFixed(0)}% growth trend over the next ${predictions.length} months.`);
      else if (diff < -5) insights.push(`Forecast suggests a ${Math.abs(diff).toFixed(0)}% decline — consider promotional strategies.`);
      else insights.push(`Sales are projected to remain stable over the forecast period.`);
    }
  }

  // Data quality note
  if (monthsUsed < 3) {
    insights.push('⚠ Limited historical data — predictions will improve as more sales are recorded.');
  }

  return insights;
}

// ============================================================
// HTTP Handler
// ============================================================

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
    const { storeId, timeframe } = validateInput(rawBody);

    const { data: hasAccess } = await authClient.rpc('user_has_store_access', { _store_id: storeId });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied to this store' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch up to 24 months of non-cancelled orders
    const { data: salesData, error } = await supabase
      .from('sales_orders')
      .select('date, total_amount, delivery_status')
      .eq('store_id', storeId)
      .neq('delivery_status', 'Cancelled')
      .gte('date', new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

    // Aggregate monthly
    const monthlyMap = new Map<string, number>();
    (salesData || []).forEach((sale: any) => {
      const month = sale.date.substring(0, 7);
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + parseFloat(sale.total_amount));
    });

    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, total]) => ({
        month,
        total,
        year: parseInt(month.split('-')[0]),
        monthNum: parseInt(month.split('-')[1]),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const forecast = generateForecast(monthlyData, parseInt(timeframe));
    const insights = generateDeterministicInsights(
      monthlyData, forecast.predictions, forecast.monthsUsed
    );

    return new Response(JSON.stringify({
      historical: monthlyData,
      predictions: forecast.predictions,
      insights,
      meta: {
        method: forecast.method,
        confidence: forecast.confidence,
        dataQuality: forecast.dataQuality,
        monthsUsed: forecast.monthsUsed,
        fallbackUsed: forecast.fallbackUsed,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sales-forecast:', error);
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
