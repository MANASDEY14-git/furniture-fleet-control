import { Button } from '@/components/ui/button';
import { Download, Printer, RefreshCw, Sparkles } from 'lucide-react';
import { exportInventoryToExcel, exportInventoryToPDF } from '@/utils/inventoryExportUtils';
import type { InventoryIntelligenceItem } from '@/hooks/useInventoryIntelligence';

interface InventoryIntelligenceHeaderProps {
  items: InventoryIntelligenceItem[];
  isLoading: boolean;
  onRefresh: () => void;
  activeStoreName?: string;
}

export function InventoryIntelligenceHeader({
  items,
  isLoading,
  onRefresh,
  activeStoreName = 'All Stores',
}: InventoryIntelligenceHeaderProps) {
  const lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 print:hidden">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Inventory Intelligence Dashboard
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>Real-time stock velocity, hero products & cash-lock analytics</span>
              <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground" />
              <span>Store: <strong className="text-foreground font-medium">{activeStoreName}</strong></span>
              <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground" />
              <span>Updated: {lastUpdated}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-9 gap-1.5"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => exportInventoryToPDF()}
          className="h-9 gap-1.5"
        >
          <Printer className="h-4 w-4" />
          <span className="hidden sm:inline">Print / PDF</span>
        </Button>

        <Button
          size="sm"
          onClick={() => exportInventoryToExcel(items, activeStoreName)}
          disabled={items.length === 0}
          className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Download className="h-4 w-4" />
          <span>Export Excel</span>
        </Button>
      </div>
    </div>
  );
}
