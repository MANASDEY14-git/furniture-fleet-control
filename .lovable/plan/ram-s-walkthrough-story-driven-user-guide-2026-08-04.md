# Ram's Walkthrough — Story-Driven User Guide

A complete, current walkthrough of the app told through Ram, who runs a furniture retail store and also manufactures part of his catalogue in-house. Delivered twice: as a markdown document in the project, and as an in-app Help page rendering the same content.

## The story arc

The guide follows Ram module by module, in the order he actually encounters them.

1. **Day 0 — Getting in.** Sign up, the pending-approval screen (an admin must grant store access), then the guided onboarding: store setup, first suppliers, first inventory. Store switcher in the sidebar and what "All Stores" means.
2. **Morning ritual — Dashboard.** KPI overview (today's sales, weekly sales, best sellers, slow movers, gross margin, delivery delays, pending orders, customer lifetime value, repeat customers, salesperson performance), delivery alerts, recent sales, and the financial-year switcher that scopes what he sees.
3. **A customer walks in — Sales.** Orders vs Quotes tabs, creating an order: pick or create the customer inline, add items or variants, salesperson name (comma-separated for a split sale), advance payment, delivery date. Quote lifecycle (draft → sent → accepted) and one-click conversion to an order.
4. **Ram builds it himself — Materials & BOM.** Materials master with weighted-average costing, material purchases, BOM per item with material / labor / service components, labor categories with hourly rates, customisable components with options, and the customisation dialog during order creation with live cost preview. When an order qualifies, materials are consumed and a frozen BOM snapshot is kept for traceability.
5. **Stock reality — Inventory.** Catalogue, variants, opening balances, stock adjustments, low-stock alerts, the Stock Ledger and Material Stock Ledger as the audit trail of every movement. The rule that governs stock deduction: paid in full or delivered.
6. **Restocking — Purchasing.** Purchase orders (multi-item), supplier master, cross-supplier purchasing, supplier ledger with opening balances, and how a purchase updates cost price and supplier dues.
7. **Money in, money out — Payments & Bank Book.** Collecting a payment against an order with method (cash, UPI, bank transfer, cheque, cards), bank accounts per store, bank transactions, customer ledger and outstanding balances.
8. **Delivery day — Delivery Calendar.** Calendar and list views, delivery detail panel, marking delivered, bulk delivery, and the alerts Ram sees for delays.
9. **Ram asks questions — Intelligence & AI.** Sales Intelligence (salesperson leaderboard, split-revenue attribution, detail drawer), Inventory Intelligence (hero products, age analysis, cash locked in stock, Excel/PDF export), the AI assistant bubble, and the department agents plus daily briefings.
10. **Watching the shop — Command Center.** Alert inbox, why an alert came back, snooze/resolve, intelligence scan, and operational scores (admin/manager only).
11. **Housekeeping — Settings & Reports.** Store registry, bank accounts, categories, labor categories, agents & briefings, Telegram bot linking, system logs; Reports with sales trend, top sellers, profit, stock value, audit trail and security log; financial-year close and rollover.
12. **Who can do what.** Short role table (admin, manager, accountant, sales rep, employee) and what changes on screen for each.
13. **Ram's weekly rhythm.** A one-page checklist: daily, weekly, monthly, year-end.

Each module section is written as: what Ram wants → where he clicks → what the system does behind the scenes → the gotcha to remember.

## Technical details

- New file `WALKTHROUGH.md` at the project root holds the full guide in markdown.
- New page `src/pages/Help.tsx` renders the same walkthrough as an in-app guide: sticky section navigation on the left, scrollable content, matching the existing Apple-like minimal card style (white surfaces, rounded-2xl, shadow-md, semantic tokens only). Content lives in a structured data file (`src/content/walkthrough.ts`) so the page renders it as styled sections rather than raw markdown, keeping the design system intact.
- Route `/help` registered in `src/App.tsx` inside the protected layout; sidebar entry added under "Finance & Reports" (or its own bottom item) in `src/components/AppSidebar.tsx`, visible to all roles.
- Mobile-first: single vertical scroll container, section nav collapses into a dropdown on small screens.
- No database, RLS, or edge-function changes. Documentation and presentation only.
