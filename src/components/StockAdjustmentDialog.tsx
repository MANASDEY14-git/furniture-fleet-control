import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateStockAdjustment } from '@/hooks/useStockAdjustments';
import { useStores } from '@/hooks/useStores';
import { useItemVariants } from '@/hooks/useItemVariants';
import { ClipboardEdit, Package, CheckCircle2, AlertTriangle } from 'lucide-react';
import StockLedgerItemSelector from './StockLedgerItemSelector';
import { useYearGuard } from '@/contexts/FinancialYearContext';

interface StockAdjustmentDialogProps {
  items: any[];
  defaultItemId?: string;
  defaultVariantId?: string;
  triggerButton?: React.ReactNode;
}

export default function StockAdjustmentDialog({
  items,
  defaultItemId,
  defaultVariantId,
  triggerButton,
}: StockAdjustmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState<string>(defaultItemId || '');
  const [selectedVariantId, setSelectedVariantId] = useState<string>(defaultVariantId || '');
  const [storeId, setStoreId] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'physical_count' | 'damaged' | 'theft' | 'other'>('physical_count');
  const [auditMode, setAuditMode] = useState<'count' | 'delta'>('count');
  const [physicalCount, setPhysicalCount] = useState<string>('');
  const [quantityChange, setQuantityChange] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const { data: stores = [] } = useStores();
  const { data: variants = [] } = useItemVariants(itemId || undefined);
  const createAdjustment = useCreateStockAdjustment();
  const { readOnly } = useYearGuard();

  const selectedItemObj = items.find((i) => i.id === itemId);
  const hasVariants = variants.length > 0;
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  // Sync defaults when dialog opens or defaults change
  useEffect(() => {
    if (open) {
      if (defaultItemId) setItemId(defaultItemId);
      if (defaultVariantId) setSelectedVariantId(defaultVariantId);
      setPhysicalCount('');
      setQuantityChange('');
      setReason('');
      setNotes('');
    }
  }, [open, defaultItemId, defaultVariantId]);

  useEffect(() => {
    if (defaultVariantId && variants.some((v) => v.id === defaultVariantId)) {
      setSelectedVariantId(defaultVariantId);
    }
  }, [defaultVariantId, variants]);

  // Set store from item if available
  useEffect(() => {
    if (selectedItemObj?.store_id && !storeId) {
      setStoreId(selectedItemObj.store_id);
    }
  }, [selectedItemObj]);

  // Current system stock to compare against
  const currentSystemStock = hasVariants
    ? selectedVariant
      ? selectedVariant.quantity_available
      : 0
    : selectedItemObj?.quantity_available ?? 0;

  // Auto-calculate quantityChange when in count mode
  useEffect(() => {
    if (auditMode === 'count') {
      if (physicalCount !== '') {
        const count = parseInt(physicalCount, 10);
        if (!isNaN(count)) {
          const delta = count - currentSystemStock;
          setQuantityChange(delta.toString());
        }
      } else {
        setQuantityChange('');
      }
    }
  }, [physicalCount, currentSystemStock, auditMode]);

  const varianceNum = parseInt(quantityChange, 10) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemId || !storeId || quantityChange === '' || isNaN(varianceNum)) {
      return;
    }

    if (hasVariants && !selectedVariantId) {
      return;
    }

    await createAdjustment.mutateAsync({
      item_id: itemId,
      variant_id: hasVariants ? selectedVariantId : undefined,
      store_id: storeId,
      adjustment_type: adjustmentType,
      quantity_change: varianceNum,
      reason: reason || (hasVariants ? `Audit adjustment for variant: ${selectedVariant?.variant_name}` : 'Stock audit count'),
      notes,
    });

    // Reset form
    if (!defaultItemId) setItemId('');
    if (!defaultVariantId) setSelectedVariantId('');
    setQuantityChange('');
    setPhysicalCount('');
    setReason('');
    setNotes('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button className="bg-blue-600 hover:bg-blue-700" disabled={readOnly}>
            <ClipboardEdit className="w-4 h-4 mr-2" />
            Stock Adjustment / Audit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-blue-500/30 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <ClipboardEdit className="w-5 h-5 text-cyan-400" />
            Stock Audit & Adjustment
          </DialogTitle>
          <DialogDescription className="text-blue-200">
            Reconcile physical floor counts with system records or adjust for damage/theft.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Item Selector */}
          <div className="space-y-2">
            <Label htmlFor="item" className="text-blue-200">
              Item (Product Model) *
            </Label>
            <StockLedgerItemSelector
              selectedItemId={itemId}
              items={items}
              onItemChange={(id) => {
                setItemId(id);
                setSelectedVariantId('');
                setPhysicalCount('');
                setQuantityChange('');
              }}
            />
          </div>

          {/* Variant Selector (if item has variants) */}
          {hasVariants && (
            <div className="space-y-2 p-3 bg-slate-900/60 border border-cyan-500/30 rounded-lg">
              <Label className="text-cyan-300 font-semibold flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <Package className="w-4 h-4 text-cyan-400" />
                Select Variant / SKU *
              </Label>
              <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                <SelectTrigger className="bg-slate-700 border-cyan-500/40 text-white">
                  <SelectValue placeholder="Choose variant to audit / adjust..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-cyan-500/30 text-white">
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-white hover:bg-slate-700">
                      {v.variant_name} {v.sku ? `(SKU: ${v.sku})` : ''} — Current Stock: {v.quantity_available}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedVariant && (
                <div className="text-xs text-blue-200 pt-1 flex justify-between items-center">
                  <span>Current System Stock for {selectedVariant.variant_name}:</span>
                  <span className="font-bold text-cyan-300 text-sm">{selectedVariant.quantity_available} units</span>
                </div>
              )}
            </div>
          )}

          {/* Store Selector */}
          <div className="space-y-2">
            <Label htmlFor="store" className="text-blue-200">
              Godown / Store *
            </Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger className="bg-slate-700 border-blue-500/30 text-white">
                <SelectValue placeholder="Select godown" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-blue-500/30">
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id} className="text-white">
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode Tabs: Physical Count (Audit) vs Delta Adjustment */}
          <div className="flex rounded-md bg-slate-900/60 p-1 border border-blue-500/20">
            <button
              type="button"
              className={`flex-1 text-xs py-1.5 rounded font-medium transition-all ${
                auditMode === 'count' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => {
                setAuditMode('count');
                setQuantityChange('');
                setPhysicalCount('');
              }}
            >
              Physical Stocktake (Count on floor)
            </button>
            <button
              type="button"
              className={`flex-1 text-xs py-1.5 rounded font-medium transition-all ${
                auditMode === 'delta' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => {
                setAuditMode('delta');
                setQuantityChange('');
                setPhysicalCount('');
              }}
            >
              Direct Quantity Delta (+ / -)
            </button>
          </div>

          {/* System Stock Card */}
          {itemId && (!hasVariants || selectedVariantId) && (
            <div className="p-3 bg-slate-900/40 border border-slate-700 rounded-lg flex justify-between items-center text-sm">
              <span className="text-slate-300">System Recorded Stock:</span>
              <span className="font-bold text-lg text-white">{currentSystemStock} units</span>
            </div>
          )}

          {/* Inputs depending on Mode */}
          {auditMode === 'count' ? (
            <div className="space-y-2">
              <Label className="text-blue-200">
                Physical Counted Quantity * (What you actually see on the floor)
              </Label>
              <Input
                type="number"
                min="0"
                value={physicalCount}
                onChange={(e) => setPhysicalCount(e.target.value)}
                placeholder={`e.g. ${currentSystemStock}`}
                className="bg-slate-700 border-blue-500/30 text-white font-semibold text-lg"
                required
              />

              {physicalCount !== '' && (
                <div
                  className={`p-2.5 rounded-md text-xs font-medium flex items-center justify-between border ${
                    varianceNum === 0
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : varianceNum > 0
                      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                      : 'bg-red-500/10 text-red-300 border-red-500/30'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {varianceNum === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    {varianceNum === 0
                      ? 'Count matches system exactly'
                      : varianceNum > 0
                      ? 'Surplus stock detected'
                      : 'Shortage / Loss detected'}
                  </span>
                  <span>
                    Adjustment: <strong>{varianceNum > 0 ? `+${varianceNum}` : varianceNum} units</strong>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-blue-200">
                Quantity Change * (e.g. -2 for shortage, +5 for surplus)
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantityChange}
                onChange={(e) => setQuantityChange(e.target.value)}
                placeholder="e.g. -5 or +10"
                className="bg-slate-700 border-blue-500/30 text-white font-semibold"
                required
              />
            </div>
          )}

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label htmlFor="type" className="text-blue-200">
              Adjustment Category *
            </Label>
            <Select value={adjustmentType} onValueChange={(value: any) => setAdjustmentType(value)}>
              <SelectTrigger className="bg-slate-700 border-blue-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-blue-500/30">
                <SelectItem value="physical_count" className="text-white">
                  Physical Count Correction (Audit)
                </SelectItem>
                <SelectItem value="damaged" className="text-white">
                  Damaged Goods
                </SelectItem>
                <SelectItem value="theft" className="text-white">
                  Theft / Pilferage
                </SelectItem>
                <SelectItem value="other" className="text-white">
                  Other Reconciliation
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-blue-200">
              Audit Reason / Batch Reference
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Monthly Godown Audit, Bin Verification"
              className="bg-slate-700 border-blue-500/30 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-blue-200">
              Audit Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Details on physical inspection, rack number, condition..."
              className="bg-slate-700 border-blue-500/30 text-white resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-blue-500/30 text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={
                createAdjustment.isPending ||
                !itemId ||
                !storeId ||
                (hasVariants && !selectedVariantId) ||
                quantityChange === '' ||
                isNaN(varianceNum)
              }
            >
              {createAdjustment.isPending ? 'Applying...' : 'Confirm Audit Adjustment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
