import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, Search, ArrowUp, ArrowDown } from 'lucide-react';
import StockAdjustmentDialog from '@/components/StockAdjustmentDialog';
import DateFilterSelector from '@/components/DateFilterSelector';
import StoreSelector from '@/components/StoreSelector';
import StockLedgerItemSelector from '@/components/StockLedgerItemSelector';
import ExportButton from '@/components/ExportButton';
import StockMovementDetailsDialog from '@/components/StockMovementDetailsDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStores } from '@/hooks/useStores';
import { useStockLedger, StockLedgerEntry } from '@/hooks/useStockLedger';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';

export default function StockLedger() {
  const [selectedItem, setSelectedItem] = useState<string>('all');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<StockLedgerEntry | null>(null);
  
  const isMobile = useIsMobile();

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['stock-ledger-items'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_items_enhanced', {
        search_term: '',
        store_id_filter: null,
        supplier_id_filter: null,
        show_low_stock_only: false,
        page_size: 1000,
        page_offset: 0
      });
      if (error) throw error;
      return data || [];
    },
  });
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: stockResult, isLoading: stockLoading, refetch } = useStockLedger({
    itemId: selectedItem,
    storeId: selectedStore === 'all' ? undefined : selectedStore,
    dateFilter,
    customDateRange
  });

  const stockData = stockResult?.entries || [];
  const openingBalance = stockResult?.opening_balance || 0;
  const closingBalance = stockResult?.closing_balance || 0;
  const totalPurchases = stockResult?.total_purchases || 0;
  const totalSales = stockResult?.total_sales || 0;

  const handleSearch = () => {
    refetch();
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'bg-green-100 text-green-800';
      case 'sale':
        return 'bg-blue-100 text-blue-800';
      case 'adjustment':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isIncrease = (transaction: StockLedgerEntry) => {
    return transaction.type === 'purchase' || 
      (transaction.type === 'adjustment' && transaction.quantity > 0);
  };

  // Mobile Card Component
  const MobileTransactionCard = ({ transaction }: { transaction: StockLedgerEntry }) => (
    <Card className="bg-slate-800/50 border-blue-500/30 mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-white font-medium truncate max-w-[180px]">{transaction.item_name}</p>
            <p className="text-blue-200 text-xs">{format(new Date(transaction.date), 'dd MMM yyyy')}</p>
          </div>
          <Badge className={`${getTransactionTypeColor(transaction.type)} text-xs`}>
            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-blue-200 text-xs">Quantity</p>
            <p className={cn(
              "font-bold flex items-center gap-1",
              isIncrease(transaction) ? "text-green-400" : "text-red-400"
            )}>
              {isIncrease(transaction) ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {isIncrease(transaction) ? '+' : '-'}{Math.abs(transaction.quantity)}
            </p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Total</p>
            <p className="text-white font-medium">₹{transaction.total_amount.toLocaleString()}</p>
          </div>
          {selectedItem !== 'all' && (
            <div>
              <p className="text-blue-200 text-xs">Balance</p>
              <p className="text-white font-bold">{transaction.balance}</p>
            </div>
          )}
          {transaction.reference_number && (
            <div>
              <p className="text-blue-200 text-xs">Reference</p>
              <p className="text-white text-sm truncate">{transaction.reference_number}</p>
            </div>
          )}
        </div>

        <Button 
          variant="outline"
          size="sm"
          className="w-full border-blue-500/30 text-blue-200 hover:bg-blue-800/30"
          onClick={() => setViewingTransaction(transaction)}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );

  const mobileContent = (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Stock Ledger</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButton 
            data={stockData} 
            filename={`stock-ledger-${format(new Date(), 'yyyy-MM-dd')}`} 
            type="stock-ledger" 
          />
          <StockAdjustmentDialog items={items} />
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg sm:text-xl">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-200">Date Filter</label>
              <DateFilterSelector
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
                customDateRange={customDateRange}
                onCustomDateRangeChange={setCustomDateRange}
              />
            </div>

            {/* Item Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-200">Item</label>
              <StockLedgerItemSelector
                selectedItemId={selectedItem}
                items={items}
                onItemChange={setSelectedItem}
              />
            </div>

            {/* Store Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-200">Outlet</label>
              <StoreSelector
                value={selectedStore}
                onValueChange={setSelectedStore}
                stores={stores}
                placeholder="Select store"
                isLoading={storesLoading}
              />
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <Button 
                onClick={handleSearch} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10"
                disabled={stockLoading}
              >
                <Search className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Search</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics - Only show when specific item selected */}
      {selectedItem !== 'all' && stockData.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-slate-700/50 border-blue-500/30">
            <CardContent className="p-3 sm:p-4">
              <p className="text-blue-200 text-xs sm:text-sm mb-1">Opening Balance</p>
              <p className="text-white text-lg sm:text-2xl font-bold">{openingBalance}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-900/30 border-green-500/30">
            <CardContent className="p-3 sm:p-4">
              <p className="text-green-200 text-xs sm:text-sm mb-1">Total Stock In</p>
              <p className="text-white text-lg sm:text-2xl font-bold">+{totalPurchases}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-900/30 border-red-500/30">
            <CardContent className="p-3 sm:p-4">
              <p className="text-red-200 text-xs sm:text-sm mb-1">Total Stock Out</p>
              <p className="text-white text-lg sm:text-2xl font-bold">-{totalSales}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-700/50 border-blue-500/30">
            <CardContent className="p-3 sm:p-4">
              <p className="text-blue-200 text-xs sm:text-sm mb-1">Closing Balance</p>
              <p className="text-white text-lg sm:text-2xl font-bold">{closingBalance}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg sm:text-xl">
            Stock Movements
            {stockData.length > 0 && (
              <span className="text-blue-200 text-sm font-normal ml-2">
                ({stockData.length} entries)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {stockLoading ? (
            <div className="text-center py-8 text-blue-200">Loading stock data...</div>
          ) : stockData.length === 0 ? (
            <div className="text-center py-8 text-blue-200">
              No stock movements found for the selected criteria.
            </div>
          ) : isMobile ? (
            // Mobile Card View
            <div className="space-y-3">
              {stockData.map((transaction, index) => (
                <MobileTransactionCard key={index} transaction={transaction} />
              ))}
            </div>
          ) : (
            // Desktop Table View
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-blue-500/30 hover:bg-slate-700/50">
                    <TableHead className="text-blue-200 min-w-[100px]">Date</TableHead>
                    <TableHead className="text-blue-200 min-w-[80px]">Type</TableHead>
                    <TableHead className="text-blue-200 min-w-[120px]">Item</TableHead>
                    <TableHead className="text-blue-200 min-w-[80px] text-right">Qty</TableHead>
                    <TableHead className="text-blue-200 min-w-[100px] text-right">Unit Price</TableHead>
                    <TableHead className="text-blue-200 min-w-[100px] text-right">Total</TableHead>
                    {selectedItem !== 'all' && (
                      <TableHead className="text-blue-200 min-w-[80px] text-right">Balance</TableHead>
                    )}
                    <TableHead className="text-blue-200 min-w-[100px]">Reference</TableHead>
                    <TableHead className="text-blue-200 min-w-[80px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockData.map((transaction, index) => (
                    <TableRow key={index} className="border-blue-500/30 hover:bg-slate-700/50">
                      <TableCell className="text-white text-sm">
                        {format(new Date(transaction.date), 'dd/MM/yy')}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getTransactionTypeColor(transaction.type)} text-xs px-2 py-1`}>
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white text-sm">
                        <div className="truncate max-w-[150px]" title={transaction.item_name}>
                          {transaction.item_name}
                        </div>
                      </TableCell>
                      <TableCell className={cn(
                        "text-sm text-right font-medium",
                        isIncrease(transaction) ? "text-green-400" : "text-red-400"
                      )}>
                        {isIncrease(transaction) ? '+' : '-'}{Math.abs(transaction.quantity)}
                      </TableCell>
                      <TableCell className="text-white text-sm text-right">
                        ₹{transaction.unit_price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white text-sm text-right font-medium">
                        ₹{transaction.total_amount.toLocaleString()}
                      </TableCell>
                      {selectedItem !== 'all' && (
                        <TableCell className="text-white text-sm text-right font-bold">
                          {transaction.balance}
                        </TableCell>
                      )}
                      <TableCell className="text-white text-sm">
                        <div className="truncate max-w-[100px]" title={transaction.reference_number || '-'}>
                          {transaction.reference_number || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-blue-200 hover:text-blue-100 hover:bg-blue-800/30 h-8 w-8 p-0"
                          onClick={() => setViewingTransaction(transaction)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <StockMovementDetailsDialog 
        movement={viewingTransaction}
        open={!!viewingTransaction}
        onOpenChange={(open) => !open && setViewingTransaction(null)}
      />
    </div>
  );

  // Return with PullToRefresh wrapper for mobile
  if (isMobile) {
    return (
      <PullToRefresh onRefresh={async () => { await refetch(); }}>
        {mobileContent}
      </PullToRefresh>
    );
  }

  return mobileContent;
}
