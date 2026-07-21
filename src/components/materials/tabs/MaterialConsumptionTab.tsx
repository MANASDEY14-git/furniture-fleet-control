import React, { useState } from 'react';
import { Plus, Minus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Material } from '@/hooks/useMaterials';
import { useStores } from '@/hooks/useStores';
import { useMaterialConsumptions, useCreateMaterialConsumption } from '@/hooks/useMaterialConsumptions';
import { format } from 'date-fns';

interface MaterialConsumptionTabProps {
  material: Material;
}

export default function MaterialConsumptionTab({ material }: MaterialConsumptionTabProps) {
  const { data: stores = [] } = useStores();
  const { data: consumptions = [], isLoading } = useMaterialConsumptions(material.id);
  const createConsumption = useCreateMaterialConsumption();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    quantity_used: string;
    store_id: string;
    reference_type: 'order' | 'job' | 'manual' | 'production';
    notes: string;
    date: string;
  }>({
    quantity_used: '',
    store_id: '',
    reference_type: 'manual' as const,
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.quantity_used || !formData.store_id) return;

    await createConsumption.mutateAsync({
      material_id: material.id,
      store_id: formData.store_id,
      quantity_used: parseFloat(formData.quantity_used),
      reference_type: formData.reference_type,
      notes: formData.notes || undefined,
      date: formData.date,
    });

    setFormData({
      quantity_used: '',
      store_id: formData.store_id,
      reference_type: 'manual',
      notes: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setShowForm(false);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Quick Consumption Form */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Minus className="w-4 h-4" />
              Record Consumption
            </CardTitle>
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            )}
          </div>
        </CardHeader>
        {showForm && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={material.quantity_available}
                    placeholder={`Max: ${material.quantity_available}`}
                    value={formData.quantity_used}
                    onChange={(e) => setFormData({ ...formData, quantity_used: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Store *</Label>
                  <Select
                    value={formData.store_id}
                    onValueChange={(value) => setFormData({ ...formData, store_id: value })}
                    required
                  >
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
                  <Label>Reference Type</Label>
                  <Select
                    value={formData.reference_type}
                    onValueChange={(value: 'order' | 'job' | 'manual' | 'production') => 
                      setFormData({ ...formData, reference_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="job">Job/Work Order</SelectItem>
                      <SelectItem value="order">Sales Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Reason for consumption..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createConsumption.isPending}>
                  {createConsumption.isPending ? 'Recording...' : 'Record Consumption'}
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Consumption History */}
      <div className="flex-1 min-h-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">
            {consumptions.length} consumption record{consumptions.length !== 1 ? 's' : ''}
          </p>
        </div>

        <ScrollArea className="h-[calc(100%-30px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : consumptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Minus className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No consumption records</p>
              <p className="text-sm text-muted-foreground">Record material usage to track consumption</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Store</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Notes</TableHead>
                  <TableHead className="text-xs text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumptions.map((consumption) => (
                  <TableRow key={consumption.id} className="text-sm">
                    <TableCell className="py-2">
                      {format(new Date(consumption.date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="py-2">
                      {consumption.stores?.name || '-'}
                    </TableCell>
                    <TableCell className="py-2 capitalize">
                      {consumption.reference_type}
                    </TableCell>
                    <TableCell className="py-2 max-w-[150px] truncate text-muted-foreground">
                      {consumption.notes || '-'}
                    </TableCell>
                    <TableCell className="py-2 text-right font-semibold text-red-600">
                      -{consumption.quantity_used}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
