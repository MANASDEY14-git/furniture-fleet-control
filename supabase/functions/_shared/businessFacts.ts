// Single source of business facts for every AI agent.
// All figures come from database functions that match the app's own pages
// (Collections, Dispatch Board, Reorder, Bank Book, Supplier Ledger).
// Quotes and cancelled orders never count towards sales or dues.

// deno-lint-ignore no-explicit-any
type Client = any;

const r2 = (n: unknown) => Math.round(Number(n || 0) * 100) / 100;

export async function getReceivables(sb: Client, storeId: string) {
  const { data, error } = await sb.rpc("get_receivables_aging", { _store_id: storeId });
  if (error) throw new Error(`receivables: ${error.message}`);
  const rows = (data || []) as any[];
  const sum = (k: string) => r2(rows.reduce((s, r) => s + Number(r[k] || 0), 0));
  return {
    scope: "All open orders (quotes and cancelled orders excluded), as of today",
    total_due_from_customers: sum("outstanding"),
    customers_with_dues: rows.length,
    unpaid_orders: rows.reduce((s, r) => s + Number(r.open_orders || 0), 0),
    age_buckets: { "0_30_days": sum("bucket_0_30"), "31_60_days": sum("bucket_31_60"), "61_90_days": sum("bucket_61_90"), "over_90_days": sum("bucket_90_plus") },
    top_customers: rows.slice(0, 10).map((r) => ({
      customer: r.customer_name, phone: r.customer_phone, outstanding: r2(r.outstanding),
      open_orders: r.open_orders, oldest_unpaid_days: r.oldest_age_days, credit_limit: r2(r.credit_limit),
      last_note: r.last_note,
    })),
  };
}

export async function getSalesSummary(sb: Client, storeId: string, from: string, to: string) {
  const { data, error } = await sb.rpc("ai_get_sales_summary", { _store_id: storeId, _from: from, _to: to });
  if (error) throw new Error(`sales: ${error.message}`);
  return { scope: "Orders dated in the range; quotes and cancelled orders excluded", ...data };
}

export async function getCashPosition(sb: Client, storeId: string) {
  const { data, error } = await sb.rpc("ai_get_cash_position", { _store_id: storeId });
  if (error) throw new Error(`cash: ${error.message}`);
  return { scope: "Current balances of active bank/cash accounts in the Bank Book", ...data };
}

export async function getPayables(sb: Client, storeId: string) {
  const { data, error } = await sb.rpc("ai_get_payables", { _store_id: storeId });
  if (error) throw new Error(`payables: ${error.message}`);
  const d = data as any;
  return {
    scope: "Supplier ledger balances (purchases minus payments)",
    total_owed_to_suppliers: d.total_payable_to_suppliers,
    total_advances_paid_to_suppliers: d.total_advances_paid_to_suppliers,
    net_balance: d.net_balance,
    suppliers_with_dues_count: d.suppliers_with_dues_count,
    suppliers: (d.suppliers_we_owe || []).slice(0, 15),
  };
}

export async function getStockStatus(sb: Client, storeId: string) {
  const { data, error } = await sb
    .from("items")
    .select("name, brand, quantity_available, cost_price, selling_price, is_discontinued")
    .eq("store_id", storeId)
    .limit(5000);
  if (error) throw new Error(`stock: ${error.message}`);
  const items = ((data || []) as any[]).filter((i) => !i.is_discontinued);
  const inStock = items.filter((i) => Number(i.quantity_available) > 0);
  return {
    scope: "Current on-hand stock of active items",
    active_items: items.length,
    items_in_stock: inStock.length,
    items_out_of_stock: items.length - inStock.length,
    total_units: inStock.reduce((s, i) => s + Number(i.quantity_available), 0),
    stock_value_at_cost: r2(inStock.reduce((s, i) => s + Number(i.quantity_available) * Number(i.cost_price || 0), 0)),
    stock_value_at_selling_price: r2(inStock.reduce((s, i) => s + Number(i.quantity_available) * Number(i.selling_price || 0), 0)),
    lowest_stock_items: inStock.sort((a, b) => a.quantity_available - b.quantity_available).slice(0, 10)
      .map((i) => ({ item: i.name, brand: i.brand, units: i.quantity_available })),
  };
}

export async function getReorder(sb: Client, storeId: string) {
  const { data, error } = await sb.rpc("get_reorder_intelligence", { _store_id: storeId, _window_days: 365, _horizon_days: 30 });
  if (error) throw new Error(`reorder: ${error.message}`);
  const rows = (data || []) as any[];
  const by = (d: string) => rows.filter((r) => String(r.decision || "").toLowerCase().includes(d));
  const pick = (r: any) => ({
    item: r.item_name, decision: r.decision, confidence: r.confidence, current_stock: r.current_stock,
    open_demand: r.open_demand, units_sold_365d: r.units_sold_365d, orders_365d: r.orders_count_365d,
    last_sale_date: r.last_sale_date, suggested_qty: r.suggested_qty, supplier: r.supplier_name, evidence: r.evidence_sentence,
  });
  const reorder = by("reorder");
  const dead = by("dead");
  return {
    scope: "Reorder engine, last 365 days of real sales for this store",
    reorder_count: reorder.length,
    reorder: reorder.slice(0, 12).map(pick),
    dead_stock_count: dead.length,
    dead_stock: dead.slice(0, 8).map(pick),
  };
}

export async function getDeliveries(sb: Client, storeId: string) {
  const { data, error } = await sb.rpc("get_dispatch_board", { _store_id: storeId });
  if (error) throw new Error(`deliveries: ${error.message}`);
  const rows = (data || []) as any[];
  const buckets: Record<string, number> = {};
  rows.forEach((r) => { buckets[r.bucket] = (buckets[r.bucket] || 0) + 1; });
  return {
    scope: "Undelivered, non-cancelled orders on the Dispatch Board",
    pending_deliveries: rows.length,
    by_bucket: buckets,
    overdue: rows.filter((r) => Number(r.days_overdue) > 0).sort((a, b) => b.days_overdue - a.days_overdue).slice(0, 12)
      .map((r) => ({ order: r.order_number, customer: r.customer_name, delivery_date: r.delivery_date, days_overdue: r.days_overdue, balance_due: r2(r.balance_due) })),
  };
}

export async function getFollowups(sb: Client, storeId: string) {
  const { data, error } = await sb.rpc("get_followup_worklist", { _store_id: storeId });
  if (error) throw new Error(`followups: ${error.message}`);
  const rows = ((data || []) as any[]).filter((r) => !r.snoozed);
  return {
    scope: "Today's Follow-ups worklist (snoozed items hidden)",
    open_followups: rows.length,
    top: rows.slice(0, 12).map((r) => ({ order: r.order_number, customer: r.customer_name, kind: r.kind, balance_due: r2(r.balance_due), age_days: r.age_days, last_note: r.last_note })),
  };
}

export const FACT_LABELS: Record<string, string> = {
  get_receivables: "Customer dues (Collections)",
  get_sales_summary: "Sales summary",
  get_cash_position: "Cash & bank (Bank Book)",
  get_payables: "Supplier payables",
  get_stock_status: "Stock on hand",
  get_reorder_suggestions: "Reorder engine",
  get_deliveries: "Dispatch Board",
  get_followups: "Today's Follow-ups",
};
