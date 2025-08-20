import { Settings, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEnhancedBOMByItem } from '@/hooks/useEnhancedBOM';

interface CustomizableItemIndicatorProps {
  itemId: string;
  compact?: boolean;
}

export default function CustomizableItemIndicator({ itemId, compact = false }: CustomizableItemIndicatorProps) {
  const { data: bom } = useEnhancedBOMByItem(itemId);
  
  const hasCustomizableComponents = bom?.bom_components?.some(comp => comp.is_customizable) || false;
  
  if (!hasCustomizableComponents) return null;
  
  if (compact) {
    return (
      <div className="inline-flex items-center" title="Customizable Product">
        <Settings className="w-4 h-4 text-cyan-400" />
      </div>
    );
  }
  
  return (
    <Badge variant="secondary" className="neon-border bg-cyan-400/10 text-cyan-300 border-cyan-400/30">
      <Package className="w-3 h-3 mr-1" />
      Customizable
    </Badge>
  );
}