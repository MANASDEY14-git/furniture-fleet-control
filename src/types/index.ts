export interface Store {
  id: string;
  name: string;
  location: string;
}

export interface Item {
  id: string;
  name: string;
  category_id: string;
  store_id: string;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
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
}

export interface Purchase {
  id: string;
  store_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  total_cost: number;
  date: string;
}

export interface Payment {
  id: string;
  store_id: string;
  amount: number;
  type: string;
  date: string;
  description?: string;
}

export interface DashboardMetrics {
  totalSalesToday: number;
  totalStockValue: number;
  paymentsReceived: number;
  pendingDeliveries: number;
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

export enum DeliveryStatus {
  Pending = 'Pending',
  Shipped = 'Shipped',
  Delivered = 'Delivered',
  Cancelled = 'Cancelled',
}
