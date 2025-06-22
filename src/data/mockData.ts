
import { Store, Item, Sale, Purchase, Payment } from '@/types';

export const stores: Store[] = [
  { id: '1', name: 'Downtown Furniture', location: 'Downtown' },
  { id: '2', name: 'Suburban Home Store', location: 'Suburbs' },
  { id: '3', name: 'Modern Living', location: 'Mall District' },
  { id: '4', name: 'Classic Furniture', location: 'Old Town' },
  { id: '5', name: 'Budget Home', location: 'East Side' },
  { id: '6', name: 'Luxury Interiors', location: 'Uptown' },
];

export const items: Item[] = [
  { id: '1', name: 'Oak Dining Table', category: 'Dining', storeId: '1', quantityAvailable: 5, costPrice: 500, sellingPrice: 799 },
  { id: '2', name: 'Leather Sofa', category: 'Living Room', storeId: '1', quantityAvailable: 3, costPrice: 800, sellingPrice: 1299 },
  { id: '3', name: 'Queen Bed Frame', category: 'Bedroom', storeId: '2', quantityAvailable: 8, costPrice: 300, sellingPrice: 599 },
  { id: '4', name: 'Office Chair', category: 'Office', storeId: '2', quantityAvailable: 12, costPrice: 150, sellingPrice: 299 },
  { id: '5', name: 'Coffee Table', category: 'Living Room', storeId: '3', quantityAvailable: 6, costPrice: 200, sellingPrice: 399 },
  { id: '6', name: 'Wardrobe', category: 'Bedroom', storeId: '3', quantityAvailable: 4, costPrice: 600, sellingPrice: 999 },
];

export const sales: Sale[] = [
  { id: '1', storeId: '1', itemId: '1', itemName: 'Oak Dining Table', quantity: 1, totalPrice: 799, deliveryStatus: 'Delivered', date: '2024-06-22' },
  { id: '2', storeId: '1', itemId: '2', itemName: 'Leather Sofa', quantity: 1, totalPrice: 1299, deliveryStatus: 'Pending', date: '2024-06-22' },
  { id: '3', storeId: '2', itemId: '3', itemName: 'Queen Bed Frame', quantity: 2, totalPrice: 1198, deliveryStatus: 'Delivered', date: '2024-06-21' },
];

export const purchases: Purchase[] = [
  { id: '1', storeId: '1', itemId: '1', itemName: 'Oak Dining Table', quantity: 10, totalCost: 5000, date: '2024-06-20' },
  { id: '2', storeId: '2', itemId: '3', itemName: 'Queen Bed Frame', quantity: 15, totalCost: 4500, date: '2024-06-19' },
];

export const payments: Payment[] = [
  { id: '1', storeId: '1', amount: 2098, type: 'Receipt', date: '2024-06-22', description: 'Daily sales' },
  { id: '2', storeId: '2', amount: 1198, type: 'Receipt', date: '2024-06-21', description: 'Bed frame sales' },
  { id: '3', storeId: '1', amount: 5000, type: 'Payment', date: '2024-06-20', description: 'Inventory purchase' },
];

export const categories = ['Living Room', 'Bedroom', 'Dining', 'Office', 'Kitchen', 'Outdoor'];
