
export interface DeliveryEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: Array<{
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  store_name: string;
  balance_due: number;
  status: 'overdue' | 'today' | 'upcoming';
  order_number: string;
}
