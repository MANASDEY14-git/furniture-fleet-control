
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ShoppingCart } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePurchases } from '@/hooks/usePurchases';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import { formatCurrency } from '@/utils/currencyUtils';
import { format } from 'date-fns';
import MultiItemPurchaseForm from '@/components/MultiItemPurchaseForm';
import ExportButton from '@/components/ExportButton';

export default function Purchases() {
  const { data: purchases = [], isLoading } = usePurchases();
  const { data: stores = [] } = useStores();
  const { data: suppliers = [] } = useSuppliers();

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return 'N/A';
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Unknown Supplier';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-cyan-300 glow-text">Purchase Management</h1>
        <div className="flex gap-2">
          <ExportButton 
            data={purchases} 
            filename="purchases" 
            type="purchases"
          />
          <MultiItemPurchaseForm
            trigger={
              <Button className="cyber-button text-white font-semibold">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Create Purchase Order
              </Button>
            }
          />
        </div>
      </div>

      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">Purchase Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-blue-300">Loading purchases...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="data-grid">
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200">Date</TableHead>
                    <TableHead className="text-blue-200">Invoice #</TableHead>
                    <TableHead className="text-blue-200">Store</TableHead>
                    <TableHead className="text-blue-200">Supplier</TableHead>
                    <TableHead className="text-blue-200">Item</TableHead>
                    <TableHead className="text-blue-200">Quantity</TableHead>
                    <TableHead className="text-blue-200">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase.id} className="border-blue-500/20 hover:bg-blue-800/20">
                      <TableCell className="text-blue-100">
                        {format(new Date(purchase.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-blue-100">
                        {purchase.invoice_number || 'N/A'}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {getStoreName(purchase.store_id)}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {getSupplierName(purchase.supplier_id)}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {purchase.item_name}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {purchase.quantity}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {formatCurrency(purchase.total_cost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoading && purchases.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300 mb-4">No purchases found</p>
              <MultiItemPurchaseForm
                trigger={
                  <Button className="cyber-button text-white font-semibold">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Purchase Order
                  </Button>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
