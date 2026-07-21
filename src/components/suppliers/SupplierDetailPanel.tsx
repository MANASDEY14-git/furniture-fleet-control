import { useMemo, useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSupplierLedger, useSupplierBalances } from '@/hooks/useSupplierLedger';
import { usePurchases } from '@/hooks/usePurchases';
import { usePayments } from '@/hooks/usePayments';
import { useMaterialPurchases } from '@/hooks/useMaterialPurchases';
import { useSuppliers, type Supplier } from '@/hooks/useSuppliers';
import { SupplierActions } from './SupplierActions';
import ExportButton from '@/components/ExportButton';
import QuickPaymentDialog from '@/components/QuickPaymentDialog';
import QuickPurchaseDialog from '@/components/QuickPurchaseDialog';
import {
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Receipt,
  CreditCard,
  Calendar,
  Activity,
  Package2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupplierDetailPanelProps {
  supplierId: string;
  storeId?: string;
  onClose: () => void;
  isMobile: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

type DateRange = 'this-month' | 'last-month' | 'last-3-months' | 'all';

export function SupplierDetailPanel({ 
  supplierId, 
  storeId, 
  onClose, 
  isMobile,
  isExpanded = false,
  onToggleExpand
}: SupplierDetailPanelProps) {
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const { data: suppliers = [] } = useSuppliers();
  const { data: ledgerEntries = [], isLoading: ledgerLoading } = useSupplierLedger(supplierId);
  const { data: supplierBalances = [] } = useSupplierBalances(storeId);
  const { data: purchases = [] } = usePurchases();
  const { data: payments = [] } = usePayments();
  const { data: materialPurchases = [] } = useMaterialPurchases(storeId);

  const supplier = suppliers.find((s) => s.id === supplierId);
  const showCompactSummary = !isMobile && activeTab !== 'overview';

  // Date range filter
  const getDateRangeBounds = () => {
    const now = new Date();
    switch (dateRange) {
      case 'this-month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'last-3-months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      default:
        return null;
    }
  };

  const filterByDateRange = <T extends { transaction_date?: string; date?: string }>(items: T[]): T[] => {
    const bounds = getDateRangeBounds();
    if (!bounds) return items;
    
    return items.filter(item => {
      const dateStr = item.transaction_date || item.date;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return date >= bounds.start && date <= bounds.end;
    });
  };

  // Calculate running balance for each ledger entry
  const ledgerEntriesWithBalance = useMemo(() => {
    const openingBalance = supplierBalances
      .filter((b) => b.supplier_id === supplierId)
      .reduce((sum, b) => {
        const value = b.opening_balance_type === 'debit' ? b.opening_balance : -b.opening_balance;
        return sum + value;
      }, 0);

    const sortedEntries = [...ledgerEntries].sort(
      (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    let runningBalance = openingBalance;
    const entriesWithBalance = sortedEntries.map((entry) => {
      runningBalance = runningBalance + (entry.debit_amount || 0) - (entry.credit_amount || 0);
      return { ...entry, runningBalance };
    });

    return entriesWithBalance.reverse();
  }, [ledgerEntries, supplierBalances, supplierId]);

  const filteredLedger = useMemo(() => filterByDateRange(ledgerEntriesWithBalance), [ledgerEntriesWithBalance, dateRange]);

  const supplierPurchases = useMemo(() => {
    const filtered = purchases.filter((p) => p.supplier_id === supplierId);
    return filterByDateRange(filtered);
  }, [purchases, supplierId, dateRange]);

  const supplierPayments = useMemo(() => {
    const filtered = payments.filter((p) => p.supplier_id === supplierId);
    return filterByDateRange(filtered as any[]);
  }, [payments, supplierId, dateRange]);

  const supplierMaterialPurchases = useMemo(() => {
    const filtered = materialPurchases.filter((mp) => mp.supplier_id === supplierId);
    return filterByDateRange(filtered as any[]);
  }, [materialPurchases, supplierId, dateRange]);

  const totalMaterialPurchases = supplierMaterialPurchases.reduce((sum, mp) => sum + mp.total_cost, 0);

  const totalPurchases = supplierPurchases.reduce((sum, p) => sum + p.total_cost, 0);
  const totalPayments = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
  
  // Use overall balance from ledger (not filtered)
  const overallBalance = ledgerEntriesWithBalance[0]?.runningBalance ?? 0;

  const getBalanceStatus = (bal: number) => {
    if (bal > 10000) return { label: 'High Due', variant: 'destructive' as const };
    if (bal > 0) return { label: 'Due', variant: 'default' as const };
    if (bal < -1000) return { label: 'Advance', variant: 'secondary' as const };
    return { label: 'Settled', variant: 'outline' as const };
  };

  const status = getBalanceStatus(overallBalance);

  const exportData = useMemo(() => {
    return filteredLedger.map((entry) => ({
      ...entry,
      supplier_name: supplier?.name || '',
    }));
  }, [filteredLedger, supplier?.name]);

  // Get recent activity (last 5 transactions)
  const recentActivity = ledgerEntriesWithBalance.slice(0, 5);

  // Get last payment and purchase dates
  const lastPayment = payments.filter(p => p.supplier_id === supplierId).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
  
  const lastPurchase = purchases.filter(p => p.supplier_id === supplierId).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  if (!supplier) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const DateRangeSelector = () => (
    <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
      <SelectTrigger className={cn('w-[140px]', isMobile && 'h-9 text-xs')}>
        <Calendar className="h-3.5 w-3.5 mr-1.5" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Time</SelectItem>
        <SelectItem value="this-month">This Month</SelectItem>
        <SelectItem value="last-month">Last Month</SelectItem>
        <SelectItem value="last-3-months">Last 3 Months</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header with expand toggle */}
      <div className={cn('flex items-start justify-between pb-3 mb-3', !isMobile && 'border-b')}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className={cn('font-bold text-foreground', isMobile ? 'text-lg' : 'text-lg')}>
              {supplier.name}
            </h2>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          {supplier.phone && (
            <p className="text-sm text-muted-foreground mt-0.5">{supplier.phone}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Expand/Collapse button - desktop only */}
          {!isMobile && onToggleExpand && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleExpand}
              className="h-8 w-8"
              title={isExpanded ? 'Collapse' : 'Expand Ledger'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
          <SupplierActions supplier={supplier} storeId={storeId} onDeleted={onClose} />
        </div>
      </div>

      {/* Balance Summary - Compact single-row when tabs (non-overview) are active on desktop */}
      {showCompactSummary ? (
        <div className="flex items-center gap-4 mb-3 py-2 px-3 bg-muted/30 rounded-lg text-sm h-10">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Purchases</span>
            <span className="font-semibold text-primary">₹{totalPurchases.toLocaleString('en-IN')}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Payments</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{totalPayments.toLocaleString('en-IN')}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Balance</span>
            <span className={cn(
              'font-bold',
              overallBalance >= 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
            )}>
              ₹{Math.abs(overallBalance).toLocaleString('en-IN')}
              <span className="text-xs ml-0.5">{overallBalance >= 0 ? 'Dr' : 'Cr'}</span>
            </span>
          </div>
          {/* Quick actions inline */}
          <div className="ml-auto flex gap-2">
            <QuickPaymentDialog
              supplier={supplier}
              trigger={
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Receipt className="h-3 w-3 mr-1" />
                  Pay
                </Button>
              }
            />
            <QuickPurchaseDialog
              supplier={supplier}
              trigger={
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Purchase
                </Button>
              }
            />
          </div>
        </div>
      ) : (
        <>
          {/* Full KPI cards for Overview tab or mobile */}
          <div className={cn('grid gap-3 mb-3', isMobile ? 'grid-cols-3' : 'grid-cols-3')}>
            <Card className="bg-muted/30">
              <CardContent className="p-2.5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Purchases</p>
                <p className="text-sm font-bold text-primary">
                  ₹{totalPurchases.toLocaleString('en-IN')}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-2.5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Payments</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{totalPayments.toLocaleString('en-IN')}
                </p>
              </CardContent>
            </Card>
            <Card className={cn('bg-muted/30', overallBalance >= 0 ? 'ring-1 ring-destructive/20' : 'ring-1 ring-emerald-500/20')}>
              <CardContent className="p-2.5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Balance</p>
                <p className={cn(
                  'text-base font-bold',
                  overallBalance >= 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                )}>
                  ₹{Math.abs(overallBalance).toLocaleString('en-IN')}
                  <span className="text-xs ml-0.5">{overallBalance >= 0 ? 'Dr' : 'Cr'}</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mb-3">
            <QuickPaymentDialog
              supplier={supplier}
              trigger={
                <Button size={isMobile ? 'sm' : 'sm'} className="flex-1 sm:flex-none">
                  <Receipt className="h-4 w-4 mr-2" />
                  Payment
                </Button>
              }
            />
            <QuickPurchaseDialog
              supplier={supplier}
              trigger={
                <Button variant="outline" size={isMobile ? 'sm' : 'sm'} className="flex-1 sm:flex-none">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Purchase
                </Button>
              }
            />
          </div>
        </>
      )}

      {/* Tabs - flex-1 to fill remaining space */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className={cn('inline-flex w-auto shrink-0', isMobile && 'h-9')}>
          <TabsTrigger value="overview" className={isMobile ? 'text-xs px-3' : ''}>Overview</TabsTrigger>
          <TabsTrigger value="ledger" className={isMobile ? 'text-xs px-3' : ''}>Ledger</TabsTrigger>
          <TabsTrigger value="purchases" className={isMobile ? 'text-xs px-3' : ''}>Purchases</TabsTrigger>
          <TabsTrigger value="materials" className={isMobile ? 'text-xs px-3' : ''}>Materials</TabsTrigger>
          <TabsTrigger value="payments" className={isMobile ? 'text-xs px-3' : ''}>Payments</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto mt-3">
          <TabsContent value="overview" className="mt-0 h-full">
            <div className="space-y-4">
              {/* Contact Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground w-16">Contact</span>
                    <span className="font-medium">{supplier.contact_person || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground w-16">Phone</span>
                    <span className="font-medium">{supplier.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground w-16">Email</span>
                    <span className="font-medium">{supplier.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground w-16">GSTIN</span>
                    <span className="font-medium">{supplier.gstin || 'N/A'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground w-16">Address</span>
                    <span className="font-medium">{supplier.address || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Activity Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Payment</span>
                    <span className="font-medium">
                      {lastPayment ? format(new Date(lastPayment.date), 'dd MMM yyyy') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Purchase</span>
                    <span className="font-medium">
                      {lastPurchase ? format(new Date(lastPurchase.date), 'dd MMM yyyy') : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              {recentActivity.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {recentActivity.map((entry) => (
                      <div key={entry.id} className="flex justify-between items-center text-sm py-1.5 border-b last:border-0">
                        <div>
                          <p className="font-medium capitalize">{entry.transaction_type}</p>
                          <p className="text-xs text-muted-foreground">{entry.transaction_date}</p>
                        </div>
                        <span className={cn(
                          'font-semibold',
                          entry.debit_amount > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                        )}>
                          {entry.debit_amount > 0 ? '+' : '-'}₹{(entry.debit_amount || entry.credit_amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ledger" className="mt-0 flex-1 flex flex-col min-h-0">
            {/* Ledger - no Card wrapper for desktop, fills space */}
            <div className={cn('flex flex-col flex-1 min-h-0', !isMobile && 'border rounded-lg')}>
              <div className="flex items-center justify-between gap-2 p-3 border-b shrink-0">
                <span className="text-sm font-semibold">Transaction Ledger</span>
                <div className="flex items-center gap-2">
                  <DateRangeSelector />
                  <ExportButton
                    data={exportData}
                    filename={`${supplier.name.replace(/\s+/g, '_')}_ledger`}
                    type="supplier-ledger"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {ledgerLoading ? (
                  <div className="space-y-2 p-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : filteredLedger.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No transactions found</p>
                ) : (
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="text-xs py-2">Date</TableHead>
                        <TableHead className="text-xs py-2">Type</TableHead>
                        <TableHead className="text-xs text-right py-2">Debit</TableHead>
                        <TableHead className="text-xs text-right py-2">Credit</TableHead>
                        <TableHead className="text-xs text-right py-2">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLedger.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-[13px] py-1.5">{entry.transaction_date}</TableCell>
                          <TableCell className="text-[13px] py-1.5 capitalize">
                            {entry.transaction_type === 'opening_balance' ? 'Opening Bal' : entry.transaction_type}
                          </TableCell>
                          <TableCell className="text-[13px] py-1.5 text-right text-destructive">
                            {entry.debit_amount > 0 ? `₹${entry.debit_amount.toLocaleString('en-IN')}` : '-'}
                          </TableCell>
                          <TableCell className="text-[13px] py-1.5 text-right text-emerald-600 dark:text-emerald-400">
                            {entry.credit_amount > 0 ? `₹${entry.credit_amount.toLocaleString('en-IN')}` : '-'}
                          </TableCell>
                          <TableCell className={cn(
                            'text-[13px] py-1.5 text-right font-medium',
                            entry.runningBalance >= 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                          )}>
                            ₹{Math.abs(entry.runningBalance).toLocaleString('en-IN')}
                            <span className="ml-0.5">{entry.runningBalance >= 0 ? 'Dr' : 'Cr'}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="purchases" className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-sm font-semibold">Purchase History</CardTitle>
                <DateRangeSelector />
              </CardHeader>
              <CardContent>
                {supplierPurchases.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No purchases found</p>
                ) : (
                  <div className="space-y-2">
                    {supplierPurchases.map((purchase) => (
                      <div key={purchase.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-sm">{purchase.item_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {purchase.invoice_number || 'No Invoice'} • {purchase.date}
                          </p>
                        </div>
                        <span className="font-semibold text-primary">
                          ₹{purchase.total_cost.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials" className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package2 className="h-4 w-4" />
                  Material Purchases
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary">
                    ₹{totalMaterialPurchases.toLocaleString('en-IN')}
                  </span>
                  <DateRangeSelector />
                </div>
              </CardHeader>
              <CardContent>
                {supplierMaterialPurchases.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No material purchases found</p>
                ) : (
                  <div className="space-y-2">
                    {supplierMaterialPurchases.map((mp) => (
                      <div key={mp.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-sm">{mp.materials?.name || 'Unknown Material'}</p>
                          <p className="text-xs text-muted-foreground">
                            {mp.quantity} {mp.materials?.unit || 'units'} @ ₹{mp.unit_cost.toLocaleString('en-IN')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {mp.invoice_number || 'No Invoice'} • {mp.date}
                          </p>
                        </div>
                        <span className="font-semibold text-primary">
                          ₹{mp.total_cost.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-sm font-semibold">Payment History</CardTitle>
                <DateRangeSelector />
              </CardHeader>
              <CardContent>
                {supplierPayments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No payments found</p>
                ) : (
                  <div className="space-y-2">
                    {supplierPayments.map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-sm capitalize">{payment.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.description || 'Payment'} • {payment.date}
                          </p>
                        </div>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          ₹{payment.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
