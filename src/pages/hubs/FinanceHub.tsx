import React from 'react';
import { HubPage, TabOption } from '@/components/layout/HubPage';

const Payments = React.lazy(() => import('../Payments'));
const BankBook = React.lazy(() => import('../BankBook'));

const tabs: TabOption[] = [
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
];

export default function FinanceHub() {
  return (
    <HubPage
      title="Finance Hub"
      description="Manage vendor payments, business expenses, cash flow, and bank account ledgers"
      tabs={tabs}
      defaultTab="payments"
    />
  );
}
