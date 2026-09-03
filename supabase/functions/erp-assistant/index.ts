import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an AI assistant for a furniture/manufacturing ERP application. You help users navigate the app, understand their business data, and answer questions about sales, inventory, payments, suppliers, and materials.

## App Navigation Knowledge

### How to Create a Sales Order
1. Click "Sales" in the left sidebar
2. Click the "New Order" button (top-right)
3. Fill in customer details (name, phone, address)
4. Add items — search and select products, set quantity and price
5. Set delivery date if needed
6. Enter advance payment amount (optional)
7. Click "Create Order" to save

### How to Create a Quote
1. Go to "Sales" in the sidebar
2. Click "New Quote" button
3. Fill in the same details as an order
4. Quotes start as "Draft" — you can mark them as Sent, Accepted, or Rejected
5. Once accepted, convert to an order with one click

### How to Add Inventory / Items
1. Click "Inventory" in the left sidebar
2. Click "Add Item" button
3. Enter item name, cost price, selling price
4. Select category and supplier (optional)
5. Set initial stock quantity
6. Click "Save"

### How to Record a Purchase
1. Go to "Purchases" in the sidebar
2. Click "New Purchase"
3. Select supplier
4. Add items with quantities and costs
5. Enter invoice number and date
6. Click "Save" — stock will be updated automatically

### How to Record Payments
1. Go to "Payments" in the sidebar
2. Click "Record Payment"
3. Select the order or supplier
4. Enter amount, payment method, and date
5. Click "Save"

### How to Check Stock / Inventory Levels
1. Go to "Inventory" in the sidebar
2. View all items with current stock levels
3. Use the search bar to find specific items
4. Low stock items are highlighted with alerts

### How to View Reports
1. Click "Reports" in the sidebar
2. View sales trends, top-selling items, and financial summaries

### How to Manage Suppliers
1. Go to "Suppliers" in the sidebar
2. Add new suppliers or view existing ones
3. Click a supplier to see their purchase history and ledger

### How to Manage Materials (BOM)
1. Go to "Materials" in the sidebar for raw materials
2. Go to "BOM Management" to create Bills of Material
3. Link materials to finished products

## Specialist Agent Inputs
When "Department Specialist" briefs are provided below, use them as authoritative context. They are real outputs from the Sales, Inventory, Purchases, and Finance agents.

## Reorder & Restocking Rules
- When discussing restocking, reorders, or dead stock, quote ONLY the factual data provided by the reorder engine (actual units sold across 30d/90d/365d, orders count, last sale date, days since last sale, current stock vs open reserved demand, and supplier lead days).
- Never invent smooth daily velocity rates or fake weeks of cover. Demand in furniture retail is intermittent (lumpy).
- For items marked with "low confidence" (one-off sales or category fallback), explicitly state that they have insufficient history and advise manual review rather than automated purchase.
- Cite the engine's evidence sentences for auditability.

## Response Guidelines
- Be concise and helpful
- Use bullet points and numbered steps for instructions
- When providing data, format numbers with commas (e.g., ₹1,23,456)
- Use Indian Rupee (₹) as the currency
- If you don't have enough data to answer, say so clearly
- Always reference the specific section of the app when giving navigation help
- When showing financial summaries, include totals and breakdowns where relevant
- If a specialist agent failed, say so and rely on the local business data`;

const SPECIALISTS = [
  { name: "agent-sales", keywords: /sales|revenue|income|turnover|order|due|outstanding|balance|payment|paid|unpaid|receivable|customer/i },
  { name: "agent-inventory", keywords: /stock|inventory|item|product|low stock|out of stock|quantity|reorder|restock|dead stock/i },
  { name: "agent-purchases", keywords: /supplier|purchase|vendor|payable|buy|procurement|restock/i },
  { name: "agent-finance", keywords: /finance|cash|bank|money|expense|profit|margin|gst|tax|ledger|account/i },
];

const AGENT_LABELS: Record<string, string> = {
  "agent-sales": "Sales Agent",
  "agent-inventory": "Inventory Agent",
  "agent-purchases": "Purchases Agent",
  "agent-finance": "Finance Agent",
};

function pickSpecialists(message: string): string[] {
  const lower = message.toLowerCase();
  const matched = SPECIALISTS
    .filter((s) => s.keywords.test(lower))
    .map((s) => s.name);
  // If nothing matches, default to sales + finance for general business questions.
  return matched.length > 0 ? matched : ["agent-sales", "agent-finance"];
}

class AIGatewayError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function gatewayErrorMessage(status: number, body: string): string {
  if (status === 429) return "The AI assistant is receiving too many requests right now. Please wait a moment and try again.";
  if (status === 402) return "AI credits are exhausted. Please add credits in your Lovable workspace settings to keep using the assistant.";
  if (status === 403) return "AI access is blocked for this workspace. A workspace admin needs to enable Lovable AI or raise the credit limit.";
  if (status === 401) return "The AI assistant is not configured correctly (missing or invalid API key). Please contact your administrator.";
  if (status === 400) return "The AI assistant could not process this request. Please try rephrasing your question.";
  try {
    const parsed = JSON.parse(body);
    if (parsed?.error?.message) return `AI service error: ${parsed.error.message}`;
    if (parsed?.message) return `AI service error: ${parsed.message}`;
  } catch { /* ignore */ }
  return "The AI assistant is temporarily unavailable. Please try again in a moment.";
}

async function callLovableResponses(promptText: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new AIGatewayError(401, gatewayErrorMessage(401, ""));
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      instructions: SYSTEM_PROMPT,
      input: promptText,
      stream: true,
      reasoning: { effort: "medium", summary: "auto" },
      include: ["reasoning.encrypted_content"],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("AI gateway error:", res.status, text);
    throw new AIGatewayError(res.status, gatewayErrorMessage(res.status, text));
  }


  if (!res.body) {
    throw new Error("AI gateway returned empty body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  let reasoningSummary = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;
      try {
        const event = JSON.parse(data);
        if (event.type === "response.output_text.delta") {
          output += event.delta || "";
        } else if (event.type === "response.reasoning_summary_text.delta") {
          reasoningSummary += event.delta || "";
        }
      } catch {
        // Ignore malformed SSE lines
      }
    }
  }

  // Flush any remaining buffer
  if (buffer.trim().startsWith("data: ")) {
    const data = buffer.trim().slice(6);
    if (data !== "[DONE]") {
      try {
        const event = JSON.parse(data);
        if (event.type === "response.output_text.delta") {
          output += event.delta || "";
        } else if (event.type === "response.reasoning_summary_text.delta") {
          reasoningSummary += event.delta || "";
        }
      } catch {
        // ignore
      }
    }
  }

  return output.trim() || reasoningSummary.trim() || "I couldn't generate a response. Please try again.";
}

async function callSpecialist(name: string, storeId: string, supabaseUrl: string, serviceKey: string): Promise<string> {
  const url = `${supabaseUrl}/functions/v1/${name}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ store_id: storeId }),
    });
    if (!res.ok) {
      throw new Error(`Specialist ${name} HTTP error: ${res.status}`);
    }
    const data = await res.json();
    return data.output || "Analysis unavailable.";
  } catch (err) {
    console.error(`Error calling ${name}:`, err);
    return `**${AGENT_LABELS[name] || name}** was unable to provide a briefing.`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { message, conversation_id, store_id } = await req.json();

    if (!message || !store_id) {
      return new Response(JSON.stringify({ error: "message and store_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify store access
    const { data: storeAccess } = await supabase
      .from("user_store_access")
      .select("id")
      .eq("user_id", userId)
      .eq("store_id", store_id)
      .maybeSingle();

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const isAdmin = userRole?.role === "admin";

    if (!storeAccess && !isAdmin) {
      return new Response(JSON.stringify({ error: "No access to this store" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const { data: conv, error: convErr } = await supabase
        .from("ai_conversations")
        .insert({ user_id: userId, store_id, title: message.substring(0, 80) })
        .select("id")
        .single();

      if (convErr) throw convErr;
      convId = conv.id;
    }

    // Save user message
    await supabase.from("ai_messages").insert({
      conversation_id: convId,
      role: "user",
      content: message,
    });

    // Load conversation history (last 20 messages, excluding the one we just inserted)
    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => ({ data: data ? data.reverse() : data }));

    // Gather local business context
    const contextData = await queryBusinessData(supabase, message, store_id);

    // Decide which specialists to consult
    const agentsToCall = pickSpecialists(message);

    // Call selected specialists in parallel
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const specialistOutputs: Record<string, string> = {};
    const specialistResults = await Promise.all(
      agentsToCall.map(async (name) => {
        const output = await callSpecialist(name, store_id, supabaseUrl, serviceKey);
        return { name, output };
      })
    );
    for (const { name, output } of specialistResults) {
      specialistOutputs[name] = output;
    }

    // Build the user prompt for the final synthesis
    const historyText = (history || [])
      .map((msg: any) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n");

    const promptParts: string[] = [];
    if (historyText) {
      promptParts.push(`## Conversation History\n${historyText}`);
    }
    if (contextData) {
      promptParts.push(`## Local Business Data\n${contextData}`);
    }
    if (Object.keys(specialistOutputs).length > 0) {
      promptParts.push(
        `## Department Specialist Briefs\n` +
        Object.entries(specialistOutputs)
          .map(([name, output]) => `### ${AGENT_LABELS[name] || name}\n${output}`)
          .join("\n\n")
      );
    }
    promptParts.push(`## User Question\n${message}`);

    const promptText = promptParts.join("\n\n");

    let assistantContent: string;
    try {
      assistantContent = await callLovableResponses(promptText);
    } catch (err: any) {
      console.error("LLM synthesis failed:", err);
      const status = err instanceof AIGatewayError ? err.status : 503;
      const userMessage = err instanceof AIGatewayError
        ? err.message
        : "The AI assistant is temporarily unavailable. Please try again in a moment.";

      // Do NOT persist a raw data dump as an assistant answer — surface the failure.
      return new Response(
        JSON.stringify({ error: userMessage, conversation_id: convId }),
        {
          status: status === 401 || status === 400 ? 500 : status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }


    // Save assistant message
    await supabase.from("ai_messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: assistantContent,
      metadata: {
        data_queried: !!contextData,
        agents_consulted: agentsToCall,
      },
    });

    return new Response(
      JSON.stringify({
        response: assistantContent,
        conversation_id: convId,
        agents_consulted: agentsToCall,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("erp-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function queryBusinessData(supabase: any, message: string, storeId: string): Promise<string | null> {
  const lower = message.toLowerCase();
  const parts: string[] = [];

  // Detect date ranges
  const now = new Date();
  const monthNames = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  let targetMonth = now.getMonth();
  let targetYear = now.getFullYear();

  for (let i = 0; i < monthNames.length; i++) {
    if (lower.includes(monthNames[i]) || lower.includes(monthNames[i].substring(0, 3))) {
      targetMonth = i;
      if (i > now.getMonth()) targetYear = now.getFullYear() - 1;
      break;
    }
  }

  const monthStart = new Date(targetYear, targetMonth, 1).toISOString().split("T")[0];
  const monthEnd = new Date(targetYear, targetMonth + 1, 0).toISOString().split("T")[0];

  // Sales data
  if (lower.match(/sale|order|revenue|income|turnover/)) {
    const { data: sales } = await supabase
      .from("sales_orders")
      .select("id, order_number, total_amount, delivery_status, date, balance_due, customer_name, document_type")
      .eq("store_id", storeId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .not("delivery_status", "ilike", "cancelled");

    if (sales && sales.length > 0) {
      const totalRevenue = sales.filter((s: any) => s.document_type !== 'quote').reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
      const totalDue = sales.filter((s: any) => s.document_type !== 'quote').reduce((sum: number, s: any) => sum + (s.balance_due || 0), 0);
      const orderCount = sales.filter((s: any) => s.document_type !== 'quote').length;
      const delivered = sales.filter((s: any) => s.delivery_status === "delivered").length;
      const pending = sales.filter((s: any) => s.delivery_status === "Pending").length;

      parts.push(`📊 Sales Data (${monthNames[targetMonth]} ${targetYear}):
- Total Orders: ${orderCount}
- Total Revenue: ₹${totalRevenue.toLocaleString("en-IN")}
- Outstanding Dues: ₹${totalDue.toLocaleString("en-IN")}
- Delivered: ${delivered} | Pending: ${pending}`);
    }
  }

  // Due / payment data
  if (lower.match(/due|outstanding|balance|payment|paid|unpaid|receivable/)) {
    const { data: dues } = await supabase
      .from("sales_orders")
      .select("order_number, customer_name, total_amount, balance_due, date, delivery_status")
      .eq("store_id", storeId)
      .gt("balance_due", 0)
      .not("delivery_status", "ilike", "cancelled")
      .order("balance_due", { ascending: false })
      .limit(15);

    if (dues && dues.length > 0) {
      const totalDue = dues.reduce((sum: number, d: any) => sum + (d.balance_due || 0), 0);
      const topDues = dues.slice(0, 5).map((d: any) =>
        `  - ${d.order_number}: ${d.customer_name || "N/A"} — ₹${(d.balance_due || 0).toLocaleString("en-IN")}`
      ).join("\n");

      parts.push(`💰 Outstanding Dues:
- Total Outstanding: ₹${totalDue.toLocaleString("en-IN")}
- Number of orders with dues: ${dues.length}
- Top outstanding orders:
${topDues}`);
    }
  }

  // Inventory / stock / reorder data
  if (lower.match(/stock|inventory|item|product|low stock|out of stock|reorder|restock|dead stock/)) {
    const { data: allItems } = await supabase
      .from("items")
      .select("id, quantity_available")
      .eq("store_id", storeId);

    // Call factual reorder intelligence RPC
    const { data: reorderRows } = await supabase.rpc("get_reorder_intelligence", {
      _store_id: storeId,
      _window_days: 365,
    });

    if (allItems || reorderRows) {
      const totalItems = allItems?.length || 0;
      const outOfStock = allItems?.filter((i: any) => i.quantity_available <= 0).length || 0;
      const lowStockCount = allItems?.filter((i: any) => i.quantity_available > 0 && i.quantity_available < 5).length || 0;

      const rRows = reorderRows || [];
      const urgentReorders = rRows.filter((r: any) => r.decision === "reorder_now" && r.confidence !== "low");
      const reorderSoon = rRows.filter((r: any) => r.decision === "reorder_soon");
      const deadStock = rRows.filter((r: any) => r.decision === "dead_stock");
      const neverSold = rRows.filter((r: any) => r.decision === "never_sold");
      const lowConf = rRows.filter((r: any) => r.confidence === "low");

      const deadValue = deadStock.reduce((s: number, r: any) => s + (Number(r.stock_value) || 0), 0);
      const neverSoldValue = neverSold.reduce((s: number, r: any) => s + (Number(r.stock_value) || 0), 0);

      let stockInfo = `📦 Inventory & Factual Reorder Intelligence:
- Total Catalog Items: ${totalItems} (Out of Stock: ${outOfStock}, Low Stock <5: ${lowStockCount})
- Urgent Reorders (High/Med Confidence): ${urgentReorders.length} items
- Reorder Soon: ${reorderSoon.length} items
- Dead Stock (>180d no sales): ${deadStock.length} items with ₹${Math.round(deadValue).toLocaleString("en-IN")} locked
- Never Sold Stock: ${neverSold.length} items with ₹${Math.round(neverSoldValue).toLocaleString("en-IN")} locked
- Low Confidence Items (requires manual review): ${lowConf.length} items`;

      if (urgentReorders.length > 0) {
        const topUrgent = urgentReorders.slice(0, 5).map((r: any) =>
          `  - ${r.item_name}: ${r.current_stock} in stock ${r.open_demand > 0 ? `(${r.open_demand} reserved)` : ''} — need ${r.suggested_qty} pcs. Evidence: "${r.evidence_sentence}"`
        ).join("\n");
        stockInfo += `\n- Top Urgent Reorder Recommendations:\n${topUrgent}`;
      }

      if (deadStock.length > 0) {
        const topDead = deadStock.slice(0, 3).map((r: any) =>
          `  - ${r.item_name}: ${r.current_stock} in stock (₹${Math.round(r.stock_value).toLocaleString("en-IN")} locked, last sold ${r.days_since_last_sale || '180+'}d ago)`
        ).join("\n");
        stockInfo += `\n- Dead Stock Examples:\n${topDead}`;
      }

      parts.push(stockInfo);
    }
  }

  // Supplier / purchase data
  if (lower.match(/supplier|purchase|vendor|payable/)) {
    const { data: purchases } = await supabase
      .from("purchases")
      .select("id, total_cost, date, supplier_id")
      .eq("store_id", storeId)
      .gte("date", monthStart)
      .lte("date", monthEnd);

    if (purchases && purchases.length > 0) {
      const totalPurchases = purchases.reduce((sum: number, p: any) => sum + (p.total_cost || 0), 0);
      parts.push(`🏭 Purchase Data (${monthNames[targetMonth]} ${targetYear}):
- Total Purchases: ${purchases.length}
- Total Amount: ₹${totalPurchases.toLocaleString("en-IN")}`);
    }
  }

  // Materials data
  if (lower.match(/material|raw material|bom/)) {
    const { data: materials } = await supabase
      .from("materials")
      .select("name, quantity_available, unit, cost_price")
      .eq("store_id", storeId)
      .lt("quantity_available", 5)
      .order("quantity_available", { ascending: true })
      .limit(10);

    if (materials && materials.length > 0) {
      const matList = materials.map((m: any) =>
        `  - ${m.name}: ${m.quantity_available} ${m.unit || "units"}`
      ).join("\n");

      parts.push(`🧱 Low Stock Materials:\n${matList}`);
    }
  }

  return parts.length > 0 ? parts.join("\n\n") : null;
}
