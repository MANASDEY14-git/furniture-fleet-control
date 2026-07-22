import React from 'react';
import { Download, Printer, RefreshCw, Sparkles, Store, Calendar, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { SalesIntelligenceSummary } from '@/hooks/useSalesIntelligence';

interface SalesIntelligenceHeaderProps {
  summary?: SalesIntelligenceSummary;
  isLoading: boolean;
  onRefresh: () => void;
  activeStoreName?: string;
  onOpenPrintSheet?: () => void;
}

export function SalesIntelligenceHeader({
  summary,
  isLoading,
  onRefresh,
  activeStoreName = 'All Stores',
  onOpenPrintSheet
}: SalesIntelligenceHeaderProps) {
  const handleExportExcel = () => {
    if (!summary || !summary.salespeople) {
      toast.error('No data available for export');
      return;
    }

    try {
      // 1. Leaderboard Sheet
      const leaderboardData = summary.salespeople.map((sp, idx) => ({
        Rank: idx + 1,
        Name: sp.name,
        Role: sp.role,
        Branch: sp.branchName,
        'Monthly Revenue (₹)': sp.monthlyRevenue,
        'Gross Profit (₹)': sp.monthlyProfit,
        'Profit Margin (%)': `${sp.profitMarginPct}%`,
        'Orders Closed': sp.ordersClosed,
        'Units Sold': sp.unitsSold,
        'Avg Order Value (₹)': sp.avgOrderValue,
        'Target Achievement (%)': `${sp.achievementPct}%`,
        'Performance Score': sp.performanceScore,
        'Performance Tier': sp.scoreTier,
        'Status Badge': sp.badgeStatus,
        'Aged Inventory Cleared (₹)': sp.totalValueCleared,
        'Avg Discount (%)': `${sp.avgDiscountPct}%`,
        'CSAT Score': sp.csatScore,
      }));

      // 2. Co-Selling Duos Sheet
      const duoData = summary.coSellingPairs.map((pair, idx) => ({
        Rank: idx + 1,
        'Salesperson 1': pair.person1Name,
        'Salesperson 2': pair.person2Name,
        'Co-Closed Orders': pair.totalCoClosedOrders,
        'Shared Revenue (₹)': pair.totalSharedRevenue,
        'Shared Profit (₹)': pair.totalSharedProfit,
        'Duo AOV (₹)': pair.duoAOV,
        'AOV Boost (%)': `+${pair.aovBoostPct}%`,
        'Duo Win Rate (%)': `${pair.duoConversionRate}%`,
        'Synergy Index': pair.synergyScore,
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      const wsLeaderboard = XLSX.utils.json_to_sheet(leaderboardData);
      const wsDuos = XLSX.utils.json_to_sheet(duoData);

      XLSX.utils.book_append_sheet(wb, wsLeaderboard, 'Sales Performance');
      XLSX.utils.book_append_sheet(wb, wsDuos, 'Co-Selling Duos 50-50');

      XLSX.writeFile(wb, `Sales_Performance_Intelligence_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel performance intelligence report downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Excel report');
    }
  };

  const handleExportPDF = () => {
    toast.info('Generating PDF performance summary report...');
    window.print();
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1.5 px-2.5 py-1 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Executive Decision Dashboard
          </Badge>

          <Badge variant="outline" className="bg-accent/50 text-muted-foreground gap-1 text-xs">
            <Store className="h-3 w-3 text-primary" />
            {activeStoreName}
          </Badge>

          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs">
            <Calendar className="h-3 w-3" />
            July 2026 (MoM Comparative)
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5 bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
          Sales Performance Intelligence
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-3xl">
          Complete management view of salesperson profitability, 50-50 co-selling splits, aged inventory clearance, discount compliance, and data-driven coaching.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-1.5 border-border/60 hover:bg-accent text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </Button>

        {onOpenPrintSheet && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenPrintSheet}
            className="gap-1.5 border-border/60 hover:bg-accent text-xs hidden sm:flex"
          >
            <Printer className="h-3.5 w-3.5 text-primary" />
            <span>Print Review Sheet</span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
              <Download className="h-3.5 w-3.5" />
              <span>Export Report</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer text-xs">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <div>
                <div className="font-medium">Export Excel (.xlsx)</div>
                <div className="text-[10px] text-muted-foreground">Full team & 50-50 duo breakdown</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer text-xs">
              <FileText className="h-4 w-4 text-blue-600" />
              <div>
                <div className="font-medium">Export PDF / Print</div>
                <div className="text-[10px] text-muted-foreground">Formatted printable executive view</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
