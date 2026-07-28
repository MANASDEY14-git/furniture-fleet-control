# Financial Year Snapshots & Year-Scoped UI

Adopt the existing April–March financial-year model (`financial_years` already has FY 2025-26 closed and FY 2026-27 active) as the app-wide time boundary. Prior years become immutable snapshots; the UI defaults to the active year, with a header switcher to view any past year read-only.

## 1. Data model (already mostly in place, minor additions)

Tables in use: `financial_years`, `year_end_snapshots`, `item_opening_balances`, `supplier_opening_balances`, plus RPC `perform_year_end_closing(p_year_id)`.

Additions:
- New RPC `get_active_financial_year()` — returns the row where `is_active = true AND is_closed = false` (based on `CURRENT_DATE` between `start_date` and `end_date`).
- New RPC `close_and_rollover_financial_year()` — idempotent: for any FY whose `end_date < CURRENT_DATE` and `is_closed = false`, calls `perform_year_end_closing`, then inserts the next FY row (Apr 15 → Apr 14 next year), sets it `is_active = true`, and seeds `item_opening_balances` / `supplier_opening_balances` for the new year from the snapshot.
- Verify `perform_year_end_closing` writes `year_end_snapshots` rows for: inventory (qty + value per item/store), customer balances, supplier balances, bank balances. Patch any missing snapshot types.

## 2. Auto-close on rollover

- Enable `pg_cron` + `pg_net`.
- Daily cron at 00:15 IST calls `close_and_rollover_financial_year()` via RPC. Idempotent — no-op on non-boundary days.
- Log outcome to a lightweight `system_events` row for audit.

## 3. Frontend: active-year context

- `FinancialYearContext` provider (mounted above routes) exposing `{ activeYear, selectedYear, setSelectedYear, isViewingPast }`. Defaults `selectedYear` to the DB active FY; persisted in localStorage.
- Header `YearSwitcher` dropdown listing all `financial_years` (closed rows badged "Closed · read-only"). Selecting a past year sets a global read-only banner and disables Create/Edit/Delete buttons app-wide via a `useYearGuard()` hook.

## 4. Query scoping

All list/dashboard hooks receive `selectedYear.start_date` and `selectedYear.end_date` and add a `.gte()/.lte()` filter on the relevant date column:

| Area | Hook / RPC | Date column |
| --- | --- | --- |
| Sales | `usePaginatedSalesOrders`, `useSecureSalesOrders`, `get_sales_orders_secure` | `sales_orders.date` |
| Purchases | `usePurchases`, `usePaginatedPurchases` | `purchases.date` |
| Material purchases | `useMaterialPurchases` | `material_purchases.date` |
| Payments | `usePayments`, `useBankTransactions` | `payments.date` |
| Customer ledger | `useCustomerLedger`, `customer_summary` | `customer_ledger.transaction_date` |
| Supplier ledger | `useSupplierLedger` | `supplier_ledger.transaction_date` |
| Stock ledger | `useStockLedger` | derive opening from `item_opening_balances` + movements in-window |
| Dashboards | `useEnhancedDashboardMetrics`, `useKpiMetrics`, `useRealDashboardMetrics` | date column per source |
| Intelligence | `get_sales_intelligence_summary`, `get_inventory_intelligence` | add `p_start_date`, `p_end_date` params |

RPCs updated to accept optional `p_start_date` / `p_end_date` and default to the active FY when omitted.

## 5. Inventory & stock ledger specifics

- Stock ledger opening row per item is read from `item_opening_balances` for `selectedYear`; only movements within the FY window are listed.
- Inventory Intelligence and dashboard stock-value KPIs use the same opening + in-window movements calculation.
- For the currently-active FY, opening balances were seeded at the previous close and are immutable.

## 6. UI touch points

- `Layout` / `AppSidebar` header: mount `YearSwitcher`.
- Read-only banner ("Viewing FY 2025-26 · closed") shown across pages when `isViewingPast`.
- `Settings → Financial Years`: list years, show close status, manual "Close now" button for admins (safety net; normally cron handles it).
- Create/Edit dialogs (sales, purchases, payments, adjustments) blocked when a past year is selected.

## 7. Backfill

- Ensure FY 2025-26 has full `year_end_snapshots` rows (rerun `perform_year_end_closing` idempotently if missing).
- Ensure `item_opening_balances` and `supplier_opening_balances` for FY 2026-27 are populated from those snapshots.

## Technical notes

- Migrations: extend `perform_year_end_closing` if any snapshot type missing; add `close_and_rollover_financial_year` and `get_active_financial_year`; add `p_start_date`/`p_end_date` params to intelligence RPCs (use `DROP FUNCTION IF EXISTS` before recreating).
- Cron: schedule via `supabase--insert` (not migration) since it contains the anon key.
- React Query keys must include `selectedYear.id` so cache doesn't bleed across years.
- `useYearGuard()` returns `{ readOnly: boolean }` and is consumed by every mutation-triggering component to disable action buttons for past years.
