import React from 'react';
import { HubPage, TabOption } from '@/components/layout/HubPage';
import Sales from '../Sales';

const SalesIntelligence = React.lazy(() => import('../SalesIntelligence'));

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
  {
    id: 'intelligence',
    label: 'Intelligence',
    component: SalesIntelligence,
  },
];

export default function SalesHub() {
  return (
    <HubPage
      title="Sales Hub"
      description="Manage sales orders, customer quotes, and salesperson performance"
      tabs={tabs}
      defaultTab="orders"
    />
  );
}
