import React from 'react';
import { HubPage, TabOption } from '@/components/layout/HubPage';
import Sales from '../Sales';

const SalesOrdersTab = (props: any) => <Sales {...props} defaultDocumentType="order" hideTabs hideHeader />;
const QuotesTab = (props: any) => <Sales {...props} defaultDocumentType="quote" hideTabs hideHeader />;

const tabs: TabOption[] = [
  {
    id: 'orders',
    label: 'Sales Orders',
    component: SalesOrdersTab,
  },
  {
    id: 'quotes',
    label: 'Quotes',
    component: QuotesTab,
  },
];

export default function SalesHub() {
  return (
    <HubPage
      title="Sales Hub"
      description="Manage sales orders, customer quotes, payments, and invoices"
      tabs={tabs}
      defaultTab="orders"
    />
  );
}
