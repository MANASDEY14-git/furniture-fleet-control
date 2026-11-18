# Safe item changes on existing sales orders

## Goal
Let store staff add an item to an existing order before delivery, and let only admins or managers remove an item. Keep the item history, inventory, order total, customer balance, and audit trail consistent.

## Plan
1. Add soft-delete tracking to sales order lines so removed items remain available in history and are never physically erased.
2. Create one authenticated, transactional database operation for adding and removing order lines. It will verify the user's store access and role server-side, lock the order during changes, and reject cancelled or delivered orders. Adding is available to authorized staff; removing requires admin or manager.
3. Reconcile inventory per line exactly once when a change is made, including variants and recorded material usage. Do not rely on the current order-level stock triggers to correctly reconcile edited lines. Preserve existing payments; recalculate the total from active lines and round-off, and reflect any resulting credit/balance through the existing ledger rules rather than silently refunding money.
4. Add item controls to the existing order details view, with confirmation and a reason for removal. Display removed lines in history as removed, but exclude them from active totals and fulfillment views.
5. Update order-detail reads and other item-dependent calculations to ignore removed lines where appropriate. Refresh order, inventory, payment/balance, ledger, and dashboard views after a successful change.
6. Verify access denial for regular staff attempting removal, cross-store denial, edits blocked after delivery/cancellation, and correct totals, balances, stock, variants, and material movements for add/remove cases.

## Technical notes
- Existing order details are read-only; creation has an atomic RPC, but no existing-order item-edit operation was found.
- The current stock and BOM triggers are order-level and do not reliably reconcile changes to individual lines, so the new operation must own the reconciliation and prevent duplicate trigger effects.
- Apply database changes through a migration, following the project's RLS and explicit-grant requirements if any table is created.

## Assumptions
- “Before delivery” includes paid orders that have not been delivered; those edits still reconcile deducted stock and the outstanding customer balance.
- Removing a line records who removed it and why; payments are retained and no automatic cash refund is issued.
