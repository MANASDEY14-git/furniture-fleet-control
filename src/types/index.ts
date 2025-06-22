
export interface Store {
  id: string;
  name: string;
  location: string;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  storeId: string;
  quantityAvailable: number;
  costPrice: number;
  sellingPrice: number;
}

export interface Sale {
  id: string;
  storeId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  totalPrice: number;
  deliveryStatus: 'Pending' | 'Delivered';
  date: string;
}

export interface Purchase {
  id: string;
  storeId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  totalCost: number;
  date: string;
}

export interface Payment {
  id: string;
  storeId: string;
  amount: number;
  type: 'Payment' | 'Receipt';
  date: string;
  description?: string;
}

export interface DashboardMetrics {
  totalSalesToday: number;
  totalStockValue: number;
  paymentsReceived: number;
  pendingDeliveries: number;
}
