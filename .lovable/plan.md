## Deep scan result (verified against code + live database)

I checked every table in the schema against the frontend source. These tables hold **real data** but have **zero UI** anywhere in the app:

| Table | Rows today | Frontend usage |
|---|---|---|
| operational_alerts | 962 | none |
| agent_briefings | 62 | none |
| agent_settings | 1 | none |
| daily_business_kpis | 230 | none |
| store_operational_scores | 230 | none |
| system_events | 1,919 | none |
| security_audit_log | 2,531 | none |
| telegram_links / telegram_link_codes / telegram_chat_context / telegram_messages | 1 / – / – / 65 | none |
| supplier_store_access | 56 | none |
| ai_insights | 6 | none (hook exists but reads edge functions, not this table) |
| inventory_snapshots | 0 | none (never populated) |

Also confirmed: there is **no `/command-center` route, no Command Center page, and no agent/telegram edge functions in `supabase/functions/`** (only erp-assistant, inventory-snapshot, material-advisor, restock-recommendations, sales-forecast, sales-strategy). So the earlier Mission Control / agent-orchestrator / telegram work is not present in the current codebase — the database side survived, the app side did not. That is why "AI Command Center", "AI Orchestrator" and "Telegram bot settings" are invisible.

Everything else (sales, purchases, payments, ledgers, materials, BOM, financial years, bank, customers, stock adjustments, opening balances, audit_trails, low_stock_alerts, user_roles/store access) is already surfaced.

## Plan

### 1. Mission Control page (`/command-center`)
New page + sidebar entry, admin/manager visible:
- **Health strip** from `store_operational_scores` (delivery, inventory, finance, customer, compliance, overall) for the selected store/date.
- **KPI strip** from `daily_business_kpis` (sales, collections, pending, inventory value, dead stock, delivery success, gross margin) with a 30-day sparkline.
- **Alert inbox** from `operational_alerts`: grouped by severity, filters for open/snoozed/resolved, actions Resolve / Snooze (1/3/7/30d) / Assign, and the "why it's back" reason using `reopened_from`, `last_signal_hash`, `last_seen_at`.
- **Run intelligence scan** button calling the existing `scan_operational_risks()` RPC, showing last scan time and counts.

### 2. Agents section
- **Daily Briefings tab**: list `agent_briefings` (date, source, summary) with an expandable per-agent output view from `agent_outputs` JSON.
- **Agent Settings card** (Settings page): edit `agent_settings` — briefing on/off, briefing time, timezone, enabled agents; show `last_briefing_at`.
- Note: briefings/settings will be **read + configure only** until the orchestrator edge functions are rebuilt (see step 5).

### 3. Telegram card in Settings
- Show link status from `telegram_links` (username, chat, linked at, active).
- "Link Telegram" flow: generate a code into `telegram_link_codes` and show it with expiry.
- Notification preference toggles stored in `telegram_links.notification_preferences`.
- Recent inbound messages (`telegram_messages`) as a small debug list for admins.
- Unlink / deactivate action.

### 4. System & audit visibility (Reports or Settings > System)
- **Event stream** from `system_events` (type, entity, processed flag, timestamp) with a "processed / unprocessed" filter.
- **Security log** from `security_audit_log` alongside the existing Audit Trail viewer, admin-only.
- **Supplier ↔ store mapping** table on the Suppliers page (`supplier_store_access`) so the 56 existing rows are manageable.
- **AI insights** table (`ai_insights`) rendered on the AI Insights page next to the generated ones, with the `generate_ai_insights()` RPC as a refresh action.

### 5. Rebuild the agent backend (needed for anything live)
- Re-create `agent-orchestrator` + department specialists (sales, inventory, purchases, finance) as edge functions writing to `agent_briefings`.
- Re-create the scheduled briefing trigger (`cron_check_briefings` already exists in the DB and expects it).
- Wire the assistant bubble to show which agents were consulted.

### 6. Also fix
- `inventory_snapshots` is empty — schedule/expose the existing `inventory-snapshot` function so Inventory Intelligence age analysis has history.

### Technical notes
- New hooks: `useOperationalAlerts`, `useBusinessKpis`, `useOperationalScores`, `useAgentBriefings`, `useAgentSettings`, `useTelegramLink`, `useSystemEvents`, `useSecurityAuditLog` — all store-scoped and financial-year aware where dated, 60s staleTime.
- No schema changes expected for steps 1–4; RLS/grants on these tables will be verified before wiring reads, and a migration added only if a read is blocked.
- Styling follows the existing Apple-minimal + master-detail patterns; mobile gets single-scroll sticky-header layouts.

### Suggested order
Step 1 (Mission Control) → Step 3 (Telegram settings) → Step 2 (Agents UI) → Step 4 (system/audit) → Step 5 (agent backend rebuild) → Step 6.
