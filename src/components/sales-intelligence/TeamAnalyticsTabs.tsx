import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, PackageCheck, Users, ShieldAlert, TrendingUp } from 'lucide-react';
import { CategoryProductMixChart } from './CategoryProductMixChart';
import { InventoryClearanceSection } from './InventoryClearanceSection';
import { CoSellingSynergySection } from './CoSellingSynergySection';
import { DiscountAnalysisSection } from './DiscountAnalysisSection';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import type { SalesIntelligenceSummary } from '@/hooks/useSalesIntelligence';

interface TeamAnalyticsTabsProps {
  summary?: SalesIntelligenceSummary;
}

export function TeamAnalyticsTabs({ summary }: TeamAnalyticsTabsProps) {
  if (!summary) return null;

  return (
    <Tabs defaultValue="product_mix" className="space-y-4">
      <TabsList className="bg-card border border-border/50 p-1 w-full justify-start overflow-x-auto h-auto flex-wrap">
        <TabsTrigger value="product_mix" className="gap-1.5 text-xs py-2 px-3">
          <Layers className="h-3.5 w-3.5 text-primary" /> Product Mix Intelligence
        </TabsTrigger>
        <TabsTrigger value="clearance" className="gap-1.5 text-xs py-2 px-3">
          <PackageCheck className="h-3.5 w-3.5 text-indigo-500" /> Aged Inventory Clearance
        </TabsTrigger>
        <TabsTrigger value="coselling" className="gap-1.5 text-xs py-2 px-3">
          <Users className="h-3.5 w-3.5 text-purple-500" /> Co-Selling 50-50 Synergy
        </TabsTrigger>
        <TabsTrigger value="discounts" className="gap-1.5 text-xs py-2 px-3">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-500" /> Discount Compliance
        </TabsTrigger>
        <TabsTrigger value="trends" className="gap-1.5 text-xs py-2 px-3">
          <TrendingUp className="h-3.5 w-3.5 text-blue-500" /> Monthly Trends
        </TabsTrigger>
      </TabsList>

      <TabsContent value="product_mix" className="space-y-4 m-0">
        <CategoryProductMixChart categories={summary.teamCategoryMix} />
      </TabsContent>

      <TabsContent value="clearance" className="space-y-4 m-0">
        <InventoryClearanceSection salespeople={summary.salespeople} />
      </TabsContent>

      <TabsContent value="coselling" className="space-y-4 m-0">
        <CoSellingSynergySection pairs={summary.coSellingPairs} />
      </TabsContent>

      <TabsContent value="discounts" className="space-y-4 m-0">
        <DiscountAnalysisSection salespeople={summary.salespeople} />
      </TabsContent>

      <TabsContent value="trends" className="space-y-4 m-0">
        <MonthlyTrendChart data={summary.teamMonthlyTrends} />
      </TabsContent>
    </Tabs>
  );
}
