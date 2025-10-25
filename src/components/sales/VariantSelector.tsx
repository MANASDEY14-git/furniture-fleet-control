import { useItemVariants } from '@/hooks/useItemVariants';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VariantSelectorProps {
  itemId: string;
  value?: string;
  onValueChange: (variantId: string, variantName: string, price: number, stock: number) => void;
  className?: string;
}

export default function VariantSelector({ itemId, value, onValueChange, className }: VariantSelectorProps) {
  const { data: variants = [], isLoading } = useItemVariants(itemId);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading variants...</div>;
  }

  if (!variants || variants.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <Label className="text-sm font-medium">Variant</Label>
      <Select 
        value={value} 
        onValueChange={(variantId) => {
          const variant = variants.find(v => v.id === variantId);
          if (variant) {
            onValueChange(
              variant.id, 
              variant.variant_name, 
              variant.selling_price,
              variant.quantity_available
            );
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select variant..." />
        </SelectTrigger>
        <SelectContent>
          {variants.map((variant) => (
            <SelectItem key={variant.id} value={variant.id}>
              {variant.variant_name} (Stock: {variant.quantity_available})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
