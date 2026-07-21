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
  supplier_id?: string;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
  stock_received_date?: string;
  last_restocked_date?: string;
  created_at?: string;
  updated_at?: string;
}

export enum DeliveryStatus {
  Pending = 'Pending',
  InTransit = 'In Transit',
  Delivered = 'Delivered',
  Shipped = 'Shipped',
  Cancelled = 'Cancelled',
  PaidInFull = 'Paid in Full'
}

export interface Purchase {
  id: string;
  store_id: string;
  item_id: string;
  item_name: string;
  supplier_id?: string;
  invoice_number?: string;
  quantity: number;
  total_cost: number;
  date: string;
  created_at?: string;
}

export interface CreatePurchaseData {
  store_id: string;
  item_id: string;
  item_name: string;
  supplier_id?: string;
  invoice_number?: string;
  quantity: number;
  total_cost: number;
  date: string;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  store_id: string;
  supplier_id: string | null;
  delivery_status: string;
  date: string;
  total_amount: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  delivery_date?: string | null;
  advance_paid?: number;
  balance_due?: number;
  created_at: string;
  updated_at: string;
  sales_order_items?: {
    id: string;
    item_id: string | null;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

export interface SalesOrderItem {
  id: string;
  order_id: string;
  item_id: string;
  item_name: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CreateSalesOrderData {
  order_number: string;
  store_id: string;
  supplier_id: string | null;
  delivery_status: DeliveryStatus;
  date: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  delivery_date?: string | null;
  advance_paid?: number;
  description?: string | null;
  document_type?: 'order' | 'quote';
  items: {
    item_id: string;
    item_name: string;
    variant_id?: string | null;
    supplier_id?: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
  customizations?: {
    item_id: string;
    bom_component_id: string;
    selected_material_id: string;
    selected_option_name: string;
    quantity_used: number;
  }[];
}

export interface Sale {
  id: string;
  store_id: string;
  item_id: string;
  item_name: string;
  supplier_id?: string;
  quantity: number;
  total_price: number;
  delivery_status: DeliveryStatus;
  date: string;
  created_at?: string;
}

export interface CreateSaleData {
  store_id: string;
  item_id: string;
  item_name: string;
  supplier_id?: string;
  quantity: number;
  total_price: number;
  delivery_status: DeliveryStatus;
  date: string;
}

export interface Payment {
  id: string;
  store_id: string;
  supplier_id?: string;
  amount: number;
  type: string;
  date: string;
  description?: string;
  created_at?: string;
}

export interface CreatePaymentData {
  store_id: string;
  supplier_id?: string;
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
