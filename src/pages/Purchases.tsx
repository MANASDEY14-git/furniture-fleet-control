
import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import StoreSelector from '@/components/StoreSelector';
import { purchases, stores, items } from '@/data/mockData';

export default function Purchases() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    storeId: '',
    itemId: '',
    quantity: '',
    totalCost: '',
    date: new Date().toISOString().split('T')[0],
  });

  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      const matchesStore = selectedStore === 'all' || purchase.storeId === selectedStore;
      const matchesSearch = purchase.itemName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStore && matchesSearch;
    });
  }, [selectedStore, searchTerm]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getTotalCost = () => {
    return filteredPurchases.reduce((sum, purchase) => sum + purchase.totalCost, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('New purchase:', formData);
    // Here you would typically save to your backend
    setShowForm(false);
    setFormData({
      storeId: '',
      itemId: '',
      quantity: '',
      totalCost: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-gray-600">Record inventory purchases</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? 'Cancel' : 'Add Purchase'}
        </Button>
      </div>

      {/* Add Purchase Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Record New Purchase</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store">Store</Label>
                <Select value={formData.storeId} onValueChange={(value) => setFormData({...formData, storeId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="item">Item</Label>
                <Select value={formData.itemId} onValueChange={(value) => setFormData({...formData, itemId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalCost">Total Cost</Label>
                <Input
                  id="totalCost"
                  type="number"
                  placeholder="Enter total cost"
                  value={formData.totalCost}
                  onChange={(e) => setFormData({...formData, totalCost: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="md:col-span-2">
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  Record Purchase
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <StoreSelector 
              value={selectedStore} 
              onValueChange={setSelectedStore}
            />
            <div className="flex items-center justify-center bg-red-50 rounded-md px-4 py-2">
              <span className="text-sm font-medium text-red-700">
                Total Cost: ${getTotalCost().toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase History ({filteredPurchases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Cost per Unit</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium">{purchase.itemName}</TableCell>
                    <TableCell>{getStoreName(purchase.storeId)}</TableCell>
                    <TableCell className="text-right">{purchase.quantity}</TableCell>
                    <TableCell className="text-right">${purchase.totalCost.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      ${(purchase.totalCost / purchase.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell>{purchase.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredPurchases.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No purchases found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
