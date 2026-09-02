# Fix daily digests: all stores, only when there is movement

## What I found (verified against your database)

1. **Delivery has been dead since 29 Aug.** Both cron jobs still run and report success, but they only *queue* the HTTP call through Postgres' `pg_net` extension. The queue is empty, the response table has zero rows, and there is not a single call to the digest function in the edge logs for the last 3 days. So the schedule fires, the request is never delivered, and nobody is told. Last briefing recorded: 29 Aug 16:30 UTC.
2. **Only one store is ever digested.** Digest recipients come from two tables, and both have exactly one row:
   - `agent_settings` (which stores have briefings enabled): only BIJOY FURNISHERS.
   - `telegram_links` (which chat gets the message): only your chat, linked to BIJOY FURNISHERS.
   BIJOY&CHARU FURNISHERS and EASTERN FURNISHERS have no settings row and no link, so they are skipped entirely — this is why you see one store's data even though your admin account can access all of them.
3. **No quiet-day suppression exists.** Today the digest is always composed and sent, even on a day with zero movement.

## What I will change

### 1. Make delivery reliable and self-reporting
- Restart the `pg_net` worker and re-verify that a queued request actually reaches the function.
- Rebuild both schedules so dispatch happens inside one database function that: enumerates the stores itself, posts one request per store, and writes a row into a new `digest_runs` table (store, mode, date, outcome, error text).
- Add a watchdog: if a scheduled digest produced no successful run for the previous day, the next morning message opens with a plain line telling you the digest had failed — so a silent stop can never happen again unnoticed.

### 2. Cover every store, one message per store
- Create `agent_settings` rows for BIJOY&CHARU FURNISHERS and EASTERN FURNISHERS (enabled, 22:00, Asia/Kolkata), matching BIJOY.
- Fan out delivery by *recipient access* rather than by store link: for each store being digested, send to every active Telegram chat whose linked user has access to that store (admins get all stores). Your admin chat therefore receives one message per store, sent back-to-back, each headed with the store name.
- Test Store is excluded.

### 3. Only send when there was movement
A store is "moved" for the reporting window when any of these is non-zero:
- sales orders created (excluding cancelled) or quotes created
- payments in or out (cash/bank)
- purchases or material purchases
- inventory in/out (stock movements, deliveries completed, stock adjustments)

If nothing moved, that store is skipped completely — no message. If no store moved, no digest is sent at all that slot, and the skip is recorded in `digest_runs` so the Command Center can show "checked, nothing to report".

The morning message keeps the short "yesterday closed like this / today looks like this" briefing shape you already get; the evening one keeps the owner's-reflection tone.

## Technical notes

- New table `public.digest_runs` (store_id, mode, run_date, status: sent/skipped_no_movement/failed, recipients, error, created_at) with grants + RLS scoped to store access; used for the watchdog and Command Center visibility.
- Movement check runs as a single cheap count query per store before any AI call, so quiet days cost nothing.
- `telegram-daily-digest/index.ts`: replace the `agent_settings`-only store list with a store enumeration + movement gate, replace the store-scoped `telegram_links` lookup with an access-based recipient lookup, and record each run.
- `cron_check_briefings()` rewritten to loop stores and log dispatch; morning job (`daily-business-summary`, 01:30 UTC) repointed at the same dispatch function in `morning` mode.
- Cron/pg_net changes are applied as SQL against `cron.job` (they embed project URLs and the vault secret lookup), not committed as migrations; the `digest_runs` table is a migration.
- Verification: trigger both modes manually after deploy, confirm one message per store in Telegram and matching `digest_runs` rows, and confirm a store with no movement is skipped.
