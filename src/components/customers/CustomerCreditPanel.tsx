import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Wallet } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';
import { useCustomerMoneySummary } from '@/hooks/useCollections';

interface Props {
  customerId: string;
}

export function CustomerCreditPanel({ customerId }: Props) {
  const { data, isLoading } = useCustomerMoneySummary(customerId);

  const billed = Number(data?.total_billed || 0);
  const collected = Number(data?.total_collected || 0);
  const outstanding = Number(data?.outstanding || 0);
  const creditHeld = Number(data?.credit_held || 0);
  const creditLimit = Number(data?.credit_limit || 0);
  const overLimit = creditLimit > 0 && outstanding > creditLimit;

  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Money position
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Total billed</p>
                <p className="text-lg font-semibold">{formatCurrency(billed)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="text-lg font-semibold text-emerald-600">{formatCurrency(collected)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className={`text-lg font-semibold ${outstanding > 0 ? 'text-red-600' : ''}`}>{formatCurrency(outstanding)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Advance / credit held</p>
                <p className="text-lg font-semibold">{formatCurrency(creditHeld)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">{data?.open_orders ?? 0} unpaid order{(data?.open_orders ?? 0) === 1 ? '' : 's'}</Badge>
              <Badge variant="outline">
                Credit limit {creditLimit > 0 ? formatCurrency(creditLimit) : 'not set'}
              </Badge>
              {data?.last_order_date && (
                <Badge variant="secondary">
                  Last order {new Date(data.last_order_date).toLocaleDateString('en-GB')}
                </Badge>
              )}
            </div>

            {overLimit && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>
                  Outstanding is {formatCurrency(outstanding - creditLimit)} above the credit limit. Collect before taking a new
                  credit order.
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
