# Fix Today's Follow-ups, then Collections + Delivery Discipline

## Part 1 — Repair Today's Follow-ups (correctness first)

Three concrete defects, all confirmed against the live database:

1. **Tabs always show zero.** The database returns bucket names `collection`, `paid_undelivered`, `delivery_slipping`, `quote_cold`, but the page groups by `collect`, `paid_not_delivered`, `delivery_slipping`, `cold_quote`. Rows that don't match are dropped without error. BIJOY FURNISHERS currently has 6 orders with money pending that never appear.
2. **Logging a follow-up silently fails.** The save writes a `snooze_until` field that doesn't exist on the follow-ups table, and omits the required `kind` field. Result: not a single follow-up has ever been saved.
3. **Snooze is a side effect of "next action date".** Any future next-action date hides the row. Per your choice, snoozed rows should stay visible with a badge, sorted to the bottom.

Fixes:
- Align the page's bucket keys to the database's names (one source of truth, no renaming in SQL so nothing else breaks).
- Save follow-ups with the correct fields: `kind` (the bucket the row came from), `outcome`, `note`, `next_action_date`.
- Add a real `snooze_until` column so snoozing is explicit and separate from the next call date; the worklist returns it, and the UI badges snoozed rows and pushes them to the bottom instead of hiding them.
- Show a truthful empty state: today, 3 of 4 buckets are legitimately empty (no quotes exist, no overdue delivery dates), so each tab explains *why* it's empty rather than looking broken.
- Add a "Recent activity" strip on each card: last note, who logged it, when.

## Part 2 — Collections & customer credit

- **Receivables aging by customer** (not by order): outstanding split into 0-30 / 31-60 / 61-90 / 90+ days, with the oldest unpaid order driving the bucket.
- **Customer credit panel on the customer profile**: total billed, collected, outstanding, and advance/credit held (money we owe them after a cancellation). Reuses the existing customer ledger.
- **Credit limit per customer**: optional limit; the sales form warns when a new order would push the customer past it. Warning only, never a hard block.
- **Collection reminder log**: every call/visit against a customer's outstanding is logged in the same follow-up trail as Part 1, so the customer profile and the worklist tell the same story.
- **Collections page**: sorted by amount at risk, with one-tap call, WhatsApp-ready message text, and CSV export for the owner.

## Part 3 — Delivery & dispatch discipline

- **Promise date required on orders**: the sales form nudges for a delivery date (3 live orders have none today), and the order shows promised vs actual.
- **Dispatch board**: Due today / Overdue / This week / Unscheduled, grouped by date, driven from real order data.
- **Delay accountability**: when an order is marked delivered after its promised date, capture a short reason; a small monthly on-time-delivery number appears on the dashboard.
- **Delivery slip**: printable slip per order (items, quantities, customer, address, balance to collect on delivery) so the driver knows what to collect.
- **Status normalisation**: the database mixes `Delivered` and `delivered`. Normalise existing rows and write one canonical value going forward, so no future report has to guess.

## Sequencing

1. Follow-ups repair (Part 1) — small, immediate, unblocks daily use.
2. Collections & credit (Part 2).
3. Delivery & dispatch (Part 3).

## Technical notes

- Database changes: add `snooze_until` to `order_followups`; extend `get_followup_worklist` to return it and to stop treating `next_action_date` as a snooze; add optional `credit_limit` to `customers`; one data-cleanup pass on `sales_orders.delivery_status` casing plus a canonical-write path.
- New reporting functions for receivables aging and dispatch buckets, both store-scoped and access-checked like the existing worklist function.
- Frontend: fix `src/hooks/useFollowupWorklist.ts` and `src/pages/DailyWorklist.tsx`; new Collections and Dispatch pages with sidebar routes; a credit panel on the existing customer profile.
- All new queries exclude cancelled orders through the existing shared cancellation helper, so KPIs stay consistent with the rest of the app.
