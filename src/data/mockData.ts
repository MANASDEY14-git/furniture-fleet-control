
import { Store, Item, Sale, Purchase, Payment, DeliveryStatus } from '@/types';

export const stores: Store[] = [
  { id: '1', name: 'Downtown Furniture', location: 'Downtown' },
  { id: '2', name: 'Suburban Home Store', location: 'Suburbs' },
  { id: '3', name: 'Modern Living', location: 'Mall District' },
  { id: '4', name: 'Classic Furniture', location: 'Old Town' },
  { id: '5', name: 'Budget Home', location: 'East Side' },
  { id: '6', name: 'Luxury Interiors', location: 'Uptown' },
];

export const items: Item[] = [
  { id: '1', name: 'Oak Dining Table', category_id: 'cat1', store_id: '1', quantity_available: 5, cost_price: 500, selling_price: 799 },
  { id: '2', name: 'Leather Sofa', category_id: 'cat2', store_id: '1', quantity_available: 3, cost_price: 800, selling_price: 1299 },
  { id: '3', name: 'Queen Bed Frame', category_id: 'cat3', store_id: '2', quantity_available: 8, cost_price: 300, selling_price: 599 },
  { id: '4', name: 'Office Chair', category_id: 'cat4', store_id: '2', quantity_available: 12, cost_price: 150, selling_price: 299 },
  { id: '5', name: 'Coffee Table', category_id: 'cat2', store_id: '3', quantity_available: 6, cost_price: 200, selling_price: 399 },
  { id: '6', name: 'Wardrobe', category_id: 'cat3', store_id: '3', quantity_available: 4, cost_price: 600, selling_price: 999 },
];

export const sales: Sale[] = [
  { id: '1', store_id: '1', item_id: '1', item_name: 'Oak Dining Table', quantity: 1, total_price: 799, delivery_status: DeliveryStatus.Delivered, date: '2024-06-22' },
  { id: '2', store_id: '1', item_id: '2', item_name: 'Leather Sofa', quantity: 1, total_price: 1299, delivery_status: DeliveryStatus.Pending, date: '2024-06-22' },
  { id: '3', store_id: '2', item_id: '3', item_name: 'Queen Bed Frame', quantity: 2, total_price: 1198, delivery_status: DeliveryStatus.Delivered, date: '2024-06-21' },
];

export const purchases: Purchase[] = [
  { id: '1', store_id: '1', item_id: '1', item_name: 'Oak Dining Table', quantity: 10, total_cost: 5000, date: '2024-06-20' },
  { id: '2', store_id: '2', item_id: '3', item_name: 'Queen Bed Frame', quantity: 15, total_cost: 4500, date: '2024-06-19' },
];

export const payments: Payment[] = [
  { id: '1', store_id: '1', amount: 2098, type: 'Receipt', date: '2024-06-22', description: 'Daily sales' },
  { id: '2', store_id: '2', amount: 1198, type: 'Receipt', date: '2024-06-21', description: 'Bed frame sales' },
  { id: '3', store_id: '1', amount: 5000, type: 'Payment', date: '2024-06-20', description: 'Inventory purchase' },
];

export const categories = ['Living Room', 'Bedroom', 'Dining', 'Office', 'Kitchen', 'Outdoor'];
