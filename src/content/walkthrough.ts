/**
 * Ram's Walkthrough — story-driven user guide content.
 *
 * Ram runs a furniture retail store and manufactures part of his catalogue
 * in-house. Each section follows the same rhythm:
 *   want  -> what Ram is trying to achieve
 *   steps -> where he clicks
 *   behind-> what the system does for him
 *   gotcha-> the one thing to remember
 *
 * Kept as structured data (not markdown) so the Help page renders it with the
 * project design system.
 */

export interface WalkthroughSection {
  id: string;
  chapter: number;
  title: string;
  subtitle: string;
  want: string;
  steps: string[];
  behind: string[];
  gotcha: string;
}

export interface RoleRow {
  role: string;
  canDo: string;
  onScreen: string;
}

export interface RhythmGroup {
  cadence: string;
  items: string[];
}

export const walkthroughIntro = {
  title: "Ram's walkthrough",
  tagline: 'A furniture store, end to end',
  body:
    'Ram owns a furniture showroom. Part of his catalogue he buys finished from suppliers, and part he builds in his own workshop from raw materials, labour and outside services. This guide follows him through the whole system in the order he actually meets it — from his first login to closing the financial year.',
};

export const walkthroughSections: WalkthroughSection[] = [
  {
    id: 'getting-in',
    chapter: 1,
    title: 'Day 0 — Getting in',
    subtitle: 'Sign up, approval, and first-time setup',
    want: 'Ram has just been given the app. He needs an account and a store to work in.',
    steps: [
      'Open the app and sign up with email and password on the Auth screen. Existing staff sign in here too.',
      'If nobody has granted him a store yet, he lands on Pending Approval — an admin has to give him access to a store before any data is visible.',
      'Once approved, the guided onboarding runs: Welcome, Store setup (name and location), first Suppliers, first Inventory items, then Completion.',
      'After onboarding, the sidebar appears. The store switcher sits at the top of the sidebar — Ram picks the showroom he is working in.',
    ],
    behind: [
      'A profile is created for him automatically on sign-up and the onboarding progress is remembered, so he can leave mid-way and resume.',
      'Every table in the system is isolated by store. Access is granted per user per store, so Ram only ever queries the stores he belongs to.',
      'Picking "All Stores" in the switcher shows a combined view across every store he has access to — useful for reporting, not for data entry.',
    ],
    gotcha:
      'If a new employee says the app is "empty", the fix is almost always store access, not data — grant it from Settings.',
  },
  {
    id: 'dashboard',
    chapter: 2,
    title: 'Morning ritual — Dashboard',
    subtitle: 'The ten numbers Ram checks with his first tea',
    want: 'A 30-second read on whether yesterday was good and what needs attention today.',
    steps: [
      'Open Dashboard. The KPI band across the top covers today’s sales, weekly sales, best-selling products, slow-moving inventory, gross margin, delivery delays, pending customer orders, customer lifetime value, repeat customers and salesperson performance.',
      'Below that: delivery alerts for orders due or overdue, and a recent sales feed.',
      'Use the financial-year switcher in the header to move between years.',
    ],
    behind: [
      'Every metric is scoped to the active store and the selected financial year (15 April to 14 April).',
      'Cancelled orders are excluded from every revenue and collection figure.',
      'Numbers are cached for about a minute, then refreshed — so a sale entered a moment ago appears almost immediately.',
    ],
    gotcha:
      'If a number looks low, check the year switcher first. Last year’s orders live in last year’s book.',
  },
  {
    id: 'sales',
    chapter: 3,
    title: 'A customer walks in — Sales',
    subtitle: 'Quotes, orders, advances and split commissions',
    want: 'A walk-in wants a sofa set. Ram needs a quote today and an order if she says yes.',
    steps: [
      'Go to Sales Orders. Use the Orders / Quotes tabs to switch between confirmed business and pipeline.',
      'Press New Order (or New Quote). Search the customer in the customer box — if she is new, create her inline without leaving the form.',
      'Add items. Where an item has variants (fabric, size, finish), pick the variant. Enter quantity, unit price and any discount.',
      'Type the salesperson’s name. If two people worked the sale, separate names with a comma — the revenue is split equally between them.',
      'Record the advance received, set the promised delivery date, and save.',
      'A quote moves Draft → Sent → Accepted / Rejected. Once accepted, one click converts it into a real sales order.',
    ],
    behind: [
      'The order gets an auto-generated order number, which Ram can override manually if he keeps his own series.',
      'The customer is created or matched in the customer master, her address is synced, and a ledger entry is raised for the order value.',
      'Advance payments are recorded as receipts and the balance due is recalculated on every payment.',
      'Split salespeople are stored on the order and attributed proportionally in Sales Intelligence.',
    ],
    gotcha:
      'Quotes do not touch stock or the ledger. Only an accepted quote converted to an order does.',
  },
  {
    id: 'production',
    chapter: 4,
    title: 'Ram builds it himself — Materials & BOM',
    subtitle: 'Raw material, labour, services and customisation',
    want: 'The sofa is made in his workshop. Ram needs to know what it consumes and what it truly costs.',
    steps: [
      'Materials holds the raw material master — plywood, foam, fabric, polish — with unit, stock on hand and cost.',
      'Material Purchases records buying material, several materials on one invoice if needed.',
      'BOM Management holds the recipe for each manufactured item. BOM Overview lists them, Cost Analytics compares costs, Templates speeds up new ones.',
      'Inside a BOM, add components of three kinds: Material (quantity of a raw material), Labour (hours and minutes against a labour category with an hourly rate), and Service (a flat or calculated outside cost such as transport or polishing).',
      'Labour categories with default hourly rates are maintained in Settings, so carpentry and upholstery each carry their real rate.',
      'Mark a component customisable and give it options — e.g. three fabric grades. During order creation the customisation dialog lets Ram pick per order and shows the cost difference live before he commits.',
    ],
    behind: [
      'Material costing uses a weighted average, so each purchase at a new price adjusts the average cost rather than overwriting it.',
      'BOM estimated cost recalculates as components and rates change.',
      'When an order qualifies for production, the BOM materials are consumed from material stock and a movement is written for each one.',
      'A frozen snapshot of the BOM as it stood at that moment is stored against the order line — so a recipe changed next month never rewrites last month’s history.',
    ],
    gotcha:
      'Change a rate or a component and only future orders see it. Past orders keep their snapshot — that is deliberate traceability, not a bug.',
  },
  {
    id: 'inventory',
    chapter: 5,
    title: 'Stock reality — Inventory',
    subtitle: 'What is on the floor, and why it changed',
    want: 'Ram wants his system stock to match what he can physically point at in the showroom.',
    steps: [
      'Inventory lists the catalogue with quantity, cost price, selling price, brand, warehouse and supplier. Items can carry variants with their own stock.',
      'Set an opening balance per item when a financial year starts, so a year opens with the right quantity and value.',
      'Use Stock Adjustment for breakage, samples, corrections or found stock — always with a reason.',
      'Low-stock alerts flag items running thin, variant-aware where variants exist.',
      'Stock Ledger and Material Stock Ledger show every single movement — purchase in, sale out, adjustment, production consumption — with the document behind it.',
    ],
    behind: [
      'Stock is deducted for a sale when the order is paid in full or marked delivered, whichever happens first. Not at order entry.',
      'Cancelling an order reverses everything it did: stock returns, ledger entries are undone, and the order becomes terminal.',
      'Parent item quantity stays in sync with the total of its variants.',
    ],
    gotcha:
      'If stock has not moved for a confirmed order, it is usually neither fully paid nor delivered yet. That rule protects the count.',
  },
  {
    id: 'purchasing',
    chapter: 6,
    title: 'Restocking — Purchasing',
    subtitle: 'Suppliers, invoices and what Ram still owes',
    want: 'Two dining sets sold. Ram needs to buy replacements and keep his supplier accounts straight.',
    steps: [
      'Purchase Orders records a purchase, multiple items on one invoice, with invoice number and date.',
      'Suppliers holds the supplier master with contact person, GSTIN and per-store access, plus a purchase history for each supplier.',
      'The same item can be bought from an alternative supplier when the usual one cannot deliver.',
      'Supplier Ledger shows dues per supplier, including opening balances carried in from before the system went live.',
    ],
    behind: [
      'Saving a purchase increases item stock, refreshes the item cost price, and raises a credit in the supplier ledger.',
      'Paying a supplier posts the debit and reduces the outstanding balance automatically.',
      'Opening balances are tagged distinctly so Ram can tell legacy dues from dues raised in the system.',
    ],
    gotcha:
      'Enter the invoice number. It is the thread that ties stock, supplier dues and payments together during a dispute.',
  },
  {
    id: 'money',
    chapter: 7,
    title: 'Money in, money out — Payments & Bank Book',
    subtitle: 'Cash, UPI, cheque, card, transfer',
    want: 'The customer pays the balance by UPI and a supplier is paid by cheque. Both must land in the right account.',
    steps: [
      'From the Sales page action menu on an order, choose Record Payment. Enter the amount and pick the method: cash, UPI, bank transfer, cheque, debit or credit card, wallet.',
      'For non-cash methods, fill the extra fields that appear — bank account, reference number, UPI ID, card last four, or cheque number and date.',
      'Payments lists all receipts and payments; Bank Book holds each bank account per store with its running balance and transactions.',
      'Each customer’s profile carries an Overview, Orders, Ledger and Addresses tab with the running balance.',
    ],
    behind: [
      'Every receipt updates the order’s collected amount and balance due, and posts to the customer ledger.',
      'Payments tied to a bank account move that account’s balance and appear in bank transactions.',
      'Bank charges and cleared dates are tracked separately, so cheques in transit are not counted as cleared money.',
    ],
    gotcha:
      'Pick the bank account for non-cash payments. Without it the money is recorded against the order but never reaches a bank balance.',
  },
  {
    id: 'delivery',
    chapter: 8,
    title: 'Delivery day — Delivery Calendar',
    subtitle: 'Loading the truck without a WhatsApp scroll',
    want: 'Ram wants to see everything promised this week and close it off as it goes out.',
    steps: [
      'Delivery shows a calendar view and a list view of orders by promised date.',
      'Tap a delivery to open the detail panel — customer, address, phone, items, balance due.',
      'Mark an order delivered from the panel, or select several and deliver them in bulk.',
      'Overdue deliveries surface as alerts on the Dashboard and in the Command Center.',
    ],
    behind: [
      'Marking delivered stamps the delivery time and, if it had not happened yet, triggers stock deduction.',
      'Delivery success rate feeds the store’s operational score and the delivery-delay KPI.',
    ],
    gotcha:
      'Deliver from this screen rather than editing the order — that is what keeps the delay statistics honest.',
  },
  {
    id: 'intelligence',
    chapter: 9,
    title: 'Ram asks questions — Intelligence & AI',
    subtitle: 'Who sells, what sits, and what to do about it',
    want: 'Ram wants answers, not more tables: who is performing, what is dead stock, what should he reorder.',
    steps: [
      'Sales Intelligence shows a salesperson leaderboard with revenue, order count and average order value, plus a detail drawer per person. Shared sales appear with a split badge.',
      'Inventory Intelligence shows hero products, inventory age buckets, cash locked in slow and dead stock, and filters by brand, warehouse, category and supplier. Export to Excel or PDF.',
      'The assistant bubble is available on every page — ask a plain question about sales, stock, purchases or cash and it answers from live store data, naming the department agents it consulted.',
      'Daily briefings from the department agents are listed in Settings, and can be generated on demand with Generate Now.',
    ],
    behind: [
      'Attribution splits revenue equally across co-attending salespeople, so a shared sale is never double-counted.',
      'Age analysis uses stock receive dates to bucket inventory as fresh, good, aging or old.',
      'The agents read only the active store’s data, and every AI call verifies the user’s store access first.',
    ],
    gotcha:
      'Intelligence pages are only as good as the entry discipline — a missing salesperson name or stock receive date shows up as a gap here.',
  },
  {
    id: 'command-center',
    chapter: 10,
    title: 'Watching the shop — Command Center',
    subtitle: 'One inbox for operational risk',
    want: 'Ram wants problems to come to him instead of being discovered next month.',
    steps: [
      'Open Command Center (admins and managers). The Alert Inbox lists operational risks by severity and priority.',
      'Run the intelligence scan to refresh risks on demand.',
      'For each alert: resolve it with a note, or snooze it for 1 to 30 days if it is known and being handled.',
      'Operational scores summarise delivery, inventory, finance, customer and compliance health.',
    ],
    behind: [
      'Alerts are de-duplicated: a resolved alert only returns if the underlying number has materially worsened, and it says why it came back.',
      'Alerts that fix themselves are auto-resolved so the inbox reflects reality.',
    ],
    gotcha:
      'Resolve with a note, not silently. The note is what explains a repeat alert three weeks later.',
  },
  {
    id: 'settings',
    chapter: 11,
    title: 'Housekeeping — Settings & Reports',
    subtitle: 'Masters, users, logs and year-end',
    want: 'Once a month Ram tidies up the system and looks at the bigger picture.',
    steps: [
      'Settings → Store Registry: stores, bank accounts, item categories, labour categories, users, roles and per-store access.',
      'Settings → Agents & Briefs: which department agents are on, briefing time and timezone, and the briefing log.',
      'Settings → Telegram Bot: generate a link code and pair a chat so alerts and orders reach Ram’s phone.',
      'Settings → System Logs: raw system events for troubleshooting.',
      'Reports: sales trend, top-selling items, total sales, purchases, net profit, stock value, plus the Data Audit Trail and Security Audit Log.',
      'Financial Years: close the current year and roll over. Closing balances become next year’s opening balances.',
    ],
    behind: [
      'Only admins and managers can change shared masters such as categories and labour rates.',
      'Every sensitive change is written to an audit trail with who, what and when.',
      'A closed year becomes read-only and shows a banner, so history cannot drift.',
    ],
    gotcha:
      'Close the year only once the last invoice and payment of that year is entered. Reopening is deliberately hard.',
  },
];

export const roleRows: RoleRow[] = [
  {
    role: 'Admin',
    canDo: 'Everything: stores, users, roles, masters, year-end close, Command Center.',
    onScreen: 'Full sidebar including Command Center and all Settings tabs.',
  },
  {
    role: 'Manager',
    canDo: 'Day-to-day operations plus shared masters such as categories and labour rates.',
    onScreen: 'Command Center and financial pages visible; user administration limited.',
  },
  {
    role: 'Accountant',
    canDo: 'Payments, bank book, ledgers, reports. Not stock masters.',
    onScreen: 'Finance and reporting pages; masters are read-only.',
  },
  {
    role: 'Sales representative',
    canDo: 'Quotes, orders, customers, deliveries and collecting payments for their store.',
    onScreen: 'Sales group and Dashboard; financial administration hidden.',
  },
  {
    role: 'Employee',
    canDo: 'View and operate the stores they are granted, without changing shared settings.',
    onScreen: 'Core operational pages only.',
  },
];

export const rhythmGroups: RhythmGroup[] = [
  {
    cadence: 'Every day',
    items: [
      'Read the Dashboard KPIs and the briefing.',
      'Enter yesterday’s orders and receipts.',
      'Work the Delivery calendar for today.',
      'Clear the Command Center alert inbox.',
    ],
  },
  {
    cadence: 'Every week',
    items: [
      'Review the salesperson leaderboard.',
      'Act on low-stock alerts and raise purchases.',
      'Reconcile bank accounts in Bank Book.',
      'Chase outstanding customer balances.',
    ],
  },
  {
    cadence: 'Every month',
    items: [
      'Review Inventory Intelligence for aging and dead stock.',
      'Reconcile supplier ledgers against invoices.',
      'Recheck BOM costs against current material prices.',
      'Scan the audit trail for unexpected changes.',
    ],
  },
  {
    cadence: 'Year-end (April)',
    items: [
      'Enter the last invoices and payments of the year.',
      'Verify item and supplier balances.',
      'Close the financial year and roll balances over.',
      'Confirm the new year opens with correct opening stock.',
    ],
  },
];
