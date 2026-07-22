# Inventory Intelligence Dashboard — Implementation Plan

## Summary

Build a premium executive dashboard at `/inventory-intelligence` that answers three questions immediately: **What drives the business?** (hero products), **What needs replenishment?** (fast-movers), and **Where is cash stuck?** (cash locked). The page will use the existing `items` + `sales_orders` + `sales_order_items` tables, add lightweight schema extensions (`brand`, `warehouse`, `inventory_snapshots`), and expose the heavy analytics through a dedicated Supabase function so the UI stays fast.

## What the project already has vs. what we need

- **Already has:** React 18 + Vite + shadcn/ui + Tailwind + Recharts + Supabase RPC pattern (`search_items_enhanced`). `items` has `quantity_available`, `cost_price`, `selling_price`, `stock_receive_date`, `category_id`, `supplier_id`, `store_id`.
- **Missing:** No `brand` or `warehouse` columns; no `last_sold_date` on items; no historical inventory snapshots; no Excel/PDF export; no dedicated inventory-intelligence aggregation layer.

## Decision snapshot (from user)

- Add `brand` and `warehouse` columns to `items`.
- Create a daily `inventory_snapshots` table for historical trends.
- Route name: `/inventory-intelligence`.

## Database schema (migrations)

### 1. Extend `items`

Add `brand text` and `warehouse text` (nullable), plus update the existing `items` RLS policy so managers/admins can update them.

### 2. New `inventory_snapshots` table

```text
id uuid pk default gen_random_uuid()
store_id uuid references stores
item_id uuid references items
snapshot_date date not null default current_date
quantity_available numeric not null default 0
cost_price numeric not null default 0
selling_price numeric not null default 0
total_cost numeric not null default 0        -- quantity * cost_price
total_value numeric not null default 0       -- quantity * selling_price
age_days_avg numeric default 0
slow_moving_value numeric default 0
dead_stock_value numeric default 0
fast_moving_value numeric default 0
created_at timestamptz default now()

unique (store_id, item_id, snapshot_date)
```

Access: `service_role` all; `authenticated` select only. RLS restricts reads to stores the user has access to via `user_store_access`.

### 3. New `inventory_intelligence` view / RPC

Create a function `get_inventory_intelligence(args)` that returns one row per item with the following computed columns:

- `inventory_value` = `quantity_available * cost_price`
- `inventory_cost` = same (cost basis)
- `revenue_period` = sum of `sales_order_items.total_price` in selected date range, joined to non-cancelled sales orders
- `units_sold_period` = sum of `sales_order_items.quantity` in selected date range
- `gross_profit_period` = `revenue_period - (units_sold_period * cost_price)`
- `last_sold_date` = max(sales_orders.date) from delivered/accepted orders
- `days_since_last_sale` = today - last_sold_date
- `avg_days_between_sales` = computed over all sales for the item
- `stock_age_days` = today - stock_receive_date
- `stock_age_bucket` = `Healthy` (0-180), `Watch` (181-270), `Slow Moving` (271-365), `Dead Stock` (366-540), `Critical` (>540)
- `monthly_velocity` = units_sold_period / months in selected period
- `days_to_sell` = quantity_available / (daily velocity)
- `stock_coverage_days` = days_to_sell
- `reorder_status` = `Reorder Soon` (<14 days), `Healthy` (14-60), `Overstocked` (>60)
- `hero_score` = weighted composite percentile (revenue, gross profit, units, frequency, stock availability, margin) normalized to 0-100
- `cash_locked` = `quantity_available * cost_price` where stock_age_days > 180
- `recommended_action` = `Clearance Sale` (>365), `Discount` (271-365), `Bundle` (181-270), `Increase Marketing` (Watch with sales), `Keep Normal` (else)

Filters accepted by the function: `store_id`, `date_from`, `date_to`, `category_id`, `supplier_id`, `brand`, `warehouse`, `age_bucket`, `price_min`, `price_max`. Nullable filters are ignored.

### 4. Snapshot automation edge function + cron

- Create edge function `inventory-snapshot` that, for each store, upserts today's `inventory_snapshots` row per item. Runs internally with `service_role`.
- Schedule a `pg_cron` job to call it every day at 01:00 store-local time (or UTC; store timezone is not yet stored, so we will use UTC and document it).

## Frontend architecture

### New page

`src/pages/InventoryIntelligence.tsx` — wrapper with the filter bar, tab sections, and export controls.

### New components

| Component | Responsibility |
|---|---|
| `InventoryIntelligenceHeader` | Title, last-updated timestamp, export buttons (Excel / PDF) |
| `InventoryKpiCards` | Total Inventory Value, Total Inventory Cost, Average Stock Age, Cash Locked (>180), Dead Stock (>365), Active SKUs, Inventory Turnover, Oldest Product |
| `BusinessInsights` | AI-style cards with generated summaries (e.g., "₹X lakh sitting >365 days", "Actual hero product is Y") |
| `InventoryAgeAnalysis` | Age-bucket table + stacked bar chart + doughnut chart |
| `HeroProductAnalytics` | Top 10 ranked table with hero score, revenue, profit, units, avg selling time |
| `FastMovingProducts` | Reorder recommendations table with badges |
| `CashLockedInventory` | Cash-locked table with recommended actions, highlighted >365 days |
| `CategoryIntelligence` | Category comparison table + horizontal bar chart |
| `InventoryFilters` | Date range, category, supplier, brand, warehouse, purchase month/year, age bucket, price range — desktop inline, mobile sheet |
| `ProductDetailDrawer` | Side drawer (desktop) / bottom sheet (mobile) with stock history, purchase history, sales history, timeline, profit, recommendations |

### New hook

`src/hooks/useInventoryIntelligence.ts` — React Query wrapper around `get_inventory_intelligence`. Supports all filters and debounces expensive refetches (e.g., 300 ms after price-range changes). StaleTime 60s per project memory.

### Export

- Install `xlsx` (Excel) and `jspdf` + `html2canvas` (PDF).
- Add `src/utils/inventoryExportUtils.ts` to format current filtered data into workbook / PDF.
- Excel: one sheet per section (KPIs, Age Analysis, Hero Products, Fast Movers, Cash Locked, Category Intelligence).
- PDF: generate a printable summary of the currently visible tables. For the full dashboard render, provide a print-optimized CSS media query as a fallback.

### Routing & navigation

- Add `<Route path="/inventory-intelligence" element={<InventoryIntelligence />} />` in `src/App.tsx`.
- Add an entry to `AppSidebar.tsx` under Operations (the page is an intelligence layer, not a data-entry screen, so it fits there alongside Inventory).

## Page sections & UX details

### 1. KPI cards (top row)

- 4 cards on mobile, 4 on tablet, 8 on large desktop (two rows of 4).
- Each card has icon, value, label, and trend arrow compared to the most recent `inventory_snapshots` entry for the same store/period.
- Trend is computed as `(current - snapshot) / snapshot * 100` when a snapshot exists; fallback to directional comparison with prior period.
- Oldest Product card shows the product name and age in days.

### 2. Business Insights (AI style)

- 4-5 insight cards in a horizontal scroll on mobile, 2x2 grid on desktop.
- Insights are derived from the data, not LLM calls, so they are deterministic and fast:
  - Dead stock value > 365 days.
  - Top hero product name and score.
  - Fastest-moving product and projected stockout date.
  - Working capital freed by clearing top 10 slow-moving products.
  - Categories with the highest cash lock.

### 3. Inventory Age Analysis

- Default threshold starts at 180 days.
- Table columns: bucket, product count, quantity, value, % of total.
- Stacked bar chart: value by bucket.
- Doughnut chart: % of total inventory value by bucket.

### 4. Hero Product Analytics

- Top 10 table with rank, product image (fallback to placeholder), name, category, hero score, revenue, gross profit, units sold, average selling time.
- Hero score is the composite function described above.
- Clicking a row opens `ProductDetailDrawer`.

### 5. Fast-Moving Products

- Table: product, current stock, avg monthly sales, days to sell, stock coverage, suggested reorder date, badge.
- Badges: red `Reorder Soon`, green `Healthy`, amber `Overstocked`.
- Suggested reorder date = today + days_to_sell.

### 6. Cash Locked in Inventory

- Table: product, category, supplier, purchase date (stock_receive_date), days in inventory, quantity, cost price, selling price, inventory value, last sold date, cash locked, recommended action.
- Rows > 365 days highlighted with a red left border / background tint.
- Action chips are clickable but read-only (they do not trigger mutations; they are decision guidance).

### 7. Category Intelligence

- Table + horizontal bar chart.
- Columns: category, avg stock age, inventory value, revenue, gross profit, fast movers count, slow movers count.
- Fast mover = monthly_velocity > store median; slow mover = stock_age_days > 180 and monthly_velocity < store median.

### 8. Filters

- Date range: from/to date pickers.
- Category: select from `categories`.
- Supplier: select from `suppliers`.
- Brand: select distinct from `items.brand` (async populated after migration).
- Warehouse: select distinct from `items.warehouse`.
- Purchase month/year: derived from `stock_receive_date`.
- Inventory age: multi-select checkboxes for the 5 buckets.
- Price range: min/max numeric inputs (cost price).
- Clear all / Apply buttons.
- On desktop, filters apply instantly; on mobile, filters are staged inside a sheet.

### 9. Product Detail Drawer

- Header: product image, name, category, badges.
- Tabs: Stock History, Purchase History, Sales History, Movement Timeline, Profit, AI Recommendations.
- Content is fetched from existing tables (`stock_adjustments`, `purchases`, `sales_orders`, `sales_order_items`, `material_stock_movements`) filtered by `item_id`.
- AI Recommendations is a rule-based panel based on the same intelligence metrics.

## Implementation phases

### Phase 1 — Schema & backend

1. Migration: add `brand` and `warehouse` to `items`.
2. Migration: create `inventory_snapshots` table + RLS + grants.
3. Migration: create `get_inventory_intelligence` function.
4. Edge function `inventory-snapshot` + cron schedule.
5. Backfill: run `inventory-snapshot` once to seed today's data.
6. Regenerate Supabase types.

### Phase 2 — Frontend foundation

1. Add `xlsx`, `jspdf`, `html2canvas` dependencies.
2. Create `useInventoryIntelligence` hook.
3. Create `InventoryFilters` and `ProductDetailDrawer`.
4. Create shared `InventoryCard`, `InventoryBadge`, `InventorySkeleton` primitives.

### Phase 3 — Dashboard sections

1. `InventoryIntelligenceHeader` + export utils.
2. `InventoryKpiCards`.
3. `BusinessInsights`.
4. `InventoryAgeAnalysis`.
5. `HeroProductAnalytics`.
6. `FastMovingProducts`.
7. `CashLockedInventory`.
8. `CategoryIntelligence`.

### Phase 4 — Integration & polish

1. Add route and sidebar entry.
2. Wire filters to all sections.
3. Add loading skeletons and empty states.
4. Add print/PDF styles.
5. Run typecheck and build.
6. Verify the snapshot function and one manual dashboard load.

## Files to create / modify

**New files:**

- `src/pages/InventoryIntelligence.tsx`
- `src/hooks/useInventoryIntelligence.ts`
- `src/components/inventory-intelligence/InventoryIntelligenceHeader.tsx`
- `src/components/inventory-intelligence/InventoryKpiCards.tsx`
- `src/components/inventory-intelligence/BusinessInsights.tsx`
- `src/components/inventory-intelligence/InventoryAgeAnalysis.tsx`
- `src/components/inventory-intelligence/HeroProductAnalytics.tsx`
- `src/components/inventory-intelligence/FastMovingProducts.tsx`
- `src/components/inventory-intelligence/CashLockedInventory.tsx`
- `src/components/inventory-intelligence/CategoryIntelligence.tsx`
- `src/components/inventory-intelligence/InventoryFilters.tsx`
- `src/components/inventory-intelligence/ProductDetailDrawer.tsx`
- `src/utils/inventoryExportUtils.ts`
- `supabase/functions/inventory-snapshot/index.ts`

**Modified files:**

- `src/App.tsx` (add route)
- `src/components/AppSidebar.tsx` (add navigation)
- `src/components/ItemBasicInfoForm.tsx` (add brand/warehouse inputs)
- `src/components/ItemForm.tsx` (add brand/warehouse inputs)
- `src/components/ItemComponentDetailsTab.tsx` (if applicable)
- `src/hooks/useItems.ts` (include brand/warehouse in types if needed)
- `src/integrations/supabase/types.ts` (regenerated by migration tool)
- `package.json` (new deps)
- `src/index.css` (optional print styles)

## Notes & assumptions

- **Data model:** The dashboard is read-only from the UI; it does not change the existing stock or sales triggers. The new `brand` and `warehouse` fields are optional metadata and do not affect accounting.
- **Trends:** The KPI trend arrows compare the current live values to the latest `inventory_snapshots` row. If the snapshot cron is not yet enabled, the arrows show a flat state.
- **Performance:** `get_inventory_intelligence` does the heavy joining in Postgres. The UI will paginate the result (50 rows per page) for large tables and let the user filter down before exporting.
- **Export:** Excel export uses the full filtered result (up to 1000 rows), not just the current page. PDF export renders the visible page.
- **Mobile:** KPIs become a horizontal scroll on small screens; tables become cards; detail drawer is a bottom sheet.
- **Security:** The snapshot edge function uses the service role internally and is triggered only by the Supabase cron/job system, not by frontend requests. The `get_inventory_intelligence` function enforces the store access check used by existing RLS.

## Success criteria

1. `/inventory-intelligence` loads without errors and shows live data from the user's selected store.
2. KPI values match the actual `items` and `sales_order_items` data (sanity-checked against manual SQL).
3. Age buckets, hero scores, and reorder status follow the rules in this plan.
4. Filters update all charts and tables within 1 second.
5. Export buttons produce a usable Excel file and a printable PDF.
6. Snapshot function runs daily and creates one row per item per store.