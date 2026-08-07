import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

import { authorizeAgentRequest, corsHeaders, denied } from "../_shared/agentAuth.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

type Mode = "morning" | "evening";

/* ------------------------------------------------------------------ utils */

const inr = (n: number) => {
  const v = Math.round(Number(n) || 0);
  return "₹" + v.toLocaleString("en-IN");
};

/** YYYY-MM-DD in the given timezone, offset by whole days. */
function localDate(tz: string, offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function prettyDate(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${iso}T12:00:00Z`));
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Logs row counts / errors so a zero is verifiably a real zero. */
function check(label: string, error: unknown, rows: unknown[] | null) {
  if (error) {
    console.error(`[digest] ${label} FAILED:`, JSON.stringify(error));
    return;
  }
  console.log(`[digest] ${label}: ${rows?.length ?? 0} rows`);
}

/* ------------------------------------------------------------- data layer */

interface DayFacts {
  date: string;
  salesValue: number;
  orderCount: number;
  grossMargin: number;
  collected: number;
  collectedByMethod: Record<string, number>;
  paidOut: number;
  purchaseValue: number;
  newQuotes: number;
  deliveriesDone: number;
}

async function getDayFacts(
  db: ReturnType<typeof createClient>,
  storeId: string,
  day: string,
): Promise<DayFacts> {
  const { data: orders, error: ordersErr } = await db
    .from("sales_orders")
    .select("id,total_amount,delivery_status,document_type,date")
    .eq("store_id", storeId)
    .eq("date", day);
  check(`orders ${day}`, ordersErr, orders);

  const live = (orders || []).filter(
    (o: any) =>
      (o.document_type ?? "order") === "order" &&
      String(o.delivery_status ?? "").toLowerCase() !== "cancelled",
  );
  const salesValue = live.reduce((s: number, o: any) => s + num(o.total_amount), 0);
  const orderIds = live.map((o: any) => o.id);

  let cost = 0;
  if (orderIds.length) {
    const { data: lines, error: linesErr } = await db
      .from("sales_order_items")
      .select("quantity,total_price,items(cost_price)")
      .in("order_id", orderIds);
    check(`order items ${day}`, linesErr, lines);
    cost = (lines || []).reduce(
      (s: number, l: any) => s + num(l.items?.cost_price) * num(l.quantity),
      0,
    );
  }

  const { data: quotes, error: quotesErr } = await db
    .from("sales_orders")
    .select("id")
    .eq("store_id", storeId)
    .eq("date", day)
    .eq("document_type", "quote");
  check(`quotes ${day}`, quotesErr, quotes);

  const { data: pays, error: paysErr } = await db
    .from("payments")
    .select("amount,type,payment_method")
    .eq("store_id", storeId)
    .eq("date", day);
  check(`payments ${day}`, paysErr, pays);

  const receipts = (pays || []).filter((p: any) => String(p.type) === "Receipt");
  const outgoing = (pays || []).filter((p: any) => String(p.type) !== "Receipt");
  const collectedByMethod: Record<string, number> = {};
  for (const p of receipts) {
    const key = String((p as any).payment_method || "cash");
    collectedByMethod[key] = (collectedByMethod[key] || 0) + num((p as any).amount);
  }

  const { data: purch, error: purchErr } = await db
    .from("purchases")
    .select("total_cost")
    .eq("store_id", storeId)
    .eq("date", day);
  check(`purchases ${day}`, purchErr, purch);

  const { data: matPurch, error: matPurchErr } = await db
    .from("material_purchases")
    .select("total_cost")
    .eq("store_id", storeId)
    .eq("date", day);
  check(`material purchases ${day}`, matPurchErr, matPurch);

  const { data: delivered, error: deliveredErr } = await db
    .from("sales_orders")
    .select("id")
    .eq("store_id", storeId)
    .eq("delivery_date", day)
    .ilike("delivery_status", "delivered");
  check(`deliveries done ${day}`, deliveredErr, delivered);

  return {
    date: day,
    salesValue,
    orderCount: live.length,
    grossMargin: salesValue - cost,
    collected: receipts.reduce((s: number, p: any) => s + num(p.amount), 0),
    collectedByMethod,
    paidOut: outgoing.reduce((s: number, p: any) => s + num(p.amount), 0),
    purchaseValue:
      (purch || []).reduce((s: number, p: any) => s + num(p.total_cost), 0) +
      (matPurch || []).reduce((s: number, p: any) => s + num(p.total_cost), 0),
    newQuotes: (quotes || []).length,
    deliveriesDone: (delivered || []).length,
  };
}

interface Standing {
  receivables: number;
  topDebtor: { name: string; amount: number } | null;
  payables: number;
  bankBalance: number;
  stockValue: number;
  zeroStockCount: number;
  negativeStockCount: number;
  deliveriesToday: Array<{ order: string; customer: string; balance: number }>;
  overdueDeliveries: number;
  openQuotes: number;
  pendingProduction: number;
  topAlert: { title: string; message: string } | null;
  avg7daySales: number;
}

async function getStanding(
  db: ReturnType<typeof createClient>,
  storeId: string,
  today: string,
  tz: string,
): Promise<Standing> {
  const { data: openOrders, error: openErr } = await db
    .from("sales_orders")
    .select(
      "order_number,customer_name,balance_due,delivery_status,delivery_date,document_type,quote_status,workflow_state",
    )
    .eq("store_id", storeId);
  check("open orders", openErr, openOrders);

  const rows = openOrders || [];
  const realOrders = rows.filter(
    (o: any) =>
      (o.document_type ?? "order") === "order" &&
      String(o.delivery_status ?? "").toLowerCase() !== "cancelled",
  );

  const receivables = realOrders.reduce(
    (s: number, o: any) => s + Math.max(0, num(o.balance_due)),
    0,
  );

  const debtors = realOrders
    .filter((o: any) => num(o.balance_due) > 0)
    .sort((a: any, b: any) => num(b.balance_due) - num(a.balance_due));
  const topDebtor = debtors.length
    ? {
        name: debtors[0].customer_name || "Unnamed customer",
        amount: num(debtors[0].balance_due),
      }
    : null;

  const pendingDelivery = realOrders.filter(
    (o: any) => String(o.delivery_status ?? "").toLowerCase() !== "delivered",
  );
  const deliveriesToday = pendingDelivery
    .filter((o: any) => o.delivery_date === today)
    .slice(0, 5)
    .map((o: any) => ({
      order: o.order_number,
      customer: o.customer_name || "—",
      balance: Math.max(0, num(o.balance_due)),
    }));
  const overdueDeliveries = pendingDelivery.filter(
    (o: any) => o.delivery_date && o.delivery_date < today,
  ).length;

  const openQuotes = rows.filter(
    (o: any) =>
      o.document_type === "quote" &&
      ["draft", "sent"].includes(String(o.quote_status ?? "").toLowerCase()),
  ).length;

  const pendingProduction = pendingDelivery.filter(
    (o: any) => !o.delivery_date || o.delivery_date >= today,
  ).length;

  const { data: ledger, error: ledgerErr } = await db
    .from("supplier_ledger")
    .select("debit_amount,credit_amount")
    .eq("store_id", storeId);
  check("supplier ledger", ledgerErr, ledger);
  const payables = (ledger || []).reduce(
    (s: number, r: any) => s + num(r.credit_amount) - num(r.debit_amount),
    0,
  );

  const { data: banks, error: bankErr } = await db
    .from("bank_accounts")
    .select("current_balance,is_active")
    .eq("store_id", storeId);
  check("bank accounts", bankErr, banks);
  const bankBalance = (banks || [])
    .filter((b: any) => b.is_active !== false)
    .reduce((s: number, b: any) => s + num(b.current_balance), 0);

  const { data: items, error: itemsErr } = await db
    .from("items")
    .select("quantity_available,cost_price,is_discontinued")
    .eq("store_id", storeId);
  check("items", itemsErr, items);
  const liveItems = (items || []).filter((i: any) => i.is_discontinued !== true);
  const stockValue = liveItems.reduce(
    (s: number, i: any) => s + num(i.quantity_available) * num(i.cost_price),
    0,
  );
  const zeroStockCount = liveItems.filter((i: any) => num(i.quantity_available) === 0).length;
  const negativeStockCount = liveItems.filter((i: any) => num(i.quantity_available) < 0).length;

  const { data: alerts, error: alertsErr } = await db
    .from("operational_alerts")
    .select("title,message,priority_score,status,snoozed_until")
    .eq("store_id", storeId)
    .eq("status", "open")
    .order("priority_score", { ascending: false })
    .limit(5);
  check("alerts", alertsErr, alerts);
  const nowIso = new Date().toISOString();
  const liveAlert = (alerts || []).find(
    (a: any) => !a.snoozed_until || a.snoozed_until < nowIso,
  );
  const topAlert = liveAlert
    ? { title: (liveAlert as any).title, message: (liveAlert as any).message }
    : null;

  // Trailing 7 days (excluding today) average sales
  const from = localDate(tz, -7);
  const { data: recent, error: recentErr } = await db
    .from("sales_orders")
    .select("total_amount,date,delivery_status,document_type")
    .eq("store_id", storeId)
    .gte("date", from)
    .lt("date", today);
  check("trailing 7d sales", recentErr, recent);
  const trailingTotal = (recent || [])
    .filter(
      (o: any) =>
        (o.document_type ?? "order") === "order" &&
        String(o.delivery_status ?? "").toLowerCase() !== "cancelled",
    )
    .reduce((s: number, o: any) => s + num(o.total_amount), 0);

  return {
    receivables,
    topDebtor,
    payables,
    bankBalance,
    stockValue,
    zeroStockCount,
    negativeStockCount,
    deliveriesToday,
    overdueDeliveries,
    openQuotes,
    pendingProduction,
    topAlert,
    avg7daySales: trailingTotal / 7,
  };
}

/* ---------------------------------------------------------------- writing */

function buildMorning(
  storeName: string,
  tz: string,
  yesterday: DayFacts,
  today: string,
  s: Standing,
): string {
  const L: string[] = [];
  L.push(`☀️ *Good morning — ${storeName}*`);
  L.push(`Here is how yesterday (${prettyDate(yesterday.date, tz)}) closed.`);
  L.push("");

  L.push("*Yesterday's business*");
  if (yesterday.orderCount === 0) {
    L.push("• No orders were booked yesterday.");
  } else {
    L.push(
      `• Sales: ${inr(yesterday.salesValue)} across ${yesterday.orderCount} order${
        yesterday.orderCount === 1 ? "" : "s"
      }`,
    );
    L.push(`• Margin on what was sold: ${inr(yesterday.grossMargin)}`);
  }
  const methods = Object.entries(yesterday.collectedByMethod)
    .map(([m, v]) => `${m} ${inr(v)}`)
    .join(", ");
  L.push(
    `• Money collected: ${inr(yesterday.collected)}${methods ? ` (${methods})` : ""}`,
  );
  if (yesterday.newQuotes > 0) L.push(`• New quotes raised: ${yesterday.newQuotes}`);
  if (yesterday.deliveriesDone > 0)
    L.push(`• Deliveries completed: ${yesterday.deliveriesDone}`);
  if (yesterday.purchaseValue > 0)
    L.push(`• Purchases booked: ${inr(yesterday.purchaseValue)}`);
  L.push("");

  L.push("*Money (as of now)*");
  L.push(`• To collect from customers: ${inr(s.receivables)}`);
  if (s.topDebtor)
    L.push(`• Largest pending: ${s.topDebtor.name} — ${inr(s.topDebtor.amount)}`);
  L.push(
    s.payables >= 0
      ? `• Owed to suppliers: ${inr(s.payables)}`
      : `• Advance sitting with suppliers: ${inr(-s.payables)}`,
  );
  L.push(`• Bank balance: ${inr(s.bankBalance)}`);
  L.push(`• Stock on hand: ${inr(s.stockValue)}`);
  L.push("");

  L.push(`*Today's plan (${prettyDate(today, tz)})*`);
  if (s.deliveriesToday.length === 0) {
    L.push("• No deliveries scheduled for today.");
  } else {
    for (const d of s.deliveriesToday) {
      L.push(
        `• Deliver ${d.order} — ${d.customer}${
          d.balance > 0 ? ` (collect ${inr(d.balance)} on delivery)` : ""
        }`,
      );
    }
  }
  if (s.overdueDeliveries > 0)
    L.push(`• ${s.overdueDeliveries} delivery(s) already past their promised date`);
  if (s.pendingProduction > 0)
    L.push(`• ${s.pendingProduction} order(s) still waiting to be made or dispatched`);
  if (s.openQuotes > 0) L.push(`• ${s.openQuotes} quote(s) awaiting a customer decision`);
  L.push("");

  L.push("*One thing to fix today*");
  if (s.topAlert) {
    L.push(`• ${s.topAlert.title} — ${s.topAlert.message}`);
  } else if (s.negativeStockCount > 0) {
    L.push(`• ${s.negativeStockCount} item(s) show negative stock — check the entries.`);
  } else if (s.topDebtor) {
    L.push(`• Call ${s.topDebtor.name} for ${inr(s.topDebtor.amount)}.`);
  } else {
    L.push("• Nothing urgent flagged. Push quotes and deliveries.");
  }

  return L.join("\n");
}

function eveningFacts(
  storeName: string,
  tz: string,
  today: DayFacts,
  tomorrow: string,
  s: Standing,
): string {
  const vsUsual =
    s.avg7daySales > 0
      ? `${Math.round((today.salesValue / s.avg7daySales) * 100)}% of the usual day (7-day average ${inr(
          s.avg7daySales,
        )})`
      : "no comparable history yet";

  return [
    `Store: ${storeName}`,
    `Date: ${prettyDate(today.date, tz)}`,
    `Sales today: ${inr(today.salesValue)} from ${today.orderCount} order(s)`,
    `Margin on today's sales: ${inr(today.grossMargin)}`,
    `Today vs usual: ${vsUsual}`,
    `Cash/bank collected today: ${inr(today.collected)}`,
    `Paid out today: ${inr(today.paidOut)} (purchases booked ${inr(today.purchaseValue)})`,
    `Net movement today: ${inr(today.collected - today.paidOut)}`,
    `Bank balance now: ${inr(s.bankBalance)}`,
    `Still to collect from customers: ${inr(s.receivables)}${
      s.topDebtor ? ` (largest: ${s.topDebtor.name} ${inr(s.topDebtor.amount)})` : ""
    }`,
    s.payables >= 0
      ? `Owed to suppliers: ${inr(s.payables)}`
      : `Advance already paid to suppliers (nothing owed): ${inr(-s.payables)}`,
    `Stock on hand: ${inr(s.stockValue)}; ${s.zeroStockCount} item(s) at zero, ${s.negativeStockCount} negative`,
    `Deliveries completed today: ${today.deliveriesDone}`,
    `Deliveries past promised date: ${s.overdueDeliveries}`,
    `Orders waiting to be made or dispatched: ${s.pendingProduction}`,
    `Quotes awaiting customer decision: ${s.openQuotes}`,
    `New quotes raised today: ${today.newQuotes}`,
    `Deliveries lined up for tomorrow (${prettyDate(tomorrow, tz)}): ${
      s.deliveriesToday.length === 0
        ? "none scheduled"
        : s.deliveriesToday
            .map((d) => `${d.order} ${d.customer}${d.balance > 0 ? ` collect ${inr(d.balance)}` : ""}`)
            .join("; ")
    }`,
    `Top open alert: ${s.topAlert ? `${s.topAlert.title} — ${s.topAlert.message}` : "none"}`,
  ].join("\n");
}

const EVENING_SYSTEM = `You are the trusted right hand of a furniture shop owner in India, writing his end-of-day note on Telegram at 10 PM.

Write as if you spent the day in his shop and are telling him how it went. Speak to him as "you". Short sentences. Plain words, no jargon, no corporate phrasing, no words like "leverage", "KPI", "receivables ageing". Use ₹ with Indian comma style exactly as given in the facts. Never invent a number that is not in the facts.

Structure the message with these Telegram-Markdown sections, in order:
🌙 *Closing note — <store name>* on the first line, then the date line.
*Did we make money today?* — sales, margin, and how the day compares with a usual day. Say it plainly when the day was quiet; do not manufacture urgency or drama.
*Cash in, cash out* — what came in, what went out, where the money stands now.
*What's stuck* — orders not moving, deliveries past their date, money customers still owe. Name the biggest one.
*Tomorrow's first move* — 2 or 3 concrete things to do when the shutter opens, in order of priority.
*One line from me* — a single honest, human sentence: encouragement on a good day, a straight warning on a bad one.

Keep the whole message under 220 words. No preamble, no sign-off, no emojis other than the ones specified.`;

async function composeEvening(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        instructions: EVENING_SYSTEM,
        input: prompt,
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
      }),
    });

    if (!res.ok || !res.body) {
      console.error("[digest] AI gateway error", res.status, await res.text());
      return null;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let out = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const block of parts) {
        for (const line of block.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
              out += evt.delta;
            } else if (evt.type === "response.completed" && !out) {
              out = evt.response?.output_text ?? "";
            }
          } catch {
            /* partial frame, ignore */
          }
        }
      }
    }

    return out.trim() || null;
  } catch (err) {
    console.error("[digest] composeEvening failed:", err);
    return null;
  }
}

function fallbackEvening(storeName: string, tz: string, today: DayFacts, s: Standing) {
  const L: string[] = [];
  L.push(`🌙 *Closing note — ${storeName}*`);
  L.push(prettyDate(today.date, tz));
  L.push("");
  L.push("*Did we make money today?*");
  L.push(
    today.orderCount === 0
      ? "No orders today. A quiet day on the floor."
      : `${inr(today.salesValue)} sold across ${today.orderCount} order(s), margin ${inr(today.grossMargin)}.`,
  );
  L.push("");
  L.push("*Cash in, cash out*");
  L.push(`In ${inr(today.collected)}, out ${inr(today.paidOut)}. Bank now ${inr(s.bankBalance)}.`);
  L.push("");
  L.push("*What's stuck*");
  L.push(
    `${inr(s.receivables)} still to collect${
      s.topDebtor ? `, biggest is ${s.topDebtor.name} at ${inr(s.topDebtor.amount)}` : ""
    }. ${s.overdueDeliveries} delivery(s) past date, ${s.pendingProduction} order(s) waiting.`,
  );
  L.push("");
  L.push("*Tomorrow's first move*");
  L.push(
    s.deliveriesToday.length
      ? s.deliveriesToday.map((d) => `• ${d.order} — ${d.customer}`).join("\n")
      : "• Chase pending payments and follow up on open quotes.",
  );
  return L.join("\n");
}

/* --------------------------------------------------------------- delivery */

async function sendTelegram(chatId: number, text: string) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const telegramKey = Deno.env.get("TELEGRAM_API_KEY");
  if (!lovableKey || !telegramKey) {
    throw new Error("LOVABLE_API_KEY or TELEGRAM_API_KEY is not configured");
  }

  const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": telegramKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`[digest] telegram send failed [${res.status}]: ${body}`);
    return false;
  }
  try {
    const parsed = JSON.parse(body);
    if (parsed.ok === false) {
      console.error(`[digest] telegram rejected: ${body}`);
      return false;
    }
  } catch {
    /* ignore */
  }
  return true;
}

/* ------------------------------------------------------------------ entry */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode: Mode = body.mode === "evening" ? "evening" : "morning";
    const requestedStore: string | undefined = body.store_id;

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalSecret = req.headers.get("X-Internal-Secret");
    const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    let internal = false;
    if (internalSecret) {
      const { data: expected, error } = await db.rpc("get_edge_internal_secret");
      if (error) console.error("[digest] get_edge_internal_secret failed:", error);
      internal = !!expected && internalSecret === expected;
      if (!internal) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const auth = await authorizeAgentRequest(req, requestedStore);
      if (!auth.ok) return denied(auth);
      internal = auth.internal;
      if (!internal && !requestedStore) {
        return new Response(JSON.stringify({ error: "store_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Which stores to digest
    let storeIds: string[] = [];
    if (requestedStore) {
      storeIds = [requestedStore];
    } else {
      const { data: settings, error } = await db
        .from("agent_settings")
        .select("store_id")
        .eq("briefing_enabled", true);
      check("agent settings", error, settings);
      storeIds = (settings || []).map((s: any) => s.store_id);
    }

    if (storeIds.length === 0) {
      return new Response(
        JSON.stringify({ status: "skipped", message: "No stores with briefings enabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const results: unknown[] = [];

    for (const storeId of storeIds) {
      const { data: settingRow } = await db
        .from("agent_settings")
        .select("briefing_timezone")
        .eq("store_id", storeId)
        .maybeSingle();
      const tz = (settingRow as any)?.briefing_timezone || "Asia/Kolkata";

      const { data: store } = await db
        .from("stores")
        .select("name")
        .eq("id", storeId)
        .maybeSingle();
      const storeName = (store as any)?.name || "Your store";

      const today = localDate(tz, 0);
      const yesterday = localDate(tz, -1);
      const tomorrow = localDate(tz, 1);

      let text: string;

      if (mode === "morning") {
        const facts = await getDayFacts(db, storeId, yesterday);
        const standing = await getStanding(db, storeId, today, tz);
        text = buildMorning(storeName, tz, facts, today, standing);
      } else {
        const facts = await getDayFacts(db, storeId, today);
        // Standing for the evening note is anchored on tomorrow so
        // "deliveries lined up" means tomorrow's deliveries.
        const standing = await getStanding(db, storeId, tomorrow, tz);
        const prompt = eveningFacts(storeName, tz, facts, tomorrow, standing);
        console.log(`[digest] evening facts for ${storeId}:\n${prompt}`);
        const composed = lovableKey ? await composeEvening(prompt, lovableKey) : null;
        text = composed || fallbackEvening(storeName, tz, facts, standing);

        // Keep the Command Center showing exactly what the owner received.
        const { error: briefErr } = await db.from("agent_briefings").insert({
          store_id: storeId,
          generated_for_date: today,
          summary: text,
          source: internal ? "scheduled" : "manual",
          agent_outputs: { mode: "evening", facts: prompt },
        });
        if (briefErr) console.error("[digest] briefing insert failed:", briefErr);

        await db
          .from("agent_settings")
          .update({ last_briefing_at: new Date().toISOString() })
          .eq("store_id", storeId);
      }

      const { data: links, error: linksErr } = await db
        .from("telegram_links")
        .select("chat_id,notification_preferences")
        .eq("store_id", storeId)
        .eq("is_active", true);
      check("telegram links", linksErr, links);

      let sent = 0;
      for (const link of links || []) {
        const ok = await sendTelegram(Number((link as any).chat_id), text);
        if (ok) sent += 1;
      }

      results.push({ store_id: storeId, mode, recipients: sent, chars: text.length });
    }

    return new Response(JSON.stringify({ status: "completed", results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("telegram-daily-digest error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
