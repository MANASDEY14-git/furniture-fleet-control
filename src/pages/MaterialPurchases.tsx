import { useState } from 'react';
import { Plus, Package2, ShoppingCart, TrendingUp, IndianRupee, Calendar, User, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useMaterialPurchases } from '@/hooks/useMaterialPurchases';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import MultiMaterialPurchaseForm from '@/components/MultiMaterialPurchaseForm';
import { useIsMobile } from '@/hooks/use-mobile';
export default function MaterialPurchases() {
  const isMobile = useIsMobile();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const {
    data: purchases = [],
    isLoading
  } = useMaterialPurchases(selectedStoreId || undefined);
  const {
    data: stores = []
  } = useStores();
  const {
    data: suppliers = []
  } = useSuppliers();
  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.materials.name.toLowerCase().includes(searchTerm.toLowerCase()) || purchase.invoice_number && purchase.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSupplier = !selectedSupplierId || purchase.supplier_id === selectedSupplierId;
    return matchesSearch && matchesSupplier;
  });

  // Calculate summary metrics
  const totalPurchases = filteredPurchases.length;
  const totalAmount = filteredPurchases.reduce((sum, p) => sum + p.total_cost, 0);

  // This month's purchases
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthPurchases = filteredPurchases.filter(p => {
    const purchaseDate = new Date(p.date);
    return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
  });
  const thisMonthTotal = thisMonthPurchases.reduce((sum, p) => sum + p.total_cost, 0);

  // Mobile purchase card component
  const MobilePurchaseCard = ({
    purchase
  }: {
    purchase: typeof filteredPurchases[0];
  }) => <Card className="futuristic-card mb-3">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-blue-100">{purchase.materials.name}</h3>
            <p className="text-sm text-blue-300">{purchase.materials.unit || 'units'}</p>
          </div>
          <span className="text-green-400 font-bold text-lg">
            ₹{purchase.total_cost.toFixed(2)}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-blue-200">
            <Calendar className="w-4 h-4 text-blue-400" />
            {new Date(purchase.date).toLocaleDateString('en-IN')}
          </div>
          <div className="flex items-center gap-2 text-blue-200">
            <Package2 className="w-4 h-4 text-cyan-400" />
            {purchase.quantity} {purchase.materials.unit || 'units'}
          </div>
          {purchase.suppliers?.name && <div className="flex items-center gap-2 text-blue-200 col-span-2">
              <User className="w-4 h-4 text-purple-400" />
              {purchase.suppliers.name}
            </div>}
          {purchase.invoice_number && <div className="flex items-center gap-2 text-blue-200 col-span-2">
              <FileText className="w-4 h-4 text-amber-400" />
              {purchase.invoice_number}
            </div>}
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t border-blue-500/20">
          <span className="text-xs text-blue-300">Unit: ₹{purchase.unit_cost.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>;
  return <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-cyan-300 glow-text">Material Purchases</h1>
          <p className="text-sm md:text-base text-blue-200">Track all raw material purchases and invoices</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
            <SelectTrigger className="w-full sm:w-[200px] neon-border bg-slate-800/50 text-blue-100">
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-blue-500/30 z-50">
              <SelectItem value="all" className="text-blue-100 focus:bg-blue-800/30">All Stores</SelectItem>
              {stores.map(store => <SelectItem key={store.id} value={store.id} className="text-blue-100 focus:bg-blue-800/30">
                  {store.name}
                </SelectItem>)}
            </SelectContent>
          </Select>
          <MultiMaterialPurchaseForm trigger={<Button className="cyber-button font-semibold w-full sm:w-auto text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Record Purchase
              </Button>} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card className="futuristic-card">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row items-center md:justify-between gap-1">
              <ShoppingCart className="h-5 w-5 md:h-8 md:w-8 text-blue-400/50 hidden md:block" />
              <div className="text-center md:text-left">
                <p className="text-blue-200 text-xs md:text-sm">Purchases</p>
                <p className="text-lg md:text-2xl font-bold text-cyan-300">{totalPurchases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row items-center md:justify-between gap-1">
              <IndianRupee className="h-5 w-5 md:h-8 md:w-8 text-green-400/50 hidden md:block" />
              <div className="text-center md:text-left">
                <p className="text-blue-200 text-xs md:text-sm">Total</p>
                <p className="text-base md:text-2xl font-bold text-green-400">₹{isMobile ? (totalAmount / 1000).toFixed(1) + 'K' : totalAmount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2
                })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row items-center md:justify-between gap-1">
              <TrendingUp className="h-5 w-5 md:h-8 md:w-8 text-amber-400/50 hidden md:block" />
              <div className="text-center md:text-left">
                <p className="text-blue-200 text-xs md:text-sm">This Month</p>
                <p className="text-base md:text-2xl font-bold text-amber-400">₹{isMobile ? (thisMonthTotal / 1000).toFixed(1) + 'K' : thisMonthTotal.toLocaleString('en-IN', {
                  minimumFractionDigits: 2
                })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="futuristic-card">
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="text-cyan-300 glow-text flex items-center text-lg md:text-xl">
            <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Purchase History
          </CardTitle>
          <div className="mt-3 flex flex-col gap-2">
            <Input placeholder="Search material or invoice..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400 text-sm" />
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger className="w-full neon-border bg-slate-800/50 text-blue-100 text-sm">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-blue-500/30 z-50">
                <SelectItem value="all" className="text-blue-100 focus:bg-blue-800/30">All Suppliers</SelectItem>
                {suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.id} className="text-blue-100 focus:bg-blue-800/30">
                    {supplier.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? <div className="text-center text-blue-300 py-8">Loading purchases...</div> : filteredPurchases.length === 0 ? <div className="text-center text-blue-300 py-8">No material purchases found</div> : isMobile ?
        // Mobile card view with pull-to-refresh and scroll area
        <PullToRefresh onRefresh={async () => { /* refetch handled by React Query */ }}>
          <div className="relative">
            {/* Top fade indicator */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-slate-900/80 to-transparent z-10 pointer-events-none" />
            <ScrollArea className="h-[55vh]">
              <div className="space-y-3 px-1 py-2">
                {filteredPurchases.map(purchase => <MobilePurchaseCard key={purchase.id} purchase={purchase} />)}
              </div>
            </ScrollArea>
            {/* Bottom fade indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-900/80 to-transparent z-10 pointer-events-none" />
          </div>
        </PullToRefresh> :
        // Desktop table view
        <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200">Date</TableHead>
                    <TableHead className="text-blue-200">Material</TableHead>
                    <TableHead className="text-blue-200">Supplier</TableHead>
                    <TableHead className="text-blue-200">Quantity</TableHead>
                    <TableHead className="text-blue-200">Unit Cost</TableHead>
                    <TableHead className="text-blue-200">Total Cost</TableHead>
                    <TableHead className="text-blue-200">Invoice #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map(purchase => <TableRow key={purchase.id} className="border-blue-500/20 hover:bg-blue-900/20">
                      <TableCell className="text-blue-200">
                        {new Date(purchase.date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="font-medium text-blue-100">
                        {purchase.materials.name}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {purchase.suppliers?.name || '-'}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {purchase.quantity} {purchase.materials.unit || 'units'}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        ₹{purchase.unit_cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-green-400 font-semibold">
                        ₹{purchase.total_cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {purchase.invoice_number || '-'}
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </div>}
        </CardContent>
      </Card>
    </div>;
}