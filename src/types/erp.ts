
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
  status: 'overdue' | 'today' | 'upcoming' | 'delivered';
  order_number: string;
  is_delivered?: boolean;
  delivered_at?: string | null;
}

export interface PaymentSummary {
  store_id: string;
  total_receipts: number;
  total_payments: number;
  net_balance: number;
}

export interface DashboardMetrics {
  totalSales: number;
  totalPurchases: number;
  grossProfit: number;
  lowStockCount: number;
  outstandingBalance: number;
  supplierPayable: number;
}

export interface SalePaymentStatus {
  sale_id: string;
  store_id: string;
  supplier_id: string;
  order_number: string;
  sale_date: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_status: string;
  delivery_date: string;
  total_price: number;
  total_paid: number;
  balance_due: number;
}
