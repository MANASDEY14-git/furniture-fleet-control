
import AttributeManager from '@/components/AttributeManager';

export default function ItemAttributesTab() {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <AttributeManager />
      </div>
      <div className="text-center text-blue-300 text-sm">
        Manage global attributes that can be used across all items
      </div>
    </div>
  );
}
