import React, { useState } from 'react';
import { useStoreContext } from '@/contexts/StoreContext';
import {
  useSalesIntelligence,
  type SalesIntelligenceFilters,
  type SalespersonPerformance
} from '@/hooks/useSalesIntelligence';
import { SalesIntelligenceHeader } from '@/components/sales-intelligence/SalesIntelligenceHeader';
import { SalesFilters } from '@/components/sales-intelligence/SalesFilters';
import { ExecutiveKpiCards } from '@/components/sales-intelligence/ExecutiveKpiCards';
import { AIBusinessInsights } from '@/components/sales-intelligence/AIBusinessInsights';
import { SalespersonLeaderboard } from '@/components/sales-intelligence/SalespersonLeaderboard';
import { TeamAnalyticsTabs } from '@/components/sales-intelligence/TeamAnalyticsTabs';
import { SalespersonDetailDrawer } from '@/components/sales-intelligence/SalespersonDetailDrawer';
import { PrintableReviewSheet } from '@/components/sales-intelligence/PrintableReviewSheet';
import { QuickPastOrderDialog } from '@/components/sales-intelligence/QuickPastOrderDialog';
import { BulkImportSalesDialog } from '@/components/sales-intelligence/BulkImportSalesDialog';

export default function SalesIntelligence() {
  const { activeStoreId, activeStore } = useStoreContext();

  const [filters, setFilters] = useState<SalesIntelligenceFilters>({
    storeId: activeStoreId,
    dateRange: 'this_month',
  });

  const [selectedSalesperson, setSelectedSalesperson] = useState<SalespersonPerformance | null>(null);
  const [openTeamPrintSheet, setOpenTeamPrintSheet] = useState(false);
  const [openQuickPastOrder, setOpenQuickPastOrder] = useState(false);
  const [openBulkImport, setOpenBulkImport] = useState(false);

  // Sync active store from StoreContext
  const currentStoreId = activeStoreId === 'all' ? undefined : activeStoreId;
  const activeFilters: SalesIntelligenceFilters = {
    ...filters,
    storeId: currentStoreId,
  };

  const { data: summary, isLoading, refetch } = useSalesIntelligence(activeFilters);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto min-h-screen">
      {/* 1. Header with Data Entry Actions */}
      <SalesIntelligenceHeader
        summary={summary}
        isLoading={isLoading}
        onRefresh={refetch}
        activeStoreName={activeStoreId === 'all' ? 'All Stores' : activeStore?.name}
        onOpenPrintSheet={() => setOpenTeamPrintSheet(true)}
        onOpenQuickPastOrder={() => setOpenQuickPastOrder(true)}
        onOpenBulkImport={() => setOpenBulkImport(true)}
      />

      {/* 2. Filter Bar */}
      <SalesFilters
        filters={activeFilters}
        onChange={setFilters}
        salespeople={summary?.salespeople}
      />

      {/* 3. Executive KPI Cards (8 Metrics with MoM Comparative % Change) */}
      <ExecutiveKpiCards kpis={summary?.kpis} isLoading={isLoading} />

      {/* 4. AI Business Insights & Operational Summaries */}
      <AIBusinessInsights insights={summary?.insights} />

      {/* 5. Salesperson Performance Leaderboard Cards */}
      <SalespersonLeaderboard
        salespeople={summary?.salespeople}
        onSelectSalesperson={setSelectedSalesperson}
      />

      {/* 6. Macro Team Analytics Tabs (Product Mix, Aged Stock, Co-Selling 50-50, Discounts, Trends) */}
      <TeamAnalyticsTabs summary={summary} />

      {/* 7. Individual Salesperson Drill-Down Dashboard Drawer */}
      <SalespersonDetailDrawer
        salesperson={selectedSalesperson}
        onClose={() => setSelectedSalesperson(null)}
      />

      {/* 8. Quick Single Past Order Entry Modal */}
      <QuickPastOrderDialog
        open={openQuickPastOrder}
        onOpenChange={setOpenQuickPastOrder}
        onSuccessRefresh={refetch}
      />

      {/* 9. Bulk Import Past Sales (CSV/Excel) Modal */}
      <BulkImportSalesDialog
        open={openBulkImport}
        onOpenChange={setOpenBulkImport}
        onSuccessRefresh={refetch}
      />

      {/* 10. Printable Review Sheet Modal */}
      {summary?.salespeople && summary.salespeople.length > 0 && (
        <PrintableReviewSheet
          salesperson={summary.salespeople[0]}
          open={openTeamPrintSheet}
          onOpenChange={setOpenTeamPrintSheet}
        />
      )}
    </div>
  );
}
