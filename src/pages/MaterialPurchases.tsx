import { useState } from 'react';
import { Plus, Package2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMaterialPurchases } from '@/hooks/useMaterialPurchases';
import MaterialPurchaseForm from '@/components/MaterialPurchaseForm';

export default function MaterialPurchases() {
  const { data: purchases = [], isLoading } = useMaterialPurchases();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPurchases = purchases.filter(purchase =>
    purchase.materials.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (purchase.invoice_number && purchase.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyan-300 glow-text">Material Purchases</h1>
          <p className="text-blue-200">Track all raw material purchases and invoices</p>
        </div>
        <MaterialPurchaseForm
          trigger={
            <Button className="cyber-button text-white font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Record Purchase
            </Button>
          }
        />
      </div>

      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Purchase History
          </CardTitle>
          <div className="mt-4">
            <Input
              placeholder="Search by material name or invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Date</TableHead>
                  <TableHead className="text-blue-200">Material</TableHead>
                  <TableHead className="text-blue-200">Quantity</TableHead>
                  <TableHead className="text-blue-200">Unit Cost</TableHead>
                  <TableHead className="text-blue-200">Total Cost</TableHead>
                  <TableHead className="text-blue-200">Invoice #</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-blue-300">
                      Loading purchases...
                    </TableCell>
                  </TableRow>
                ) : filteredPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-blue-300">
                      No material purchases found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id} className="border-blue-500/20 hover:bg-blue-900/20">
                      <TableCell className="text-blue-200">
                        {new Date(purchase.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium text-blue-100">
                        {purchase.materials.name}
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
                        {purchase.invoice_number || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}