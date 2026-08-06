# Rework the Telegram daily notifications

Two owner-facing Telegram messages per day, rewritten so each one has a clear job:

- **7:00 AM — "Yesterday closed like this, today looks like this"** (all sales/collection numbers are for *yesterday*, explicitly dated)
- **10:00 PM — "How was my day?"** written in the voice of a shop owner reflecting on the day, not a metrics dump

## What exists today

- The night message comes from the `agent-orchestrator` briefing (fires at `agent_settings.briefing_time` = 22:00 IST, saved into `agent_briefings`). Its current tone is a machine-style executive brief ("Our bank balance is ₹0, payables ₹2,25,218").
- A cron job named `daily-business-summary` runs at 01:30 UTC (07:00 IST) and calls the `operational-alert-scanner` function — that path is an alert scan, not a business recap, so the morning message currently reads like a warning list and mixes today's partial data with yesterday's.
- Telegram delivery goes through the `telegram-notify` function using the Telegram connector; recipients are the active rows in `telegram_links`.
- Both of those functions are deployed but not tracked in the project, so the message wording can't be edited where it lives now.

## What I'll build

### 1. One tracked digest function

New `supabase/functions/telegram-daily-digest/index.ts` that accepts `{ store_id, mode: "morning" | "evening" }`, internal-secret authenticated like the other agent functions, and sends to every active `telegram_links` chat for that store via the Telegram connector gateway.

### 2. Morning message (7:00 AM) — yesterday-anchored

Header states the date being reported ("Yesterday, Wed 5 Aug"). Sections:

- **Yesterday's business** — sales value and order count, cash/bank collected, new quotes, deliveries completed
- **Money** — outstanding receivables, biggest overdue customer, payables due, cash + bank position
- **Today's plan** — deliveries scheduled today, orders awaiting production, payments promised/due today
- **One thing to fix** — the single highest-priority open operational alert, in plain language

All sales, collection, purchase and delivery figures use yesterday's date range only; balances are as-of-now and labelled that way so the two never blur.

### 3. Night message (10:00 PM) — owner's reflection

Same underlying numbers for *today*, but shaped as what an owner actually wants before bed:

- **Did we make money today?** — sales vs. the day's collections, and margin on what was sold
- **What came in, what went out** — cash in, cash out, closing position
- **What's stuck** — orders not moving, deliveries slipped, customers who promised money and didn't pay
- **Tomorrow's first move** — deliveries and follow-up calls waiting at open
- **Compared to usual** — today against the trailing 7-day average, so the number has context ("₹56,100 — about a third of your usual day")

Written through the AI gateway with an owner-voice system prompt: short sentences, ₹ formatting, no jargon, one clear recommendation, and it says so plainly when the day was quiet instead of inventing urgency. The composed text is still stored in `agent_briefings` so the Command Center shows the same wording the owner received.

### 4. Scheduling

- Repoint the 01:30 UTC cron job to the digest function in `morning` mode (the alert scan keeps running on its own schedule, it just stops being the morning message).
- Evening digest fires from the existing `cron_check_briefings` path at `agent_settings.briefing_time`, after the specialists report, so the night message is composed from fresh specialist output.

## Technical notes

- Data comes from existing tables/RPCs (`sales_orders`, `payments`, `purchases`, `items`, `customer_ledger`, `bank_accounts`, `operational_alerts`, `daily_business_kpis`) with an explicit date window per mode, scoped by `store_id`.
- Every query result gets logged with row counts and error text so a zero is verifiably a real zero, not a failed query — the earlier "no cash, no inventory" wrong-numbers problem came from silently failing queries.
- Cron schedule changes are applied as SQL against `cron.job` (they contain project-specific URLs and the vault secret lookup, so they are not committed as a migration).
- Function registered in `supabase/config.toml` with `verify_jwt = false`, guarded by the shared internal-secret check in `_shared/agentAuth.ts`.
