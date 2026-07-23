Sales Intelligence + Salesperson Name Integration Plan

Current state (verified by reading backend and code):

- `sales_orders.salesperson_name` exists as a nullable text column.
- `create_sales_order_secure` accepts `_salesperson_name` from the frontend but **does not insert it** into the table (the column is missing from the INSERT statement).
- `EnhancedSalesOrderForm.tsx` already has a "Sales Person(s)" input and sends `salesperson_name`.
- `SalesOrderForm.tsx` also has a salespeople input but does not wire it into the mutation payload.
- `useSalesIntelligence.ts` currently returns hardcoded mock reps (`INITIAL_SALESPEOPLE`) and does not query real sales orders.
- Real order data already contains salesperson names (e.g., SUBHO, TUBAN, MADHUMITA, BIPLAB) and co-selling combos like `SUBHO,BIPLAB`.
- `get_sales_orders_for_user` already returns `salesperson_name`, so the sales table can display it once the data is saved.

Plan

1. Persist salesperson name on order creation
  - Update `create_sales_order_secure` migration to include `_salesperson_name` parameter and insert it into `sales_orders.salesperson_name`.
  - Ensure the existing `useCreateSalesOrder` hook (already passes `_salesperson_name`) works end-to-end.
  - Update `SalesOrderForm.tsx` to include `salesperson_name` in the mutation payload and in its local form state.
  - Keep the comma-separated input format (e.g., `Amit, Ravi`); backend stores it as plain text, frontend intelligence layer will split it.
2. Build real sales intelligence aggregation in the database
  - Create a new RPC `get_sales_intelligence_summary(filters JSONB)` that returns one row per unique salesperson found in `sales_orders.salesperson_name` for the selected store/date range.
  - Logic inside the RPC:
    - Read `sales_orders` joined to `sales_order_items` and `items`.
    - Parse `salesperson_name` by commas; trim whitespace and uppercase/lowercase normalize names.
    - For each order, split revenue and gross profit equally across all named salespeople.
    - Gross profit per line = `(sales_order_items.unit_price - items.cost_price) * quantity` for standard items; where `items.cost_price` is null, use 0.
    - Exclude cancelled orders and quotes (only `document_type = 'order'` or null, `delivery_status != 'Cancelled'`).
    - Aggregate: revenue, profit, orders closed, units sold, AOV, margin %, category mix, etc.
    - Return a JSON structure matching the shape expected by `SalesIntelligenceSummary`.
3. Replace mock data with real data in the frontend
  - Rewrite `useSalesIntelligence.ts` query function to call `get_sales_intelligence_summary` with the active filters.
  - Map the RPC result into the existing `SalesIntelligenceSummary` interface so the UI components (`SalespersonLeaderboard`, `SalespersonDetailDrawer`, `ExecutiveKpiCards`, etc.) need no changes.
  - Remove the hardcoded `INITIAL_SALESPEOPLE`, `INITIAL_CO_SELLING_PAIRS`, and `INITIAL_AI_INSIGHTS` or move them into a fallback helper only used when there are no real salespeople.
4. Display real salesperson in the sales table
  - Update `SalesTable.tsx` to use the real `salesperson_name` field returned by `useComputedSalePaymentStatus` / `useSecureSalesOrders`, instead of the current fallback logic that shows `Rahul Sharma` for most orders.
  - Keep the 50-50 badge when the name contains a comma.
  - Update `OrderDetailsDialog.tsx` to show the salesperson name if available.
5. Quote-to-order conversion preservation
  - Verify that converting a quote to order copies `salesperson_name` forward. If the existing conversion RPC/function does not copy it, update it to do so.
6. Validation & backfill
  - After deploying, run a small test: create a sales order with two comma-separated salespeople and confirm both appear in Sales Intelligence with equal split revenue/profit.
  - Optionally provide a one-time backfill SQL to update older blank `salesperson_name` records using the customer name or a default if the user wants historical data included.

Open questions before implementation

1. Do you want to keep the mock demo data as a fallback when there are no real salespeople, or completely remove it?  
answer: remove mock data fully
2. For profit calculation, is `(unit_price - cost_price) * quantity` acceptable, or do you want to use the material/BOM cost from `sales_order_material_usage` for customized orders?  
answer: no `(unit_price - cost_price) * quantity` acceptable.
3. Should salespeople names be normalized (case-insensitive, trimmed) so `SUBHO` and `Subho` count as one person? Yes/No.  
answer: yes
4. Should the date range filter in Sales Intelligence apply to `sales_orders.date` or `sales_orders.created_at`?  
answer: `sales_orders.created_at`