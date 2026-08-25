import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';
import { useCustomerMoneySummary } from '@/hooks/useCollections';

interface Props {
  customerId?: string | null;
  /** Value of the order being created, added on top of current outstanding. */
  pendingAmount?: number;
}

/** Soft, non-blocking warning shown when a customer is at or over their credit limit. */
export function CustomerCreditWarning({ customerId, pendingAmount = 0 }: Props) {
  const { data } = useCustomerMoneySummary(customerId);

  if (!customerId || !data) return null;

  const outstanding = Number(data.outstanding || 0);
  const creditLimit = Number(data.credit_limit || 0);
  if (creditLimit <= 0) return null;

  const projected = outstanding + Number(pendingAmount || 0);
  if (projected <= creditLimit) return null;

  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
      <span>
        This customer already owes {formatCurrency(outstanding)} against a credit limit of {formatCurrency(creditLimit)}.
        {pendingAmount > 0 && ` This order takes them to ${formatCurrency(projected)}.`} Collect before extending more credit.
      </span>
    </div>
  );
}
