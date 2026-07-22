import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase env configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all items across stores
    const { data: items, error: fetchError } = await supabase
      .from("items")
      .select("id, store_id, quantity_available, cost_price, selling_price, stock_receive_date, created_at");

    if (fetchError) throw fetchError;

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No items found to snapshot", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const snapshots = items.map((item) => {
      const receiveDate = item.stock_receive_date || item.created_at || today;
      const diffMs = new Date(today).getTime() - new Date(receiveDate).getTime();
      const ageDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const qty = item.quantity_available || 0;
      const cost = item.cost_price || 0;
      const selling = item.selling_price || 0;
      const totalCost = qty * cost;
      const totalValue = qty * selling;

      return {
        store_id: item.store_id,
        item_id: item.id,
        snapshot_date: today,
        quantity_available: qty,
        cost_price: cost,
        selling_price: selling,
        total_cost: totalCost,
        total_value: totalValue,
        age_days_avg: ageDays,
        slow_moving_value: ageDays >= 271 && ageDays <= 365 ? totalCost : 0,
        dead_stock_value: ageDays > 365 ? totalCost : 0,
        fast_moving_value: ageDays <= 180 ? totalCost : 0,
      };
    });

    // Upsert in batches of 500
    const batchSize = 500;
    let upsertedCount = 0;
    for (let i = 0; i < snapshots.length; i += batchSize) {
      const chunk = snapshots.slice(i, i + batchSize);
      const { error: upsertError } = await supabase
        .from("inventory_snapshots")
        .upsert(chunk, { onConflict: "store_id,item_id,snapshot_date" });

      if (upsertError) throw upsertError;
      upsertedCount += chunk.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Inventory snapshot complete for ${today}`,
        upsertedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
