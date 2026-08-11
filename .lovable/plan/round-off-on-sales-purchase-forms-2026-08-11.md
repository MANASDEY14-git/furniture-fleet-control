# Round Off on Sales & Purchase Forms

Add a manual **Round Off** field to the sales order form and the purchase form so odd paise amounts (₹12,450.33) can be adjusted to a clean figure. The adjustment is stored as its own value, so invoices and ledgers show it as a separate "Round Off" line instead of hiding it inside the item totals.

## Behaviour

- A single editable "Round Off" input next to the grand total. Blank/0 by default, no auto-suggestion.
- Accepts positive and negative values (e.g. `-0.33` to drop the paise, `+0.67` to go up).
- Grand total shown = sum of items + round off, updating live as you type.
- The round off is saved separately and the saved order/purchase total includes it, so payments, balance due and supplier balances all reconcile to the rounded figure.

## Where it appears

1. **Sales order form** (desktop dialog and mobile sheet) — in the Payment Summary block, above the total; balance due = rounded total − advance paid.
2. **Purchase form** (desktop table footer and mobile card list) — in the totals row.
3. **Order details dialog** and **purchase details dialog** — read-only "Round Off" line when the value is not zero.

Material purchases are out of scope for this change.

## Technical notes

Database migration:
- Add `round_off numeric not null default 0` to `public.sales_orders` and `public.purchases`.
- Update `create_sales_order_secure` to accept a `_round_off` parameter, store it, and keep `total_amount` as the rounded total passed from the client (`balance_due` stays a generated column and follows automatically).
- Update `create_supplier_ledger_entry_for_purchase` so the ledger debit is `total_cost + coalesce(round_off, 0)`, keeping supplier balances in sync.

Frontend:
- `EnhancedSalesOrderForm.tsx`: add `roundOff` to form state, include it in `getTotalAmount()`/`getBalanceDue()`, and pass it through `useCreateSalesOrder`/`CreateSalesOrderData` → RPC.
- `RefactoredMultiItemPurchaseForm.tsx` + `PurchaseItemsTable.tsx` / `MobilePurchaseItemCard` footer: add `roundOff` state and field; pass it to `useCreatePurchaseOrder`, which writes it onto the first purchase row of the invoice (one round off per invoice, not per item).
- Existing rows keep `round_off = 0`, so no historical totals change.
