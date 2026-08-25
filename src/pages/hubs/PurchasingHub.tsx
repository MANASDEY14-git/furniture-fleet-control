import React from 'react';
import { HubPage, TabOption } from '@/components/layout/HubPage';

const Purchases = React.lazy(() => import('../Purchases'));
const ReorderIntelligence = React.lazy(() => import('../ReorderIntelligence'));
const Suppliers = React.lazy(() => import('../Suppliers'));
const SupplierLedger = React.lazy(() => import('../SupplierLedger'));

const tabs: TabOption[] = [
  {
    id: 'purchases',
    label: 'Purchase Orders',
    component: Purchases,
  },
  {
    id: 'reorder',
    label: 'Reorder & Dead Stock',
    component: ReorderIntelligence,
  },
  {
    id: 'suppliers',
    label: 'Suppliers',
    component: Suppliers,
  },
  {
    id: 'ledger',
    label: 'Supplier Ledger',
    component: SupplierLedger,
  },
];

export default function PurchasingHub() {
  return (
    <HubPage
      title="Purchasing Hub"
      description="Manage suppliers, purchase invoices, ledgers, and reorder intelligence"
      tabs={tabs}
      defaultTab="purchases"
    />
  );
}
