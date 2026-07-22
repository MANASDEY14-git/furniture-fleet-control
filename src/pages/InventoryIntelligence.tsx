import { useState } from 'react';
import { useStoreContext } from '@/contexts/StoreContext';
import { useInventoryIntelligence, type InventoryIntelligenceFilters, type InventoryIntelligenceItem } from '@/hooks/useInventoryIntelligence';
import { InventoryIntelligenceHeader } from '@/components/inventory-intelligence/InventoryIntelligenceHeader';
import { InventoryKpiCards } from '@/components/inventory-intelligence/InventoryKpiCards';
import { BusinessInsights } from '@/components/inventory-intelligence/BusinessInsights';
import { InventoryAgeAnalysis } from '@/components/inventory-intelligence/InventoryAgeAnalysis';
import { HeroProductAnalytics } from '@/components/inventory-intelligence/HeroProductAnalytics';
import { FastMovingProducts } from '@/components/inventory-intelligence/FastMovingProducts';
import { CashLockedInventory } from '@/components/inventory-intelligence/CashLockedInventory';
import { CategoryIntelligence } from '@/components/inventory-intelligence/CategoryIntelligence';
import { InventoryFilters } from '@/components/inventory-intelligence/InventoryFilters';
import { ProductDetailDrawer } from '@/components/inventory-intelligence/ProductDetailDrawer';

export default function InventoryIntelligence() {
  const { activeStoreId, activeStore } = useStoreContext();

  const [filters, setFilters] = useState<InventoryIntelligenceFilters>({
    storeId: activeStoreId,
  });

  const [selectedProduct, setSelectedProduct] = useState<InventoryIntelligenceItem | null>(null);

  // Sync active store from context
  const currentStoreId = activeStoreId === 'all' ? undefined : activeStoreId;
  const activeFilters: InventoryIntelligenceFilters = {
    ...filters,
    storeId: currentStoreId,
  };

  const { data: items = [], isLoading, refetch } = useInventoryIntelligence(activeFilters);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto">
      {/* Header */}
      <InventoryIntelligenceHeader
        items={items}
        isLoading={isLoading}
        onRefresh={refetch}
        activeStoreName={activeStoreId === 'all' ? 'All Stores' : activeStore?.name}
      />

      {/* Filter Bar */}
      <InventoryFilters
        filters={activeFilters}
        onChange={setFilters}
        items={items}
      />

      {/* Top 8 KPI Cards */}
      <InventoryKpiCards items={items} isLoading={isLoading} />

      {/* Deterministic Executive AI Insights */}
      <BusinessInsights items={items} />

      {/* Hero Products & Fast Movers Side-by-Side Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HeroProductAnalytics items={items} onSelectProduct={setSelectedProduct} />
        <FastMovingProducts items={items} onSelectProduct={setSelectedProduct} />
      </div>

      {/* Inventory Age Analysis */}
      <InventoryAgeAnalysis items={items} />

      {/* Cash Locked Inventory */}
      <CashLockedInventory items={items} onSelectProduct={setSelectedProduct} />

      {/* Category Performance Intelligence */}
      <CategoryIntelligence items={items} />

      {/* Product Detail Drawer */}
      <ProductDetailDrawer item={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
