import { Package, Wrench, Settings, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type ComponentCategory = 'primary' | 'secondary' | 'optional' | 'consumable';

interface BOMComponentCategoriesProps {
  category: ComponentCategory;
  className?: string;
}

export function BOMComponentCategory({ category, className = '' }: BOMComponentCategoriesProps) {
  const categoryConfig = {
    primary: {
      label: 'Primary',
      icon: Package,
      variant: 'default' as const,
      className: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    secondary: {
      label: 'Secondary',
      icon: Wrench,
      variant: 'secondary' as const,
      className: 'bg-green-500/20 text-green-300 border-green-500/30'
    },
    optional: {
      label: 'Optional',
      icon: Settings,
      variant: 'outline' as const,
      className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    },
    consumable: {
      label: 'Consumable',
      icon: Zap,
      variant: 'destructive' as const,
      className: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    }
  };

  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.className} ${className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

export function getComponentCategoryColor(category: ComponentCategory): string {
  const colors = {
    primary: 'text-blue-300',
    secondary: 'text-green-300',
    optional: 'text-yellow-300',
    consumable: 'text-orange-300'
  };
  return colors[category];
}