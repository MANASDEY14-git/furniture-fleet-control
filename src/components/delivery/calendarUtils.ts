
import moment from 'moment';
import type { DeliveryEvent } from '@/types/erp';

export const eventStyleGetter = (event: DeliveryEvent) => {
  let backgroundColor = '#10b981'; // green for upcoming
  
  if (event.status === 'overdue') {
    backgroundColor = '#ef4444'; // red for overdue
  } else if (event.status === 'today') {
    backgroundColor = '#f59e0b'; // yellow for today
  }

  return {
    style: {
      backgroundColor,
      borderRadius: '6px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block',
      fontSize: '12px',
      padding: '2px 4px',
    },
  };
};

export const transformSalesDataToEvents = (
  salePaymentStatus: any[],
  stores: any[],
  salesOrders: any[]
): DeliveryEvent[] => {
  return salePaymentStatus
    .filter(sale => sale.delivery_date)
    .map(sale => {
      const deliveryDate = new Date(sale.delivery_date!);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let status: 'overdue' | 'today' | 'upcoming' = 'upcoming';
      if (deliveryDate < today) {
        status = 'overdue';
      } else if (deliveryDate.toDateString() === today.toDateString()) {
        status = 'today';
      }

      const store = stores.find(s => s.id === sale.store_id);
      const salesOrder = salesOrders.find(order => order.id === sale.sale_id);
      
      return {
        id: sale.sale_id,
        title: sale.order_number,
        start: deliveryDate,
        end: deliveryDate,
        customer_name: sale.customer_name || 'Walk-in Customer',
        customer_phone: sale.customer_phone || 'N/A',
        customer_address: sale.customer_address || 'N/A',
        items: salesOrder?.sales_order_items || [],
        store_name: store?.name || 'Unknown Store',
        balance_due: sale.balance_due,
        status,
        order_number: sale.order_number,
      } as DeliveryEvent;
    });
};
