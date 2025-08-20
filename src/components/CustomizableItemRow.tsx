import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEnhancedBOMByItem } from '@/hooks/useEnhancedBOM';

interface CustomizableItemRowProps {
  itemId: string;
  itemName: string;
  quantity: number;
  customizations?: any[];
  onCustomize: () => void;
}

export default function CustomizableItemRow({ 
  itemId, 
  itemName, 
  quantity, 
  customizations = [], 
  onCustomize 
}: CustomizableItemRowProps) {
  const { data: bom } = useEnhancedBOMByItem(itemId);
  
  const hasCustomizableComponents = bom?.bom_components?.some(comp => comp.is_customizable) || false;
  const isCustomized = customizations.length > 0;
  
  if (!hasCustomizableComponents) {
    return <span className="text-blue-400 text-sm">-</span>;
  }
  
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        onClick={onCustomize}
        size="sm"
        variant="outline"
        className="neon-border bg-slate-800/50 text-cyan-300 hover:bg-cyan-900/20"
        disabled={!itemId || quantity <= 0}
      >
        <Settings className="w-3 h-3 mr-1" />
        {isCustomized ? 'Edit' : 'Customize'}
      </Button>
      
      {isCustomized && (
        <Badge variant="secondary" className="text-xs bg-green-400/10 text-green-300 border-green-400/30">
          ✓ Customized ({customizations.length})
        </Badge>
      )}
    </div>
  );
}