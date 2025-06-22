
import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import StoreSelector from '@/components/StoreSelector';
import StatusBadge from '@/components/StatusBadge';
import { sales, stores, items } from '@/data/mockData';

export default function Sales() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    storeId: '',
    itemId: '',
    quantity: '',
    totalPrice: '',
    deliveryStatus: 'Pending' as 'Pending' | 'Delivered',
    date: new Date().toISOString().split('T')[0],
  });

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesStore = selectedStore === 'all' || sale.storeId === selectedStore;
      const matchesStatus = selectedStatus === 'all' || sale.deliveryStatus === selectedStatus;
      const matchesSearch = sale.itemName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStore && matchesStatus && matchesSearch;
    });
  }, [selectedStore, selectedStatus, searchTerm]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getTotalSales = () => {
    return filteredSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('New sale:', formData);
    // Here you would typically save to your backend
    setShowForm(false);
    setFormData({
      storeId: '',
      itemId: '',
      quantity: '',
      totalPrice: '',
      deliveryStatus: 'Pending',
      date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-600">Track and manage sales</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? 'Cancel' : 'Add Sale'}
        </Button>
      </div>

      {/* Add Sale Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Sale</CardTitle>
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
                <Label htmlFor="totalPrice">Total Price</Label>
                <Input
                  id="totalPrice"
                  type="number"
                  placeholder="Enter total price"
                  value={formData.totalPrice}
                  onChange={(e) => setFormData({...formData, totalPrice: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryStatus">Delivery Status</Label>
                <Select value={formData.deliveryStatus} onValueChange={(value: 'Pending' | 'Delivered') => setFormData({...formData, deliveryStatus: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
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
                  Add Sale
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-center bg-green-50 rounded-md px-4 py-2">
              <span className="text-sm font-medium text-green-700">
                Total Sales: ${getTotalSales().toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales ({filteredSales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Total Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.itemName}</TableCell>
                    <TableCell>{getStoreName(sale.storeId)}</TableCell>
                    <TableCell className="text-right">{sale.quantity}</TableCell>
                    <TableCell className="text-right">${sale.totalPrice.toLocaleString()}</TableCell>
                    <TableCell>
                      <StatusBadge status={sale.deliveryStatus} />
                    </TableCell>
                    <TableCell>{sale.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredSales.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No sales found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
