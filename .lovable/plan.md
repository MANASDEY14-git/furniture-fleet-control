## Problem

The "Record Payment" dialog opened from the Sales page action menu only collects an amount and description. `useRecordPayment` inserts into `payments` without `payment_method` or `bank_account_id`, so every collection is treated as cash and never lands in the right bank account.

## Fix

**1. `src/components/sales/PaymentRecordDialog.tsx`**
- Add a "Payment Method" select: Cash, Bank Transfer, UPI, Cheque, Debit Card, Credit Card.
- When the method is not Cash, show `BankAccountSelector` (scoped to `recordingPayment.store_id`) plus an optional "Reference / Txn No." input; for Cheque also show cheque number + cheque date.
- New props: `paymentMethod`, `setPaymentMethod`, `bankAccountId`, `setBankAccountId`, `reference`, `setReference` (and cheque fields). Works in both the mobile Drawer and desktop Dialog.
- Require a bank account when the method is non-cash before enabling submit.

**2. `src/hooks/useSalePaymentStatus.ts`**
- Extend `useRecordPayment` input with `payment_method`, `bank_account_id`, `transaction_reference`, `cheque_number`, `cheque_date` and include them in the insert (omitting bank fields for cash). Also invalidate `bank-transactions` and `bank-accounts` so balances refresh.

**3. `src/pages/Sales.tsx` and `src/pages/Payments.tsx`**
- Add the new state (default method: Cash), pass it to the dialog, include it in the mutation call, and reset it after a successful save / on close.

No database changes needed — `payments` already has `payment_method`, `bank_account_id`, `transaction_reference`, and the cheque columns.
