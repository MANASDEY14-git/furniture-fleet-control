
import type { Item } from '@/hooks/useItems';
import ItemVariantManager from '@/components/ItemVariantManager';

interface ItemVariantsTabProps {
  item?: Item;
}

export default function ItemVariantsTab({ item }: ItemVariantsTabProps) {
  if (!item) {
    return (
      <div className="text-center py-8 text-blue-300">
        Save the item first to manage variants
      </div>
    );
  }

  return (
    <ItemVariantManager 
      item={item}
      trigger={<div />}
    />
  );
}
