import { useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BOMHeader } from '@/components/bom/enhanced/BOMHeader';
import { EnhancedBOMTable } from '@/components/bom/enhanced/EnhancedBOMTable';
import { BOMFormWizard } from '@/components/bom/enhanced/BOMFormWizard';
import { BOMCostAnalytics } from '@/components/bom/BOMCostAnalytics';
import { BOMTemplates } from '@/components/bom/BOMTemplates';
import { EnhancedBOMManager } from '@/components/bom/enhanced/EnhancedBOMManager';
import { useItems } from '@/hooks/useItems';
import { useEnhancedBOMList, useCreateEnhancedBOM } from '@/hooks/useEnhancedBOM';

export default function BOMManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'list' | 'analytics' | 'templates'>('list');
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [selectedItemForBOM, setSelectedItemForBOM] = useState<{ id: string; name: string } | null>(null);
  
  const { data: items = [] } = useItems();
  const { data: bomList = [] } = useEnhancedBOMList();
  const createBOM = useCreateEnhancedBOM();

  const itemsWithBOM = bomList.length;
  const activeBOMs = bomList.filter(bom => bom.is_active).length;
  const avgComponents = bomList.length > 0 
    ? (bomList.reduce((sum, bom) => sum + bom.component_count, 0) / bomList.length).toFixed(1) 
    : '0';

  const handleCreateBOM = () => {
    setSelectedItemForBOM(null); // Reset selection to start from item selection step
    setShowCreateWizard(true);
  };

  const handleBOMSubmit = async (data: any) => {
    try {
      await createBOM.mutateAsync(data);
      setShowCreateWizard(false);
      setSelectedItemForBOM(null);
    } catch (error) {
      console.error('Error creating BOM:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Stats */}
      <BOMHeader
        totalItems={items.length}
        itemsWithBOM={itemsWithBOM}
        activeBOMs={activeBOMs}
        avgComponents={parseFloat(avgComponents)}
        onCreateNew={handleCreateBOM}
        onViewAnalytics={() => setActiveTab('analytics')}
        onViewTemplates={() => setActiveTab('templates')}
      />

      {/* Search and Filter Bar */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
              <Input
                placeholder="Search items, materials, or BOMs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700/50 border-blue-500/30 text-white placeholder-blue-300"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 bg-slate-700/50 border-blue-500/30 text-white">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="accessories">Accessories</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="border-blue-500/30 text-blue-200 hover:bg-blue-800/30">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'list' && (
          <EnhancedBOMTable 
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            onSelectItem={(item) => setSelectedItemForBOM(item)}
          />
        )}
        
        {activeTab === 'analytics' && (
          <BOMCostAnalytics />
        )}
        
        {activeTab === 'templates' && (
          <BOMTemplates />
        )}
        
        {/* Enhanced BOM Manager for selected item */}
        {selectedItemForBOM && (
          <EnhancedBOMManager itemId={selectedItemForBOM.id} />
        )}
      </div>

      {/* Create BOM Wizard Dialog */}
      <Dialog open={showCreateWizard} onOpenChange={setShowCreateWizard}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New BOM</DialogTitle>
            <DialogDescription>Follow the steps to create a Bill of Materials for a selected item.</DialogDescription>
          </DialogHeader>
          {showCreateWizard && (
            <BOMFormWizard
              itemId={selectedItemForBOM?.id}
              itemName={selectedItemForBOM?.name}
              onSubmit={handleBOMSubmit}
              onCancel={() => {
                setShowCreateWizard(false);
                setSelectedItemForBOM(null);
              }}
              isLoading={createBOM.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}