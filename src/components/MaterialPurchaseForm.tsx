import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateMaterialPurchase } from '@/hooks/useMaterialPurchases';
import { useMaterials } from '@/hooks/useMaterials';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import BankAccountSelector from '@/components/BankAccountSelector';
interface MaterialPurchaseFormProps {
  trigger: React.ReactNode;
  defaultMaterialId?: string;
}
export default function MaterialPurchaseForm({
  trigger,
  defaultMaterialId
}: MaterialPurchaseFormProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    material_id: defaultMaterialId || '',
    supplier_id: '',
    store_id: '',
    quantity: 0,
    unit_cost: 0,
    total_cost: 0,
    invoice_number: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'cash' as 'cash' | 'upi' | 'bank_transfer' | 'cheque',
    bank_account_id: ''
  });
  const {
    data: materials = []
  } = useMaterials();
  const {
    data: stores = []
  } = useStores();
  const {
    data: suppliers = []
  } = useSuppliers();
  const createPurchase = useCreateMaterialPurchase();
  const calculateTotalCost = (quantity: number, unitCost: number) => {
    return quantity * unitCost;
  };
  const handleQuantityChange = (quantity: number) => {
    const total = calculateTotalCost(quantity, formData.unit_cost);
    setFormData(prev => ({
      ...prev,
      quantity,
      total_cost: total
    }));
  };
  const handleUnitCostChange = (unitCost: number) => {
    const total = calculateTotalCost(formData.quantity, unitCost);
    setFormData(prev => ({
      ...prev,
      unit_cost: unitCost,
      total_cost: total
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.material_id || formData.quantity <= 0 || formData.unit_cost <= 0) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      await createPurchase.mutateAsync({
        material_id: formData.material_id,
        supplier_id: formData.supplier_id || undefined,
        store_id: formData.store_id || undefined,
        quantity: formData.quantity,
        unit_cost: formData.unit_cost,
        total_cost: formData.total_cost,
        invoice_number: formData.invoice_number || undefined,
        date: formData.date,
        materialName: selectedMaterial?.name
      });
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error recording material purchase:', error);
    }
  };
  const resetForm = () => {
    setFormData({
      material_id: '',
      supplier_id: '',
      store_id: '',
      quantity: 0,
      unit_cost: 0,
      total_cost: 0,
      invoice_number: '',
      date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      bank_account_id: ''
    });
  };

  const showBankAccountSelector = formData.payment_method !== 'cash';
  const selectedMaterial = materials.find(m => m.id === formData.material_id);
  return <Dialog open={open} onOpenChange={newOpen => {
    setOpen(newOpen);
    if (!newOpen) resetForm();
  }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl futuristic-card" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Record Material Purchase
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="material" className="text-blue-200">Material *</Label>
              <Select value={formData.material_id} onValueChange={value => setFormData({
              ...formData,
              material_id: value
            })}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  {materials.map(material => <SelectItem key={material.id} value={material.id} className="text-blue-100 focus:bg-blue-800/30">
                      {material.name} (Current: {material.quantity_available} {material.unit || 'units'})
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-blue-200">Purchase Date *</Label>
              <Input id="date" type="date" value={formData.date} onChange={e => setFormData({
              ...formData,
              date: e.target.value
            })} required className="neon-border bg-slate-800/50 text-blue-100" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier" className="text-blue-200">Supplier</Label>
              <Select value={formData.supplier_id} onValueChange={value => setFormData({
              ...formData,
              supplier_id: value
            })}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  {suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.id} className="text-blue-100 focus:bg-blue-800/30">
                      {supplier.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="store" className="text-blue-200">Store</Label>
              <Select value={formData.store_id} onValueChange={value => setFormData({
              ...formData,
              store_id: value
            })}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  {stores.map(store => <SelectItem key={store.id} value={store.id} className="text-blue-100 focus:bg-blue-800/30">
                      {store.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-blue-200">
                Quantity * {selectedMaterial && `(${selectedMaterial.unit || 'units'})`}
              </Label>
              <Input id="quantity" type="number" step="0.01" placeholder="Enter quantity" value={formData.quantity || ''} onChange={e => handleQuantityChange(parseFloat(e.target.value) || 0)} required min="0" className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitCost" className="text-blue-200">Unit Cost *</Label>
              <Input id="unitCost" type="number" step="0.01" placeholder="Cost per unit" value={formData.unit_cost || ''} onChange={e => handleUnitCostChange(parseFloat(e.target.value) || 0)} required min="0" className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceNumber" className="text-blue-200">Invoice Number</Label>
              <Input id="invoiceNumber" placeholder="Enter invoice number" value={formData.invoice_number} onChange={e => setFormData({
              ...formData,
              invoice_number: e.target.value
            })} className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400" />
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Total Cost</Label>
              <div className="p-3 neon-border bg-gradient-to-r from-green-400/10 to-cyan-400/10 rounded-md">
                <span className="text-cyan-300 text-lg font-semibold">
                  ₹{formData.total_cost.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Payment Method</Label>
              <Select 
                value={formData.payment_method} 
                onValueChange={(value: 'cash' | 'upi' | 'bank_transfer' | 'cheque') => 
                  setFormData(prev => ({ ...prev, payment_method: value, bank_account_id: value === 'cash' ? '' : prev.bank_account_id }))
                }
              >
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  <SelectItem value="cash" className="text-blue-100">Cash</SelectItem>
                  <SelectItem value="bank_transfer" className="text-blue-100">Bank Transfer</SelectItem>
                  <SelectItem value="upi" className="text-blue-100">UPI</SelectItem>
                  <SelectItem value="cheque" className="text-blue-100">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showBankAccountSelector && (
              <div className="space-y-2">
                <Label className="text-blue-200">Bank Account</Label>
                <BankAccountSelector
                  value={formData.bank_account_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, bank_account_id: value }))}
                  storeId={formData.store_id}
                  disabled={!formData.store_id}
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={createPurchase.isPending} className="flex-1 cyber-button font-semibold text-primary-foreground">
              {createPurchase.isPending ? 'Recording...' : 'Record Purchase'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="neon-border bg-slate-800/50 text-blue-100">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>;
}