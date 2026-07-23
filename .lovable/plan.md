Goal
Make the Sales Person(s) field in the sales order creation form fully connected to the `sales_orders.salesperson_name` column, and verify the data flows correctly into the sales table and sales intelligence.

Current state (verified from the codebase and DB)

- `sales_orders.salesperson_name` exists as a nullable `text` column.
- The `create_sales_order_secure` RPC already accepts `_salesperson_name` and inserts it into `sales_orders.salesperson_name` using `NULLIF(TRIM(_salesperson_name), '')`.
- `useCreateSalesOrder` already passes `salesperson_name` to the RPC.
- `EnhancedSalesOrderForm` (the form used by the Sales page) captures `salespeople` in state and submits it on mobile.
- Real salesperson data is already being saved in the DB (e.g., SUBHO, MADHUMITA).
- `get_sales_intelligence_summary` exists and is already used by `useSalesIntelligence`.
- `SalesTable` already displays `salesperson_name` and the 50-50 split badge when a comma is present.

Gaps found

1. The **desktop layout** of `EnhancedSalesOrderForm` does NOT show a Sales Person(s) input field. It only appears in the mobile layout.
2. The **mobile layout** of `EnhancedSalesOrderForm` shows two separate Sales Person(s) inputs for the same field (one labeled "Sales Person(s) *" near the top, another labeled "Attended Salesperson / Team (50-50 Split)" in the customer section). They both write to the same `formData.salespeople` value, which is confusing and redundant.
3. The older `SalesOrderForm.tsx` has a Sales Person(s) input, but `salespeople` is not declared in the initial `formData` state, and the field is not passed to `createSalesOrder.mutateAsync`. Saving from this form would silently drop the salesperson value.

Plan

1. Fix the active sales form (`EnhancedSalesOrderForm.tsx`)
   - Add a single Sales Person(s) input to the **desktop** layout, placed in the Basic Order Info row alongside Order Number, Store, and Date.
   - Remove the duplicate salespeople inputs from the **mobile** layout and keep only one clearly labeled input.
   - Ensure the helper text about the 50-50 split (comma-separated reps) is still visible on both layouts.
   - Keep the existing submit logic that sends `salesperson_name: formData.salespeople?.trim() || null`.

2. Fix or remove the old form (`SalesOrderForm.tsx`)
   - Option A (recommended): Add `salespeople` to the `formData` initial state and pass `salesperson_name` in `handleSubmit` so it works consistently.
   - Option B: If the old form is no longer used, remove the broken salespeople input to avoid future confusion.
   - The plan will implement Option A unless the user confirms the old form is unused.

3. Verify database integration end-to-end
   - Confirm `create_sales_order_secure` inserts into `salesperson_name` correctly (already true, but re-check after any changes).
   - Confirm `get_sales_intelligence_summary` splits comma-separated names and divides revenue/profit equally (already true, but re-check with a test order).
   - Confirm `useComputedSalePaymentStatus` returns `salesperson_name` so the sales table shows it (already true).

4. Add validation/persistence checks
   - Add a `required` attribute only if the user wants Sales Person(s) mandatory. Default: optional, since the DB column is nullable.
   - Trim whitespace and strip leading/trailing commas before saving.

5. Test plan
   - Create a sales order on desktop with a single salesperson (e.g., "SUBHO") and verify the value appears in the sales table and Sales Intelligence.
   - Create a sales order on mobile with two comma-separated salespeople (e.g., "Amit, Ravi") and verify the 50-50 split appears in Sales Intelligence.
   - Verify existing real orders with salesperson names still display correctly.

Technical details

- Files to edit:
  - `src/components/EnhancedSalesOrderForm.tsx` — add desktop input, clean up mobile duplicate.
  - `src/components/SalesOrderForm.tsx` — wire `salespeople` into state and submission, or remove the input.
- Files to verify (no edits expected):
  - `src/hooks/useSalesOrders.ts` (already passes `salesperson_name`)
  - `src/hooks/useComputedSalePaymentStatus.ts` (already passes `salesperson_name` through)
  - `src/components/sales/SalesTable.tsx` (already renders `salesperson_name`)
  - `src/hooks/useSalesIntelligence.ts` (already calls the real RPC)
- Database functions to verify:
  - `create_sales_order_secure` inserts `salesperson_name`
  - `get_sales_intelligence_summary` splits and aggregates correctly

Out of scope

- No new database migrations are needed; the schema and RPCs already support `salesperson_name`.
- No changes to sales intelligence calculation logic are needed unless testing reveals an error.