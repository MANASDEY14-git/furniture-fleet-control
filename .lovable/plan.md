# Trustworthy KPIs + Daily Retail Discipline

Two parts. Part 1 makes every number in the app defensible. Part 2 adds the two things a furniture retailer actually touches every day: a follow-up/collection worklist and reorder + showroom stock discipline. No BOM work.

## Part 1 — Cancelled orders must not touch any KPI

Confirmed today in your data: 5 cancelled orders (₹1,04,500) still carry ₹91,000 of `balance_due` and ₹1,04,500 of customer ledger debits. So even screens that hide cancelled orders still show inflated receivables and wrong customer balances.

### 1a. Cancellation asks what happens to the money
Cancelling an order will open a step that shows the advance already collected and asks:
- **Refund** — money goes back. Order balance zeroed, ledger debit reversed, a refund entry recorded against the chosen payment method/bank.
- **Keep as customer credit** — balance zeroed and ledger debit reversed, but the collected advance stays on the customer's account as usable credit for a future order.

Either way the cancelled order leaves the revenue, margin, and receivables numbers permanently. Cancellation stays terminal.

### 1b. Customer credit becomes real
A customer's credit balance shows on their profile and is offered as an adjustment when creating their next order, so staff stop tracking it on paper.

### 1c. One shared definition of "counts as a sale"
Today three different places filter cancellations three different ways, and one uses exact-case `'Cancelled'` while your data contains mixed casing (`Delivered` / `delivered`). Fix: a single case-insensitive rule used everywhere — dashboard, reports, analytics, AI insights, agents, Telegram digests. Verified gaps that will be closed:
- Business Analytics / Reports metrics: currently sum **all** orders including cancelled.
- `generate_ai_insights`: no cancellation filter at all.
- Case-sensitive `.neq('delivery_status','Cancelled')` filters in the sales-forecast and strategy agents.

### 1d. A KPI you can audit
Every headline KPI gets a tap-through showing the exact orders behind the figure, plus a one-line definition ("Revenue = confirmed orders in this financial year, cancellations excluded"). If a number looks wrong, staff can see which rows made it.

## Part 2 — Follow-up & collection worklist

A single daily action screen — the first thing the counter staff opens.

- **Money to collect**: balances outstanding, aged into 0–7 / 8–30 / 30+ days, biggest and oldest first. Excludes cancelled orders.
- **Paid but not delivered**: money taken, goods still in the showroom — the highest-risk bucket.
- **Delivery promises slipping**: promised date passed, not delivered.
- **Quotes going cold**: sent quotes with no movement for 3+ days.
- Each row: call button, WhatsApp-ready message, log a note, and set a call-back date. Rows with a future call-back date disappear until then, so the list actually empties.
- A daily counter: how many follow-ups done, how much collected today.

## Part 3 — Reorder & showroom stock discipline

- **Reorder now**: items whose sales rate against current stock means running out soon, grouped by supplier so one purchase order covers a whole supplier visit. Shows sold-per-week, stock left, weeks of cover, and a suggested quantity that staff can override.
- **Dead stock / floor space**: items with no sale in 90+ days plus the capital tied up in them, with a suggested markdown and a "clear this" flag — floor space is the scarcest asset in a furniture showroom.
- **Fast movers with thin stock**: items selling well and about to be unavailable, flagged separately so they are never buried in the reorder list.
- Both lists export to Excel for the supplier meeting.

## What I am deliberately not doing

No new flashy dashboard. Follow-up and reorder become work queues that empty, not charts to admire. Existing intelligence pages stay as they are.

## Technical notes

- **DB**: extend the cancellation RPC to accept a settlement mode (`refund` | `credit`), zeroing `balance_due` and posting reversing `customer_ledger` entries; refunds write a `payments` row with method/bank metadata. Add a customer credit balance derived from the ledger (no new source of truth). One-time backfill for the 5 existing cancelled orders, asking you per order which mode to use.
- **Canonical filter**: one shared `isCountableOrder` helper for the frontend and a matching `lower(delivery_status) <> 'cancelled'` predicate in SQL. Fix `useEnhancedDashboardMetrics`, `generate_ai_insights`, `sales-forecast`, `sales-strategy`, `agent-sales`.
- **Follow-ups**: new `order_followups` table (order_id, store_id, kind, note, next_action_date, done_at, created_by) with store-scoped RLS and grants; worklist assembled by a store-scoped RPC so paging and ordering happen server-side.
- **Reorder**: RPC over `sales_order_items` + `items` computing weekly velocity, weeks of cover, and dead-stock age; reuses the existing inventory-intelligence aging logic rather than duplicating it.
- **Routes**: `/daily` (worklist) and a Reorder tab on the existing inventory pages. Existing 60s staleTime and query-invalidation conventions apply.
