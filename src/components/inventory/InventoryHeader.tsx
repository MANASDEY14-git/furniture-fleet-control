
import React from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import type { Item } from '@/hooks/useItems';

interface InventoryHeaderProps {
  lowStockItems: Item[];
}

export default function InventoryHeader({ lowStockItems }: InventoryHeaderProps) {
  return (
    <>
      <div className="flex items-center gap-3">
        <Package className="w-8 h-8 text-cyan-400" />
        <div>
          <h1 className="text-3xl font-bold glow-text">Inventory Control</h1>
          <p className="text-blue-300">Manage your product inventory</p>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h3 className="text-orange-300 font-semibold">Low Stock Alert</h3>
          </div>
          <p className="text-orange-200 text-sm">
            {lowStockItems.length} item(s) are running low on stock (less than 1 unit)
          </p>
        </div>
      )}
    </>
  );
}
