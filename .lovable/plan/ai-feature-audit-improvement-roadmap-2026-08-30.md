# AI Feature Audit & Improvement Roadmap

## Current AI features (verified from code)

| Feature | Where it lives | What it does today | Quality assessment |
|---------|---------------|--------------------|--------------------|
| **ERP Assistant** | Floating bubble (`AssistantBubble.tsx` → `AssistantChat.tsx`) | Chat with app/business questions. Uses keyword matching to guess which "agents" were consulted. Injects a small amount of sales/stock/purchase context based on the user’s message. | **Medium**. Helpful for navigation, but the "agents consulted" are faked by regex, not real specialist calls. |
| **Sales Forecast** | Dashboard AI Insights tab (`SalesForecastDashboard.tsx`) | Deterministic statistical engine (weighted moving average + linear trend + seasonality). No LLM. | **High for what it is**. Trustworthy because it is rule-based, but users may expect an LLM explanation. |
| **Smart Restocking** | AI Insights tab (`RestockingAdvisor.tsx`) | Edge function `restock-recommendations` suggests what to reorder. | **Medium**. Output quality depends on the prompt/data; no visible feedback loop. |
| **Sales Strategy** | AI Insights tab (`SalesStrategyDashboard.tsx`) | Edge function `sales-strategy` suggests pricing/clearance/bundle actions. | **Medium**. Same as restocking — insight without execution. |
| **Material Advisor** | BOM/customization flow (`useMaterialRecommendations`) | Edge function `material-advisor` recommends alternative materials. | **Low usage visibility**. Buried inside BOM; most users probably never see it. |
| **Agent Orchestrator + 4 Specialists** | Edge functions (`agent-orchestrator`, `agent-sales`, `agent-inventory`, `agent-purchases`, `agent-finance`) | Cron/manual runs generate an executive briefing by calling four department agents and synthesizing with an LLM. Stored in `agent_briefings`. | **Medium**. The architecture is correct, but the briefings are not surfaced clearly in the UI and the synthesis uses an older model. |
| **Mission Control / Operational Alerts** | `/command-center` (`CommandCenter.tsx`, `useCommandCenter.ts`) | Scans business data, creates/resolves/snoozes operational alerts, shows health scores and KPIs. | **High operational value**. The best-used AI feature today. |
| **Sales Intelligence** | `/sales?tab=intelligence` (`useSalesIntelligence.ts`) | Real-data salesperson leaderboard, co-selling pairs, AI business insights cards. | **High**. Now backed by real DB data and revenue splits. |
| **Telegram Daily Digest** | Edge function `telegram-daily-digest` | Morning factual report + evening LLM narrative. | **High**. Most polished AI touchpoint; owner-focused tone. |
| **MCP Integration** | Connector layer | Read-only MCP tools for stores, sales, inventory. | **Low adoption**. Exists but is not a daily user feature. |

## What is working well

1. **Mission Control is the star.** It gives the owner a single place to see what is broken, assign fixes, and track resolution.
2. **Sales Intelligence is now trustworthy** because it reads real `sales_orders` and salesperson splits.
3. **Telegram digest has the right voice** — factual in the morning, reflective in the evening.
4. **Agent architecture is sound** — an orchestrator plus four specialists is the right pattern for a multi-department ERP.

## What is holding the AI back

1. **The ERP Assistant lies about which agents it consulted.** It regex-matches words like "sales" and tags `agent-sales`, but it never actually calls the specialist functions. This is the biggest trust issue.
2. **No single AI memory.** The assistant, the agents, and the insights each live in separate tables and prompts. They do not learn from each other.
3. **AI Insights tab is visually isolated.** It uses a dark/slate theme (`bg-slate-900`) while the rest of the app is Apple-like minimal light. It feels like a different product.
4. **Agent briefings are invisible.** `agent_briefings` is populated by cron, but there is no obvious UI showing "today’s executive briefing".
5. **Insights do not turn into actions.** Restock and strategy recommendations are read-only; the user cannot click "create purchase order" or "apply discount" from the insight.
6. **Older models in some edge functions.** `agent-sales` and the orchestrator synthesis still use `gpt-4o-mini`; the ERP assistant uses `google/gemini-3-flash-preview`.
7. **No feedback loop.** Users cannot thumbs-up/down an AI answer or mark a recommendation as useful/wrong.
8. **No per-user AI preferences.** Every user sees the same assistant tone and the same alert thresholds.

## Proposed improvement roadmap

### Phase 1 — Fix trust and visibility (1–2 days)

1. **Make the ERP Assistant actually call specialists.**
   - When the user asks a business question, `erp-assistant` should invoke `agent-sales`, `agent-inventory`, `agent-purchases`, and/or `agent-finance` in parallel (using the existing internal service-role pattern).
   - Use the real outputs as context for the final answer, and only then populate `agents_consulted`.
   - Fall back to the current local SQL context if specialists fail or are slow.

2. **Surface the daily agent briefing.**
   - Add a "Daily Briefing" card at the top of `/command-center` showing the latest `agent_briefings` row for the selected store.
   - Add a "Run Briefing" button that calls `agent-orchestrator` manually.

3. **Unify the AI Insights visual style.**
   - Remove the dark/slate theme from `AIInsightsLayout.tsx` and use the same cards, badges, and light surfaces as the rest of the app.

### Phase 2 — Close the action loop (2–3 days)

4. **Turn recommendations into one-click actions.**
   - From a restock recommendation, add "Create Purchase Order" that pre-fills supplier + item + quantity.
   - From a sales strategy recommendation, add "Apply Discount" or "Create Promotion" that pre-fills the item and recommended price.
   - From a delivery alert, add "Call Customer" or "Reschedule Delivery".

5. **Add an AI feedback mechanism.**
   - Store thumbs-up/down on assistant messages, agent briefings, and operational insights.
   - Use feedback to rank which recommendations appear first.

### Phase 3 — Smarter memory and personalization (3–5 days)

6. **Build a shared AI context store.**
   - Create an `ai_context` table (store_id, key, value, source, expires_at).
   - Populate it from Mission Control scans, agent briefings, and user questions.
   - Feed the most relevant context into every assistant reply and every specialist prompt.

7. **Per-user AI preferences.**
   - Add `ai_user_preferences` (tone: concise/narrative, alert threshold, favorite metrics, language).
   - Respect these in the assistant, Telegram digest, and briefing synthesis.

### Phase 4 — Modernize models and add observability (2–3 days)

8. **Move LLM calls to current gateway models.**
   - ERP assistant, agent synthesis, and evening Telegram digest should use `openai/gpt-5.6-sol` via the Responses API with streaming/reasoning, or `openai/gpt-5.4-mini` for cheaper tasks.
   - Keep sales forecast deterministic; do not add an LLM to the math.

9. **Add AI observability.**
   - Log every AI call (model, latency, tokens, status, run id) to an `ai_gateway_logs` table.
   - Show a simple "AI Status" indicator in settings: last error, credit usage, average latency.

### Phase 5 — Proactive agentic behavior (future)

10. **Let agents take safe actions with approval.**
    - Propose but do not execute: "Mark 3 orders as delivered?", "Create PO for low-stock foam?", "Snooze this alert for 3 days?".
    - Require explicit user confirmation before any write.

## What this plan does not include

- No new flashy standalone AI pages. The goal is to make existing AI trustworthy and actionable.
- No BOM-related AI work (per your instruction to leave BOM for later).
- No changes to the deterministic sales forecast math, only to how its results are explained.

## Recommended first step

Start with **Phase 1 item 1**: make the ERP Assistant actually invoke the specialist agents. This is the highest-leverage fix because it repairs the most visible trust problem and reuses the edge functions you already have.
