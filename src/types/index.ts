
// Updated types to match Supabase schema exactly
export interface Store {
  id: string;
  name: string;
  location: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
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

export type DeliveryStatus = 'Pending' | 'Paid in Full' | 'Delivered';

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

export type PaymentType = 'Payment' | 'Receipt';

export interface Payment {
  id: string;
  store_id: string;
  amount: number;
  type: PaymentType;
  date: string;
  description?: string;
  created_at?: string;
}

// Interfaces for joined data queries
export interface ItemWithDetails extends Item {
  store_name?: string;
  category_name?: string;
}

export interface SaleWithDetails extends Sale {
  store_name?: string;
  item?: Item;
}

export interface PurchaseWithDetails extends Purchase {
  store_name?: string;
  item?: Item;
}

export interface PaymentWithDetails extends Payment {
  store_name?: string;
}

// Dashboard metrics interface
export interface DashboardMetrics {
  totalSalesToday: number;
  totalStockValue: number;
  paymentsReceived: number;
  pendingDeliveries: number;
}

// Form data interfaces for create operations
export interface CreateStoreData {
  name: string;
  location: string;
}

export interface CreateCategoryData {
  name: string;
}

export interface CreateItemData {
  name: string;
  category_id: string;
  store_id: string;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
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

export interface CreatePurchaseData {
  store_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  total_cost: number;
  date: string;
}

export interface CreatePaymentData {
  store_id: string;
  amount: number;
  type: PaymentType;
  date: string;
  description?: string;
}

// Update data interfaces
export interface UpdateStoreData {
  id: string;
  name?: string;
  location?: string;
}

export interface UpdateCategoryData {
  id: string;
  name?: string;
}

export interface UpdateItemData {
  id: string;
  name?: string;
  category_id?: string;
  store_id?: string;
  quantity_available?: number;
  cost_price?: number;
  selling_price?: number;
}
