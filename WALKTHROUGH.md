# Ram's Walkthrough — Furniture ERP, End to End

Ram owns a furniture showroom. Part of his catalogue he buys finished from suppliers, and part he builds in his own workshop from raw materials, labour and outside services. This guide follows him through the whole system in the order he actually meets it — from his first login to closing the financial year.

The same walkthrough is available inside the app under **Help & Guide** (`/help`).

Every chapter follows the same rhythm: what Ram wants → where he clicks → what the system does behind the scenes → the one thing to remember.

---

## 1. Day 0 — Getting in

**Ram wants:** an account and a store to work in.

**Where he clicks**
1. Sign up with email and password on the Auth screen. Existing staff sign in here too.
2. If nobody has granted him a store yet, he lands on **Pending Approval** — an admin must give him access to a store before any data is visible.
3. Once approved, guided onboarding runs: Welcome → Store setup (name, location) → first Suppliers → first Inventory items → Completion.
4. After onboarding the sidebar appears. The **store switcher** sits at the top — Ram picks the showroom he is working in.

**What the system does**
- Creates his profile automatically on sign-up and remembers onboarding progress, so he can resume mid-way.
- Isolates every table by store. Access is granted per user per store, so he only ever sees the stores he belongs to.
- "All Stores" in the switcher gives a combined view across his stores — useful for reporting, not for data entry.

**Remember:** if a new employee says the app is "empty", the fix is almost always store access, not data.

---

## 2. Morning ritual — Dashboard

**Ram wants:** a 30-second read on whether yesterday was good and what needs attention today.

**Where he clicks**
1. Open **Dashboard**. The KPI band covers today's sales, weekly sales, best-selling products, slow-moving inventory, gross margin, delivery delays, pending customer orders, customer lifetime value, repeat customers and salesperson performance.
2. Below: delivery alerts for orders due or overdue, and a recent sales feed.
3. The **financial-year switcher** in the header moves between years.

**What the system does**
- Scopes every metric to the active store and the selected financial year (15 April – 14 April).
- Excludes cancelled orders from every revenue and collection figure.
- Caches numbers for about a minute, then refreshes — a sale entered a moment ago appears almost immediately.

**Remember:** if a number looks low, check the year switcher first. Last year's orders live in last year's book.

---

## 3. A customer walks in — Sales

**Ram wants:** a quote today, and an order if she says yes.

**Where he clicks**
1. **Sales Orders** → the **Orders / Quotes** tabs separate confirmed business from pipeline.
2. **New Order** (or New Quote). Search the customer; if she is new, create her inline without leaving the form.
3. Add items. Where an item has variants (fabric, size, finish), pick the variant. Enter quantity, unit price and any discount.
4. Type the **salesperson's name**. If two people worked the sale, separate names with a comma — revenue is split equally between them.
5. Record the advance received, set the promised delivery date, save.
6. A quote moves **Draft → Sent → Accepted / Rejected**. Once accepted, one click converts it into a real sales order.

**What the system does**
- Auto-generates the order number, which Ram can override if he keeps his own series.
- Creates or matches the customer in the master, syncs her address, and raises a ledger entry for the order value.
- Records advances as receipts and recalculates balance due on every payment.
- Stores split salespeople on the order and attributes them proportionally in Sales Intelligence.

**Remember:** quotes do not touch stock or the ledger. Only an accepted quote converted to an order does.

---

## 4. Ram builds it himself — Materials & BOM

**Ram wants:** to know what a workshop-built sofa consumes and what it truly costs.

**Where he clicks**
1. **Materials** — the raw material master (plywood, foam, fabric, polish) with unit, stock on hand and cost.
2. **Material Purchases** — buying material, several materials on one invoice if needed.
3. **BOM Management** — the recipe per manufactured item. *BOM Overview* lists them, *Cost Analytics* compares costs, *Templates* speeds up new ones.
4. Inside a BOM, add components of three kinds:
   - **Material** — a quantity of a raw material.
   - **Labour** — hours and minutes against a labour category with an hourly rate.
   - **Service** — a flat or calculated outside cost such as transport or polishing.
5. Labour categories with default hourly rates live in **Settings**, so carpentry and upholstery each carry their real rate.
6. Mark a component **customisable** and give it options (e.g. three fabric grades). During order creation the customisation dialog lets Ram choose per order and shows the cost difference live before he commits.

**What the system does**
- Costs material on a **weighted average**, so each purchase at a new price adjusts the average rather than overwriting it.
- Recalculates BOM estimated cost as components and rates change.
- When an order qualifies for production, consumes BOM materials from material stock and writes a movement for each.
- Stores a **frozen snapshot** of the BOM as it stood at that moment against the order line.

**Remember:** change a rate or component and only future orders see it. Past orders keep their snapshot — deliberate traceability, not a bug.

---

## 5. Stock reality — Inventory

**Ram wants:** system stock to match what he can physically point at in the showroom.

**Where he clicks**
1. **Inventory** lists the catalogue with quantity, cost price, selling price, brand, warehouse and supplier. Items can carry variants with their own stock.
2. Set an **opening balance** per item when a financial year starts.
3. Use **Stock Adjustment** for breakage, samples, corrections or found stock — always with a reason.
4. **Low-stock alerts** flag items running thin, variant-aware where variants exist.
5. **Stock Ledger** and **Material Stock Ledger** show every movement — purchase in, sale out, adjustment, production consumption — with the document behind it.

**What the system does**
- Deducts stock for a sale when the order is **paid in full or marked delivered**, whichever comes first — not at order entry.
- Reverses everything on cancellation: stock returns, ledger entries are undone, and the order becomes terminal.
- Keeps parent item quantity in sync with the total of its variants.

**Remember:** if stock has not moved for a confirmed order, it is usually neither fully paid nor delivered yet. That rule protects the count.

---

## 6. Restocking — Purchasing

**Ram wants:** to buy replacements and keep supplier accounts straight.

**Where he clicks**
1. **Purchase Orders** records a purchase, multiple items on one invoice, with invoice number and date.
2. **Suppliers** holds the master with contact person, GSTIN and per-store access, plus purchase history per supplier.
3. The same item can be bought from an **alternative supplier** when the usual one cannot deliver.
4. **Supplier Ledger** shows dues per supplier, including opening balances carried in from before the system went live.

**What the system does**
- Increases item stock, refreshes item cost price, and raises a credit in the supplier ledger on save.
- Posts the debit and reduces outstanding when a supplier is paid.
- Tags opening balances distinctly, so legacy dues are distinguishable from system-raised dues.

**Remember:** enter the invoice number. It is the thread tying stock, supplier dues and payments together during a dispute.

---

## 7. Money in, money out — Payments & Bank Book

**Ram wants:** a UPI collection and a cheque payment to land in the right account.

**Where he clicks**
1. On the **Sales** page action menu for an order → **Record Payment**. Enter the amount and pick the method: cash, UPI, bank transfer, cheque, debit or credit card, wallet.
2. For non-cash methods, fill the fields that appear — bank account, reference number, UPI ID, card last four, or cheque number and date.
3. **Payments** lists all receipts and payments; **Bank Book** holds each bank account per store with running balance and transactions.
4. Each customer profile carries **Overview, Orders, Ledger and Addresses** tabs with the running balance.

**What the system does**
- Updates the order's collected amount and balance due, and posts to the customer ledger.
- Moves the bank account balance and records a bank transaction when an account is selected.
- Tracks bank charges and cleared dates separately, so cheques in transit are not counted as cleared money.

**Remember:** pick the bank account for non-cash payments. Without it the money is recorded against the order but never reaches a bank balance.

---

## 8. Delivery day — Delivery Calendar

**Ram wants:** to see everything promised this week and close it off as it goes out.

**Where he clicks**
1. **Delivery** shows calendar and list views of orders by promised date.
2. Tap a delivery for the detail panel — customer, address, phone, items, balance due.
3. Mark an order delivered from the panel, or select several and deliver them **in bulk**.
4. Overdue deliveries surface as alerts on the Dashboard and in the Command Center.

**What the system does**
- Stamps the delivery time and, if it had not happened yet, triggers stock deduction.
- Feeds delivery success rate into the store's operational score and the delivery-delay KPI.

**Remember:** deliver from this screen rather than editing the order — that keeps the delay statistics honest.

---

## 9. Ram asks questions — Intelligence & AI

**Ram wants:** answers, not more tables.

**Where he clicks**
1. **Sales Intelligence** — salesperson leaderboard with revenue, order count and average order value, plus a detail drawer per person. Shared sales carry a split badge.
2. **Inventory Intelligence** — hero products, inventory age buckets, cash locked in slow and dead stock, filters by brand, warehouse, category and supplier. Export to **Excel or PDF**.
3. The **assistant bubble** on every page — ask a plain question about sales, stock, purchases or cash; it answers from live store data and names the department agents it consulted.
4. **Daily briefings** from the department agents are listed in Settings, and can be generated on demand with **Generate Now**.

**What the system does**
- Splits revenue equally across co-attending salespeople, so a shared sale is never double-counted.
- Buckets inventory as fresh, good, aging or old using stock receive dates.
- Restricts agents to the active store's data, verifying store access on every AI call.

**Remember:** intelligence is only as good as entry discipline — a missing salesperson name or stock receive date shows up here as a gap.

---

## 10. Watching the shop — Command Center

**Ram wants:** problems to come to him instead of being discovered next month.

**Where he clicks**
1. **Command Center** (admins and managers). The **Alert Inbox** lists operational risks by severity and priority.
2. Run the **intelligence scan** to refresh risks on demand.
3. Per alert: resolve with a note, or **snooze** for 1–30 days if it is known and being handled.
4. **Operational scores** summarise delivery, inventory, finance, customer and compliance health.

**What the system does**
- De-duplicates alerts: a resolved alert only returns if the underlying number has materially worsened — and says why it came back.
- Auto-resolves alerts that fix themselves, so the inbox reflects reality.

**Remember:** resolve with a note, not silently. The note explains a repeat alert three weeks later.

---

## 11. Housekeeping — Settings & Reports

**Ram wants:** a monthly tidy-up and the bigger picture.

**Where he clicks**
1. **Settings → Store Registry** — stores, bank accounts, item categories, labour categories, users, roles and per-store access.
2. **Settings → Agents & Briefs** — which department agents are on, briefing time and timezone, and the briefing log.
3. **Settings → Telegram Bot** — generate a link code and pair a chat so alerts and orders reach his phone.
4. **Settings → System Logs** — raw system events for troubleshooting.
5. **Reports** — sales trend, top-selling items, total sales, purchases, net profit, stock value, plus **Data Audit Trail** and **Security Audit Log**.
6. **Financial Years** — close the current year and roll over; closing balances become next year's opening balances.

**What the system does**
- Restricts shared masters such as categories and labour rates to admins and managers.
- Writes every sensitive change to an audit trail with who, what and when.
- Makes a closed year read-only with a banner, so history cannot drift.

**Remember:** close the year only once the last invoice and payment of that year is entered. Reopening is deliberately hard.

---

## Who can do what

| Role | Can do | What changes on screen |
| --- | --- | --- |
| **Admin** | Everything: stores, users, roles, masters, year-end close, Command Center. | Full sidebar including Command Center and all Settings tabs. |
| **Manager** | Day-to-day operations plus shared masters such as categories and labour rates. | Command Center and financial pages visible; user administration limited. |
| **Accountant** | Payments, bank book, ledgers, reports. Not stock masters. | Finance and reporting pages; masters read-only. |
| **Sales representative** | Quotes, orders, customers, deliveries, collecting payments for their store. | Sales group and Dashboard; financial administration hidden. |
| **Employee** | View and operate granted stores, without changing shared settings. | Core operational pages only. |

---

## Ram's rhythm

**Every day**
- Read the Dashboard KPIs and the briefing.
- Enter yesterday's orders and receipts.
- Work the Delivery calendar for today.
- Clear the Command Center alert inbox.

**Every week**
- Review the salesperson leaderboard.
- Act on low-stock alerts and raise purchases.
- Reconcile bank accounts in Bank Book.
- Chase outstanding customer balances.

**Every month**
- Review Inventory Intelligence for aging and dead stock.
- Reconcile supplier ledgers against invoices.
- Recheck BOM costs against current material prices.
- Scan the audit trail for unexpected changes.

**Year-end (April)**
- Enter the last invoices and payments of the year.
- Verify item and supplier balances.
- Close the financial year and roll balances over.
- Confirm the new year opens with correct opening stock.
