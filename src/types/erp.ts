
export interface SalePaymentStatus {
  sale_id: string;
  order_number: string;
  store_id: string;
  supplier_id: string | null;
  total_price: number;
  delivery_date: string | null;
  sale_date: string;
  delivery_status: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  total_paid: number;
  balance_due: number;
}

export interface PaymentSummary {
  store_id: string;
  total_receipts: number;
  total_payments: number;
  net_balance: number;
}

export interface DeliveryEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: string[];
  store_name: string;
  balance_due: number;
  status: 'overdue' | 'today' | 'upcoming';
}

export interface DashboardMetrics {
  totalSales: number;
  totalPurchases: number;
  grossProfit: number;
  lowStockCount: number;
  outstandingBalance: number;
  supplierPayable: number;
}
