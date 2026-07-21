

# AI Assistant (ERP Sidekick) — Implementation Plan

## Overview
Build a floating chat assistant that can answer questions about business data (sales, inventory, payments) and guide users through app workflows. Conversations are stored per user per tenant (store) in Supabase.

## Architecture

```text
┌─────────────────────────────────────┐
│  Floating Chat Bubble (bottom-right)│
│  ┌─────────────────────────────────┐│
│  │ Chat messages (scrollable)      ││
│  │ - User messages                 ││
│  │ - AI responses (markdown)       ││
│  ├─────────────────────────────────┤│
│  │ Input bar + Send button         ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
         │ sends messages
         ▼
┌─────────────────────────────────────┐
│  Edge Function: erp-assistant      │
│  1. Authenticate user (JWT)        │
│  2. Load conversation history      │
│  3. Query relevant business data   │
│  4. Build context-rich prompt      │
│  5. Call Lovable AI Gateway        │
│  6. Save assistant response        │
│  7. Return response                │
└─────────────────────────────────────┘
         │ reads/writes
         ▼
┌─────────────────────────────────────┐
│  Supabase Tables                   │
│  - ai_conversations (per user/store)│
│  - ai_messages (conversation log)  │
└─────────────────────────────────────┘
```

## Step 1: Database Tables

**`ai_conversations`** — one per user per store
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `store_id` (uuid, NOT NULL)
- `title` (text) — auto-generated from first message
- `created_at`, `updated_at`
- RLS: users see only their own conversations; scoped to store access

**`ai_messages`** — individual messages
- `id` (uuid, PK)
- `conversation_id` (uuid, FK → ai_conversations)
- `role` (text: 'user' | 'assistant')
- `content` (text)
- `metadata` (jsonb) — store data context used, query results, etc.
- `created_at`
- RLS: users see messages for their own conversations

## Step 2: Edge Function — `erp-assistant`

The core intelligence layer:

1. **Receive** user message + conversation_id + store_id
2. **Authenticate** via JWT, verify store access
3. **Load** last 20 messages from conversation for context
4. **Query business data** based on message intent using tool-calling:
   - Sales totals, monthly breakdowns, dues
   - Inventory levels, low stock items
   - Payment summaries, outstanding balances
   - Order counts by status
5. **Build system prompt** with:
   - App navigation knowledge (how to create sales, purchases, etc.)
   - Queried data context
   - User's role and store info
6. **Call Lovable AI Gateway** (google/gemini-3-flash-preview, non-streaming)
7. **Save** both user and assistant messages to `ai_messages`
8. **Return** the response

The system prompt will include structured knowledge about:
- How to navigate the app (step-by-step guides for sales, purchases, inventory)
- Current business metrics injected as context
- User's store and role for personalized responses

## Step 3: Frontend — Floating Chat Bubble

**New components:**
- `src/components/ai-assistant/AssistantBubble.tsx` — floating button (bottom-right)
- `src/components/ai-assistant/AssistantChat.tsx` — expandable chat panel
- `src/components/ai-assistant/ChatMessage.tsx` — individual message with markdown rendering

**New hook:**
- `src/hooks/useAssistantChat.ts` — manages conversations, sends messages, loads history

**Behavior:**
- Bubble icon in bottom-right corner, always visible
- Click to expand into a chat panel (~400px wide, ~500px tall)
- Messages rendered with `react-markdown` for formatted AI responses
- Loading indicator while waiting for response
- Conversation persists across page navigation
- Store selector context passed automatically

## Step 4: Data Query Strategy

The edge function will run targeted Supabase queries based on the user's question before calling the AI. Example data injections:

| User asks about | Data queried |
|---|---|
| "What are my sales this month?" | `sales_orders` filtered by date + store |
| "What's the outstanding due?" | `sale_payment_status` balances |
| "Which items are low on stock?" | `items` where qty < 5 |
| "How do I create a sale?" | Static knowledge (no query needed) |

The AI receives this data as context and formulates a natural language answer.

## Technical Details

- **AI Model**: google/gemini-3-flash-preview via Lovable AI Gateway
- **Auth**: JWT validation in edge function + `user_has_store_access` check
- **Storage**: Multi-tenant isolation via RLS on store_id + user_id
- **Message limit**: Send last 20 messages as context to avoid token limits
- **Markdown**: `react-markdown` for rendering AI responses
- **Config**: Add function to `supabase/config.toml`

## Files to Create/Modify

| Action | File |
|---|---|
| Create | `supabase/migrations/...` (ai_conversations, ai_messages tables) |
| Create | `supabase/functions/erp-assistant/index.ts` |
| Create | `src/components/ai-assistant/AssistantBubble.tsx` |
| Create | `src/components/ai-assistant/AssistantChat.tsx` |
| Create | `src/components/ai-assistant/ChatMessage.tsx` |
| Create | `src/hooks/useAssistantChat.ts` |
| Modify | `src/App.tsx` — add AssistantBubble to layout |
| Modify | `supabase/config.toml` — register edge function |

