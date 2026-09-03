# Make the reorder recommendation engine factual

## Why the current engine is weak

Verified against your live data:

- 560 active items across stores, but only **248 items sold anything in the last 12 months**, and only **83 items sold in 2 or more separate orders**. Demand is intermittent (lumpy), not a smooth daily rate.
- Today both engines (`get_reorder_intelligence` RPC and the `restock-recommendations` edge function) divide total units by the window and call it "velocity". With 5 pcs in a year that produces a fake `0.09/week` number and a meaningless "weeks of cover".
- Purchases: 74 rows, every row linked to an item, 10 suppliers — but only **11 items have been purchased more than once**, so per-item lead time cannot be inferred yet. Supplier-level cadence is the only defensible signal.
- Every item has a category (14 categories) and a supplier, so category-level pooling is available and reliable.

Result: recommendations read like guesses because the math assumes steady demand that does not exist in furniture retail.

## What the new engine will produce

For every item, one row with a decision plus the raw evidence behind it — no derived number without its inputs:

- **Demand facts**: units sold and order count in 30 / 90 / 365 days, first-sale date, last-sale date, days since last sale, number of distinct months with a sale, average units per selling order.
- **Demand class** (instead of fake velocity):
  - `no_history` — never sold
  - `one_off` — sold in exactly 1 order ever
  - `intermittent` — sold in 2 or more orders but fewer than 4 selling months in a year
  - `steady` — 4 or more selling months in the last year
- **Demand estimate with confidence**: steady items use their own monthly rate; intermittent items use expected units per selling month plus the observed gap between sales (Croston-style); one-off and no-history items fall back to the **category rate** (category units sold per month divided by the number of items in that category that sold). Every row carries `confidence` = high / medium / low and `basis` = "own history" or "category benchmark".
- **Replenishment facts**: current stock, open (undelivered) demand already sold, stock value at cost, supplier name, supplier's observed median gap between purchase invoices (fallback 21 days when a supplier has fewer than 2 purchases), and the date of the last purchase for that item.
- **Decision** with an explicit rule:
  - `reorder_now` — stock, minus what is already sold and undelivered, cannot cover expected demand through the supplier's lead time
  - `reorder_soon` — cover runs out within roughly 2 lead-time windows
  - `sell_through` — no reorder; stock covers well past the horizon
  - `dead_stock` — stock on hand, no sale in 180+ days, cash locked amount shown
  - `never_sold` — stock bought but never sold, with days held
- **Suggested quantity** derived from lead-time demand plus a small safety buffer, rounded to the item's observed typical order size, and never below zero; shown together with the cost of that order.
- **Evidence sentence** built from real numbers, e.g. "3 orders in 12 months (5 pcs), last sold 47 days ago, category averages 1.2 pcs/month, supplier reorders every ~24 days — 4 in stock covers the window, no order needed." No claim appears that is not backed by a column in the same row.
- **Suppressed noise**: items with `no_history` and zero stock are excluded entirely; low-confidence rows are grouped and clearly labelled rather than mixed in with actionable ones.

## UI changes (Purchasing Hub → "Reorder & Dead Stock")

- Replace the velocity column with **Demand class + confidence badge**.
- Show the evidence columns side by side: sold 30d / 90d / 365d, orders, last sale, days since sale, stock, open demand, cover through lead time.
- Buckets become: Reorder now, Reorder soon, Sell through, Dead stock, Never sold, plus a collapsed "Not enough history" group.
- Each row expands to a facts panel listing every input used, so a recommendation can be audited in one click.
- Keep existing CSV export and add the new evidence columns to it.

## AI usage

The inventory and purchasing agents (and the assistant) will call the same enriched RPC and be instructed to quote only the returned fields — no invented velocities, no reordering advice for `low` confidence rows beyond "not enough history, decide manually". This makes the AI answers reproducible against the table the user sees.

## Technical details

1. New migration replacing `public.get_reorder_intelligence` (drop first, per the RPC maintenance rule) with `get_reorder_intelligence(_store_id uuid, _window_days int default 365, _horizon_days int default null)` returning the fact + decision columns above. Same auth guard (`auth.uid()` + `user_has_store_access`), `STABLE SECURITY DEFINER`, `search_path = public`. Aggregates only non-cancelled `document_type='order'` rows, plus an `open_demand` CTE from undelivered order items, a `category_rate` CTE, and a `supplier_cadence` CTE from `purchases` (median interval per supplier).
2. `src/hooks/useReorderIntelligence.ts`: extend `ReorderRow` with the new fields; keep the 60s staleTime and the store guard.
3. `src/pages/ReorderIntelligence.tsx`: new buckets, evidence columns, expandable facts panel, confidence badges, updated export mapping. Existing Apple-minimal card/table styling preserved.
4. `supabase/functions/restock-recommendations/index.ts`: stop recomputing its own velocity and keyword-based categories; call the RPC with the service client and shape the response, so the AI, the advisor card, and the page can never disagree.
5. `src/components/ai/RestockingAdvisor.tsx` and the inventory/purchases agent prompts: bind to the RPC-backed fields and cite evidence.

## Out of scope

BOM-driven material reordering, supplier price negotiation logic, and automatic purchase order creation.
