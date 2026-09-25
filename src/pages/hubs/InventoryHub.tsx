import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HubPage, TabOption } from '@/components/layout/HubPage';

const Inventory = React.lazy(() => import('../Inventory'));
const InventoryIntelligence = React.lazy(() => import('../InventoryIntelligence'));
const StockLedger = React.lazy(() => import('../StockLedger'));
const StockTransfers = React.lazy(() => import('../StockTransfers'));

const tabs: TabOption[] = [
  {
    id: 'stock',
    label: 'Stock',
    component: Inventory,
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    component: InventoryIntelligence,
  },
  {
    id: 'ledger',
    label: 'Stock Ledger',
    component: StockLedger,
  },
  {
    id: 'transfers',
    label: 'Transfers',
    component: StockTransfers,
  },
];

export default function InventoryHub() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [, setSearchParams] = useSearchParams();

  const handleSelectLedgerItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setSearchParams({ tab: 'ledger' }, { replace: true });
  };

  return (
    <HubPage
      title="Inventory Hub"
      description="Manage outlet stock, transfers, intelligence, and ledger records"
      tabs={tabs}
      defaultTab="stock"
      extraProps={{
        selectedItemId,
        onSelectLedgerItem: handleSelectLedgerItem,
      }}
    />
  );
}
