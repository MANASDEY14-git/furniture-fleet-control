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
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            placeholder="Enter quantity"
            value={quantity || ''}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 0)}
            required
            min="1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalCost">Total Cost *</Label>
          <Input
            id="totalCost"
            type="number"
            step="0.01"
            placeholder="Enter total cost"
            value={totalCost || ''}
            onChange={(e) => onTotalCostChange(parseFloat(e.target.value) || 0)}
            required
            min="0"
          />
        </div>
      </div>

      {quantity > 0 && totalCost > 0 && (
        <div className="p-4 bg-primary/10 rounded-md">
          <p className="text-foreground">
            Unit Cost: ₹{(totalCost / quantity).toFixed(2)}
          </p>
        </div>
      )}
    </>
  );
}
