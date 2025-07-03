import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface PurchaseQuantitySectionProps {
  quantity: number;
  totalCost: number;
  onQuantityChange: (quantity: number) => void;
  onTotalCostChange: (totalCost: number) => void;
}

export default function PurchaseQuantitySection({ 
  quantity, 
  totalCost, 
  onQuantityChange, 
  onTotalCostChange 
}: PurchaseQuantitySectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity" className="text-blue-200">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            placeholder="Enter quantity"
            value={quantity || ''}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 0)}
            required
            min="1"
            className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalCost" className="text-blue-200">Total Cost *</Label>
          <Input
            id="totalCost"
            type="number"
            step="0.01"
            placeholder="Enter total cost"
            value={totalCost || ''}
            onChange={(e) => onTotalCostChange(parseFloat(e.target.value) || 0)}
            required
            min="0"
            className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
          />
        </div>
      </div>

      {quantity > 0 && totalCost > 0 && (
        <div className="p-4 neon-border bg-gradient-to-r from-green-400/10 to-cyan-400/10 rounded-md">
          <p className="text-cyan-300">
            Unit Cost: ₹{(totalCost / quantity).toFixed(2)}
          </p>
        </div>
      )}
    </>
  );
}