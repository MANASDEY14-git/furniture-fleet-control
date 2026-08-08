/**
 * Single source of truth for "does this order count?".
 *
 * A cancelled order must never contribute to revenue, margin, collections,
 * receivables or customer balances. Status casing is inconsistent in the data
 * (`Delivered` and `delivered` both exist), so every check here is
 * case-insensitive.
 */

export const isCancelledOrder = (order: { delivery_status?: string | null } | null | undefined) =>
  String(order?.delivery_status ?? '').trim().toLowerCase() === 'cancelled';

/** Orders that count towards KPIs: everything that is not cancelled. */
export const isCountableOrder = (order: { delivery_status?: string | null } | null | undefined) =>
  !isCancelledOrder(order);

export const isDeliveredOrder = (order: { delivery_status?: string | null } | null | undefined) =>
  String(order?.delivery_status ?? '').trim().toLowerCase() === 'delivered';

/** Receivable on an order — always zero once cancelled. */
export const receivableOf = (order: { delivery_status?: string | null; balance_due?: number | null }) =>
  isCancelledOrder(order) ? 0 : Number(order?.balance_due || 0);

export const KPI_DEFINITIONS = {
  revenue: 'Confirmed orders in the selected period. Cancelled orders excluded.',
  collected: 'Receipts recorded against those orders. Cancelled orders excluded.',
  outstanding: 'Order value not yet collected. Cancelled orders count as zero.',
} as const;
