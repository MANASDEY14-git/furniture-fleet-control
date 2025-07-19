import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DateFilterSelector from '@/components/DateFilterSelector';
import StoreSelector from '@/components/StoreSelector';
import { useItems } from '@/hooks/useItems';
import { useStores } from '@/hooks/useStores';
import { useStockLedger } from '@/hooks/useStockLedger';
import { format } from 'date-fns';

export default function StockLedger() {
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);

  const { data: items = [], isLoading: itemsLoading } = useItems();
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: stockData = [], isLoading: stockLoading, refetch } = useStockLedger({
    itemId: selectedItem,
    storeId: selectedStore === 'all' ? undefined : selectedStore,
    dateFilter,
    customDateRange
  });

  const handleSearch = () => {
    refetch();
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'bg-green-100 text-green-800';
      case 'sale':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Stock Ledger</h1>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="w-full bg-slate-700 border-blue-500/30 text-white">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Items</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={stockLoading}
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white">Stock Movements</CardTitle>
        </CardHeader>
        <CardContent>
          {stockLoading ? (
            <div className="text-center py-8 text-blue-200">Loading stock data...</div>
          ) : stockData.length === 0 ? (
            <div className="text-center py-8 text-blue-200">
              No stock movements found for the selected criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-blue-500/30 hover:bg-slate-700/50">
                  <TableHead className="text-blue-200">Date</TableHead>
                  <TableHead className="text-blue-200">Type</TableHead>
                  <TableHead className="text-blue-200">Item</TableHead>
                  <TableHead className="text-blue-200">Quantity</TableHead>
                  <TableHead className="text-blue-200">Unit Price</TableHead>
                  <TableHead className="text-blue-200">Total Amount</TableHead>
                  <TableHead className="text-blue-200">Reference</TableHead>
                  <TableHead className="text-blue-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockData.map((transaction, index) => (
                  <TableRow key={index} className="border-blue-500/30 hover:bg-slate-700/50">
                    <TableCell className="text-white">
                      {format(new Date(transaction.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge className={getTransactionTypeColor(transaction.type)}>
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">{transaction.item_name}</TableCell>
                    <TableCell className="text-white">{transaction.quantity}</TableCell>
                    <TableCell className="text-white">₹{transaction.unit_price}</TableCell>
                    <TableCell className="text-white">₹{transaction.total_amount}</TableCell>
                    <TableCell className="text-white">
                      {transaction.reference_number || '-'}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-blue-200 hover:text-blue-100 hover:bg-blue-800/30"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}