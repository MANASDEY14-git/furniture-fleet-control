import React from 'react';
import { HubPage, TabOption } from '@/components/layout/HubPage';

const Payments = React.lazy(() => import('../Payments'));
const BankBook = React.lazy(() => import('../BankBook'));
const GeneralLedger = React.lazy(() => import('../GeneralLedger'));
const Reports = React.lazy(() => import('../Reports'));

const tabs: TabOption[] = [
  {
    id: 'general-ledger',
    label: 'Double-Entry GL & Day Book',
    component: GeneralLedger,
  },
  {
    id: 'payments',
    label: 'Expenses & Payments',
    component: Payments,
  },
  {
    id: 'bank-book',
    label: 'Cash & Bank Book',
    component: BankBook,
  },
  {
    id: 'reports',
    label: 'Reports',
    component: Reports,
  },
];

export default function FinanceHub() {
  return (
    <HubPage
      title="Finance Hub"
      description="Vendor payments, business expenses, cash flow, bank ledgers, and reports"
      tabs={tabs}
      defaultTab="payments"
    />
  );
}
