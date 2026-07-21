import { Package, Plus, Calculator, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BOMHeaderProps {
  totalItems: number;
  itemsWithBOM: number;
  activeBOMs: number;
  avgComponents: number;
  onCreateNew: () => void;
  onViewAnalytics: () => void;
  onViewTemplates: () => void;
}

export function BOMHeader({
  totalItems,
  itemsWithBOM,
  activeBOMs,
  avgComponents,
  onCreateNew,
  onViewAnalytics,
  onViewTemplates,
}: BOMHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Enhanced BOM Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage product components, materials, and cost analysis with advanced features
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={onViewTemplates}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Templates
          </Button>
          <Button 
            variant="outline" 
            onClick={onViewAnalytics}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            Analytics
          </Button>
          <Button 
            onClick={onCreateNew}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create BOM
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-primary/20 bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold text-primary">{totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary/20 bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Items with BOM</p>
                <p className="text-2xl font-bold text-secondary">{itemsWithBOM}</p>
              </div>
              <Package className="h-8 w-8 text-secondary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active BOMs</p>
                <p className="text-2xl font-bold text-accent">{activeBOMs}</p>
              </div>
              <Badge variant="secondary" className="bg-accent/20 text-accent">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Components</p>
                <p className="text-2xl font-bold text-warning">{avgComponents}</p>
              </div>
              <Calculator className="h-8 w-8 text-warning/60" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}