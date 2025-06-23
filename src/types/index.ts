
export interface Store {
  id: string;
  name: string;
  location: string;
  created_at?: string;
  updated_at?: string;
}

export interface Item {
  id: string;
  name: string;
  category_id: string;
  store_id: string;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
  created_at?: string;
  updated_at?: string;
}

export enum DeliveryStatus {
  Pending = 'Pending',
  Shipped = 'Shipped',
  Delivered = 'Delivered',
  Cancelled = 'Cancelled',
  PaidInFull = 'Paid in Full'
}

export interface Sale {
  id: string;
  store_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  total_price: number;
  delivery_status: DeliveryStatus;
  date: string;
  created_at?: string;
}

export interface Purchase {
  id: string;
  store_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  total_cost: number;
  date: string;
  created_at?: string;
}

export interface CreatePurchaseData {
  store_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  total_cost: number;
  date: string;
}

export interface CreateSaleData {
  store_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  total_price: number;
  delivery_status: DeliveryStatus;
  date: string;
}

export interface Payment {
  id: string;
  store_id: string;
  amount: number;
  type: string;
  date: string;
  description?: string;
  created_at?: string;
}

export interface DashboardMetrics {
  totalSalesToday: number;
  totalStockValue: number;
  paymentsReceived: number;
  pendingDeliveries: number;
}

export interface EnhancedDashboardMetrics extends DashboardMetrics {
  totalProfitToday: number;
  profitMarginPercentage: number;
  totalSales: number;
  totalPurchases: number;
  totalProfit: number;
}

export interface TopSellingItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface LowStockItem {
  name: string;
  quantity_available: number;
  selling_price: number;
}

export interface SalesWithItem extends Sale {
  items?: {
    cost_price: number;
    selling_price: number;
    name: string;
    quantity_available: number;
  } | null;
}

export interface ItemFormValues {
  name: string;
  category_id: string;
  store_id: string;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
}

export interface SalesTrendData {
  date: string;
  sales: number;
  profit: number;
}

export type DateFilter = 'today' | 'week' | 'month' | 'custom';
