import React from 'react';
import { HubPage, TabOption } from '@/components/layout/HubPage';

const DailyWorklist = React.lazy(() => import('../DailyWorklist'));
const Collections = React.lazy(() => import('../Collections'));
const DispatchBoard = React.lazy(() => import('../DispatchBoard'));
const DeliveryCalendar = React.lazy(() => import('../DeliveryCalendar'));

const tabs: TabOption[] = [
  {
    id: 'followups',
    label: 'Follow-ups',
    component: DailyWorklist,
  },
  {
    id: 'collections',
    label: 'Collections',
    component: Collections,
  },
  {
    id: 'dispatch',
    label: 'Dispatch',
    component: DispatchBoard,
  },
  {
    id: 'delivery',
    label: 'Delivery Calendar',
    component: DeliveryCalendar,
  },
];

export default function WorkHub() {
  return (
    <HubPage
      title="Daily Work Hub"
      description="Manage follow-ups, receivables collections, dispatch orders, and delivery calendar schedules"
      tabs={tabs}
      defaultTab="followups"
    />
  );
}
