import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an AI assistant for a furniture/manufacturing ERP application. You help users navigate the app, understand their business data, and answer questions about sales, inventory, payments, and suppliers.

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

## Response Guidelines
- Be concise and helpful
- Use bullet points and numbered steps for instructions
- When providing data, format numbers with commas (e.g., ₹1,23,456)
- Use Indian Rupee (₹) as the currency
- If you don't have enough data to answer, say so clearly
- Always reference the specific section of the app when giving navigation help
- When showing financial summaries, include totals and breakdowns where relevant`;

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

    // Load conversation history (last 20 messages)
    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Query business data based on message content
    const contextData = await queryBusinessData(supabase, message, store_id);

    // Build messages for AI
    const aiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (contextData) {
      aiMessages.push({
        role: "system",
        content: `Here is the current business data context for the user's store:\n\n${contextData}`,
      });
    }

    // Add conversation history
    if (history && history.length > 0) {
      for (const msg of history) {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiResult = await aiResponse.json();
    const assistantContent = aiResult.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    // Save assistant message
    await supabase.from("ai_messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: assistantContent,
      metadata: contextData ? { data_queried: true } : {},
    });

    return new Response(
      JSON.stringify({
        response: assistantContent,
        conversation_id: convId,
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
      .neq("delivery_status", "Cancelled");

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
      .neq("delivery_status", "Cancelled")
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

  // Inventory / stock data
  if (lower.match(/stock|inventory|item|product|low stock|out of stock/)) {
    const { data: lowStock } = await supabase
      .from("items")
      .select("name, quantity_available, selling_price")
      .eq("store_id", storeId)
      .lt("quantity_available", 5)
      .order("quantity_available", { ascending: true })
      .limit(10);

    const { data: allItems } = await supabase
      .from("items")
      .select("id, quantity_available")
      .eq("store_id", storeId);

    if (allItems) {
      const totalItems = allItems.length;
      const outOfStock = allItems.filter((i: any) => i.quantity_available <= 0).length;
      const lowStockCount = allItems.filter((i: any) => i.quantity_available > 0 && i.quantity_available < 5).length;

      let stockInfo = `📦 Inventory Summary:
- Total Items: ${totalItems}
- Out of Stock: ${outOfStock}
- Low Stock (< 5 units): ${lowStockCount}`;

      if (lowStock && lowStock.length > 0) {
        const lowStockList = lowStock.map((i: any) =>
          `  - ${i.name}: ${i.quantity_available} units`
        ).join("\n");
        stockInfo += `\n- Low stock items:\n${lowStockList}`;
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
