import React, { useState } from 'react';
import { HubPage, TabOption } from '@/components/layout/HubPage';

const Materials = React.lazy(() => import('../Materials'));
const MaterialPurchases = React.lazy(() => import('../MaterialPurchases'));
const MaterialStockLedger = React.lazy(() => import('../MaterialStockLedger'));
const BOMManagement = React.lazy(() => import('../BOMManagement'));

const tabs: TabOption[] = [
  {
    id: 'materials',
    label: 'Materials',
    component: Materials,
  },
  {
    id: 'purchases',
    label: 'Purchases',
    component: MaterialPurchases,
  },
  {
    id: 'ledger',
    label: 'Stock Ledger',
    component: MaterialStockLedger,
  },
  {
    id: 'bom',
    label: 'BOM',
    component: BOMManagement,
  },
];

export default function MaterialsHub() {
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  return (
    <HubPage
      title="Materials Hub"
      description="Manage raw materials stock, purchases, and Bill of Materials"
      tabs={tabs}
      defaultTab="materials"
      extraProps={{
        selectedMaterialId,
        defaultSelectedMaterialId: selectedMaterialId,
        onSelectMaterialId: setSelectedMaterialId,
      }}
    />
  );
}
