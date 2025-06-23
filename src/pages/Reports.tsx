import { useState, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import StoreSelector from '@/components/StoreSelector';
import { sales, purchases, payments, items } from '@/data/mockData';
import { useStores } from '@/hooks/useStores';

export default function Reports() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateFrom, setDateFrom] = useState('2024-06-01');
  const [dateTo, setDateTo] = useState('2024-06-30');

  const { data: stores = [], isLoading: storesLoading } = useStores();

  const reportData = useMemo(() => {
    const filteredSales = sales.filter(sale => {
      const matchesStore = selectedStore === 'all' || sale.store_id === selectedStore;
      const matchesDate = sale.date >= dateFrom && sale.date <= dateTo;
      return matchesStore && matchesDate;
    });

    const filteredPurchases = purchases.filter(purchase => {
      const matchesStore = selectedStore === 'all' || purchase.store_id === selectedStore;
      const matchesDate = purchase.date >= dateFrom && purchase.date <= dateTo;
      return matchesStore && matchesDate;
    });

    const filteredPayments = payments.filter(payment => {
      const matchesStore = selectedStore === 'all' || payment.store_id === selectedStore;
      const matchesDate = payment.date >= dateFrom && payment.date <= dateTo;
      return matchesStore && matchesDate;
    });

    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total_price, 0);
    const totalPurchases = filteredPurchases.reduce((sum, purchase) => sum + purchase.total_cost, 0);
    const totalReceipts = filteredPayments.filter(p => p.type === 'Receipt').reduce((sum, p) => sum + p.amount, 0);
    const totalPayments = filteredPayments.filter(p => p.type === 'Payment').reduce((sum, p) => sum + p.amount, 0);

    // Store-wise breakdown
    const storeBreakdown = stores.map(store => {
      const storeSales = filteredSales.filter(s => s.store_id === store.id);
      const storePurchases = filteredPurchases.filter(p => p.store_id === store.id);
      const storeItems = items.filter(i => i.store_id === store.id);
      
      return {
        store: store.name,
        sales: storeSales.reduce((sum, s) => sum + s.total_price, 0),
        purchases: storePurchases.reduce((sum, p) => sum + p.total_cost, 0),
        inventory: storeItems.reduce((sum, i) => sum + (i.quantity_available * i.cost_price), 0),
        profit: storeSales.reduce((sum, s) => sum + s.total_price, 0) - storePurchases.reduce((sum, p) => sum + p.total_cost, 0),
      };
    });

    return {
      totalSales,
      totalPurchases,
      totalReceipts,
      totalPayments,
      profit: totalSales - totalPurchases,
      storeBreakdown,
      salesCount: filteredSales.length,
      purchasesCount: filteredPurchases.length,
    };
  }, [selectedStore, dateFrom, dateTo, stores]);

  const handleExport = (format: 'csv' | 'excel') => {
    console.log(`Exporting report as ${format}`);
    // Here you would implement the actual export functionality
    alert(`Report would be exported as ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Business insights and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Store</Label>
              <StoreSelector 
                value={selectedStore} 
                onValueChange={setSelectedStore}
                stores={stores}
                isLoading={storesLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <Select defaultValue="custom">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Range</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-green-600">
                  ${reportData.totalSales.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{reportData.salesCount} transactions</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-red-600">
                  ${reportData.totalPurchases.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{reportData.purchasesCount} transactions</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className={`text-2xl font-bold ${reportData.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${reportData.profit.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {((reportData.profit / reportData.totalSales) * 100).toFixed(1)}% margin
                </p>
              </div>
              <div className={`w-8 h-8 ${reportData.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {reportData.profit >= 0 ? <TrendingUp /> : <TrendingDown />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cash Flow</p>
                <p className={`text-2xl font-bold ${(reportData.totalReceipts - reportData.totalPayments) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${(reportData.totalReceipts - reportData.totalPayments).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Receipts - Payments</p>
              </div>
              <div className={`w-8 h-8 ${(reportData.totalReceipts - reportData.totalPayments) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(reportData.totalReceipts - reportData.totalPayments) >= 0 ? <TrendingUp /> : <TrendingDown />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Store Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reportData.storeBreakdown.map((store, index) => (
              <Card key={index} className="border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{store.store}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Sales Revenue</span>
                      <span className="font-medium text-green-600">${store.sales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Purchase Costs</span>
                      <span className="font-medium text-red-600">${store.purchases.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Inventory Value</span>
                      <span className="font-medium text-blue-600">${store.inventory.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">Net Profit</span>
                        <span className={`font-bold ${store.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${store.profit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
