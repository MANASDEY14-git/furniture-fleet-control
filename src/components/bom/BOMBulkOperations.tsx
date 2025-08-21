import { useState } from 'react';
import { Package, Download, Upload, Copy, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BOMListItem } from '@/types/bom';
import { useDeleteBOM } from '@/hooks/useEnhancedBOM';

interface BOMBulkOperationsProps {
  bomList: BOMListItem[];
  onRefresh: () => void;
}

export function BOMBulkOperations({ bomList, onRefresh }: BOMBulkOperationsProps) {
  const [selectedBOMs, setSelectedBOMs] = useState<string[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<'delete' | 'export' | 'duplicate' | 'recalculate'>('delete');
  const [isProcessing, setIsProcessing] = useState(false);

  const deleteBOM = useDeleteBOM();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBOMs(bomList.map(bom => bom.id));
    } else {
      setSelectedBOMs([]);
    }
  };

  const handleSelectBOM = (bomId: string, checked: boolean) => {
    if (checked) {
      setSelectedBOMs(prev => [...prev, bomId]);
    } else {
      setSelectedBOMs(prev => prev.filter(id => id !== bomId));
    }
  };

  const handleBulkOperation = async () => {
    if (selectedBOMs.length === 0) return;

    setIsProcessing(true);
    try {
      switch (bulkOperation) {
        case 'delete':
          for (const bomId of selectedBOMs) {
            await deleteBOM.mutateAsync(bomId);
          }
          break;
        case 'export':
          // Implement export functionality
          console.log('Exporting BOMs:', selectedBOMs);
          break;
        case 'duplicate':
          // Implement duplication functionality
          console.log('Duplicating BOMs:', selectedBOMs);
          break;
        case 'recalculate':
          // Implement cost recalculation
          console.log('Recalculating costs for BOMs:', selectedBOMs);
          break;
      }
      
      setSelectedBOMs([]);
      setShowBulkDialog(false);
      onRefresh();
    } catch (error) {
      console.error('Bulk operation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getOperationDetails = () => {
    switch (bulkOperation) {
      case 'delete':
        return {
          title: 'Delete BOMs',
          description: 'This will deactivate the selected BOMs. They can be reactivated later.',
          icon: Trash2,
          variant: 'destructive' as const
        };
      case 'export':
        return {
          title: 'Export BOMs',
          description: 'Export selected BOMs to Excel or CSV format.',
          icon: Download,
          variant: 'default' as const
        };
      case 'duplicate':
        return {
          title: 'Duplicate BOMs',
          description: 'Create copies of the selected BOMs with new version numbers.',
          icon: Copy,
          variant: 'default' as const
        };
      case 'recalculate':
        return {
          title: 'Recalculate Costs',
          description: 'Update cost calculations for selected BOMs based on current material prices.',
          icon: RefreshCw,
          variant: 'default' as const
        };
    }
  };

  const operationDetails = getOperationDetails();
  const OperationIcon = operationDetails.icon;

  return (
    <>
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-300 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Bulk Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedBOMs.length === bomList.length && bomList.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm text-blue-200">
                  Select All ({bomList.length} BOMs)
                </label>
              </div>
              
              {selectedBOMs.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-cyan-300">
                    {selectedBOMs.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkDialog(true)}
                    className="border-blue-500/30 text-blue-300"
                  >
                    Bulk Actions
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {bomList.map((bom) => (
                <div key={bom.id} className="flex items-center space-x-2 p-2 bg-slate-700/30 rounded">
                  <Checkbox
                    id={`bom-${bom.id}`}
                    checked={selectedBOMs.includes(bom.id)}
                    onCheckedChange={(checked) => handleSelectBOM(bom.id, checked as boolean)}
                  />
                  <label htmlFor={`bom-${bom.id}`} className="text-sm text-blue-100 flex-1 cursor-pointer">
                    {bom.item_name} - {bom.name || 'Unnamed BOM'}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <OperationIcon className="w-5 h-5" />
              Bulk Operations
            </DialogTitle>
            <DialogDescription>
              Choose an operation to perform on {selectedBOMs.length} selected BOMs.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Operation</label>
              <Select value={bulkOperation} onValueChange={(value: any) => setBulkOperation(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delete">Delete / Deactivate</SelectItem>
                  <SelectItem value="export">Export Data</SelectItem>
                  <SelectItem value="duplicate">Duplicate BOMs</SelectItem>
                  <SelectItem value="recalculate">Recalculate Costs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <OperationIcon className="h-4 w-4" />
              <AlertDescription>
                <strong>{operationDetails.title}</strong><br />
                {operationDetails.description}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={handleBulkOperation}
                disabled={isProcessing}
                variant={operationDetails.variant}
                className="flex-1"
              >
                {isProcessing ? 'Processing...' : `${operationDetails.title}`}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBulkDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}