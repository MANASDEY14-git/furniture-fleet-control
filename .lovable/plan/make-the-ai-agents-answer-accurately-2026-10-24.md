# Make the AI agents answer accurately

## What is wrong today (confirmed in the code and live data)

1. **The agents never read the question.** Each department agent (Sales, Finance, Inventory, Purchases) writes the same canned 2–3 sentence "executive briefing" every time, whatever the user asked. Asking "what is the total due from customers?" makes the Sales agent describe last month's sales instead.
2. **The Sales agent has no dues data at all.** It only loads the last 30 days of orders and never adds up money still owed.
3. **Finance's "due" total is wrong.** It counts quotes and cancelled orders. For BIJOY FURNISHERS it would say ₹2,41,000 when the real amount owed is ₹1,50,000.
4. **The assistant's own dues total is cut off.** It adds up only the 15 largest unpaid orders, so the total is too low once a store has more than 15.
5. **Sales figures only cover the current month.** "This year", "last week" or a date range all fall back to one month.
6. **The department agents ask for a model by a name the AI service may not recognise.** When that call fails, the agent quietly falls back to a raw stats sentence, and the user never learns it failed.
7. **Agents are picked by keyword matching.** A word like "balance" or "account" calls the wrong agent, while questions about deliveries, follow-ups or credit limits call none of them.

## What we will build

**One trustworthy set of figures, shared by every agent.** One secure "business facts" layer in the database supplies every number an agent quotes. It covers: total due (orders only, not cancelled), the dues split by age bucket and by customer, sales for any date range, cash and bank balances, supplier payables, stock and low stock, reorder suggestions, pending deliveries and overdue follow-ups. The numbers match the Collections, Dispatch and Reorder pages exactly.

**Agents that answer the actual question.** The assistant uses tools: it decides which facts it needs, such as "get total receivables" or "get sales between dates", fetches them, then answers from them. Keyword routing goes away. Each department agent keeps its own focus (Sales, Inventory, Purchases, Finance) but gets the user's question and the matching facts.

**Strict honesty rules.**
- Every number in a reply must come from a fact it fetched. No estimates presented as facts.
- Every reply says the period and the store, e.g. "BIJOY FURNISHERS, all open orders as of today".
- If a fact cannot be fetched, the reply says so plainly instead of guessing.
- Quotes and cancelled orders never count towards sales or dues.

**Visible evidence in the chat.** Each answer has a small "Based on" section that you can open to see which figures were used. Users can check any number against the app.

**Morning briefings and Mission Control** use the same facts, so a briefing, the chat and the pages never disagree.

## Accuracy check before release

A fixed set of about 25 real questions, each checked against figures calculated directly from the database. For example: "total due from customers", "who owes the most", "sales this month vs last month", "what is low on stock", "how much do we owe suppliers", "which deliveries are late", "cash in bank". Each one runs for BIJOY FURNISHERS and BIJOY&CHARU FURNISHERS. Release only when every answer matches.

## Out of scope
- GST and BOM questions.
- Anything that changes data. Agents stay read-only in this round.

## Technical details
- New `SECURITY DEFINER` RPCs, each scoped by store and access-checked with `user_has_store_access` and role rules for financial data. Covered: `ai_get_receivables`, `ai_get_sales_summary(from, to)`, `ai_get_cash_position`, `ai_get_payables`, `ai_get_stock_status`, `ai_get_deliveries`, `ai_get_followups`. They reuse the existing `get_receivables_aging`, `get_reorder_intelligence`, `get_dispatch_board` and `get_followup_worklist` where those exist. EXECUTE goes to `authenticated` and `service_role` only.
- `erp-assistant` is rewritten to use AI SDK `streamText` with tools (`stopWhen: stepCountIs(50)`) through the Lovable AI Gateway. It drops the regex `queryBusinessData` / `pickSpecialists` and passes the user's question to the tools. Tool results are recorded on the stored message so the "Based on" view can show them.
- `agent-sales/finance/inventory/purchases` are repointed to the shared RPCs. They are given a correct gateway model id with error surfacing, and accept an optional `question`. The orchestrator briefing reuses them.
- A Deno test file in `erp-assistant` runs the 25-question accuracy check against SQL-computed expected values.
