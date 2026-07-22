import * as XLSX from 'xlsx';
import type { InventoryIntelligenceItem } from '@/hooks/useInventoryIntelligence';

export function exportInventoryToExcel(
  items: InventoryIntelligenceItem[],
  storeName: string = 'All Stores'
) {
  const dateStr = new Date().toISOString().split('T')[0];
  const workbook = XLSX.utils.book_new();

  // 1. KPI Summary Sheet
  const totalValue = items.reduce((acc, i) => acc + (i.inventory_value || 0), 0);
  const totalCost = items.reduce((acc, i) => acc + (i.inventory_cost || 0), 0);
  const avgAge = items.length > 0 ? Math.round(items.reduce((acc, i) => acc + (i.stock_age_days || 0), 0) / items.length) : 0;
  const cashLocked = items.reduce((acc, i) => acc + (i.cash_locked || 0), 0);
  const deadStock = items.filter(i => i.stock_age_bucket === 'Dead Stock' || i.stock_age_bucket === 'Critical').reduce((acc, i) => acc + (i.inventory_cost || 0), 0);
  const reorderCount = items.filter(i => i.reorder_status === 'Reorder Soon').length;

  const kpiData = [
    { Metric: 'Store', Value: storeName },
    { Metric: 'Export Date', Value: dateStr },
    { Metric: 'Total Active SKUs', Value: items.length },
    { Metric: 'Total Inventory Value (₹)', Value: totalValue },
    { Metric: 'Total Inventory Cost (₹)', Value: totalCost },
    { Metric: 'Average Stock Age (Days)', Value: avgAge },
    { Metric: 'Cash Locked >180 Days (₹)', Value: cashLocked },
    { Metric: 'Dead Stock Value >365 Days (₹)', Value: deadStock },
    { Metric: 'SKUs Needing Reorder Soon', Value: reorderCount },
  ];
  const kpiSheet = XLSX.utils.json_to_sheet(kpiData);
  XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI Summary');

  // 2. Hero Products Sheet
  const heroProducts = items
    .filter(i => i.hero_score > 0)
    .sort((a, b) => b.hero_score - a.hero_score)
    .slice(0, 50)
    .map((i, index) => ({
      Rank: index + 1,
      Name: i.name,
      Category: i.category_name || 'Uncategorized',
      'Hero Score': i.hero_score,
      'Revenue (Period)': i.revenue_period,
      'Gross Profit (Period)': i.gross_profit_period,
      'Units Sold': i.units_sold_period,
      'Stock Available': i.quantity_available,
      'Selling Price': i.selling_price,
    }));
  const heroSheet = XLSX.utils.json_to_sheet(heroProducts);
  XLSX.utils.book_append_sheet(workbook, heroSheet, 'Hero Products');

  // 3. Fast Movers & Reorder Sheet
  const fastMovers = items
    .filter(i => i.reorder_status === 'Reorder Soon' || i.monthly_velocity > 0)
    .sort((a, b) => a.days_to_sell - b.days_to_sell)
    .map(i => ({
      Name: i.name,
      Category: i.category_name || 'Uncategorized',
      'Stock Available': i.quantity_available,
      'Monthly Velocity': i.monthly_velocity,
      'Days to Sell': i.days_to_sell > 900 ? 'No Sales' : i.days_to_sell,
      'Reorder Status': i.reorder_status,
      'Suggested Action': i.reorder_status === 'Reorder Soon' ? 'Reorder Urgently' : 'Monitor Stock',
    }));
  const fastSheet = XLSX.utils.json_to_sheet(fastMovers);
  XLSX.utils.book_append_sheet(workbook, fastSheet, 'Fast Movers & Reorders');

  // 4. Cash Locked & Age Analysis
  const cashLockedItems = items
    .filter(i => i.stock_age_days > 180)
    .sort((a, b) => b.stock_age_days - a.stock_age_days)
    .map(i => ({
      Name: i.name,
      Category: i.category_name || 'Uncategorized',
      Supplier: i.supplier_name || 'N/A',
      Brand: i.brand || 'N/A',
      Warehouse: i.warehouse || 'N/A',
      'Stock Age (Days)': i.stock_age_days,
      'Age Bucket': i.stock_age_bucket,
      Quantity: i.quantity_available,
      'Cost Price': i.cost_price,
      'Cash Locked (₹)': i.cash_locked,
      'Recommended Action': i.recommended_action,
    }));
  const cashSheet = XLSX.utils.json_to_sheet(cashLockedItems);
  XLSX.utils.book_append_sheet(workbook, cashSheet, 'Cash Locked (>180d)');

  // 5. Category Intelligence Sheet
  const categoryMap = new Map<string, { count: number; totalVal: number; totalCost: number; revenue: number; profit: number; fastCount: number; slowCount: number }>();
  items.forEach(i => {
    const cat = i.category_name || 'Uncategorized';
    const existing = categoryMap.get(cat) || { count: 0, totalVal: 0, totalCost: 0, revenue: 0, profit: 0, fastCount: 0, slowCount: 0 };
    existing.count += 1;
    existing.totalVal += i.inventory_value;
    existing.totalCost += i.inventory_cost;
    existing.revenue += i.revenue_period;
    existing.profit += i.gross_profit_period;
    if (i.reorder_status === 'Reorder Soon' || i.monthly_velocity > 2) existing.fastCount += 1;
    if (i.stock_age_days > 180) existing.slowCount += 1;
    categoryMap.set(cat, existing);
  });
  const categoryData = Array.from(categoryMap.entries()).map(([category, stat]) => ({
    Category: category,
    'Item Count': stat.count,
    'Inventory Value (₹)': stat.totalVal,
    'Inventory Cost (₹)': stat.totalCost,
    'Period Revenue (₹)': stat.revenue,
    'Gross Profit (₹)': stat.profit,
    'Fast Movers Count': stat.fastCount,
    'Slow/Locked Count': stat.slowCount,
  }));
  const categorySheet = XLSX.utils.json_to_sheet(categoryData);
  XLSX.utils.book_append_sheet(workbook, categorySheet, 'Category Intelligence');

  // 6. All Master Items Sheet
  const allMasterData = items.map(i => ({
    Name: i.name,
    Category: i.category_name || '',
    Supplier: i.supplier_name || '',
    Brand: i.brand || '',
    Warehouse: i.warehouse || '',
    Quantity: i.quantity_available,
    'Cost Price': i.cost_price,
    'Selling Price': i.selling_price,
    'Inventory Value': i.inventory_value,
    'Stock Age (Days)': i.stock_age_days,
    'Age Bucket': i.stock_age_bucket,
    'Monthly Velocity': i.monthly_velocity,
    'Days to Sell': i.days_to_sell,
    'Reorder Status': i.reorder_status,
    'Hero Score': i.hero_score,
    'Cash Locked': i.cash_locked,
    Action: i.recommended_action,
  }));
  const masterSheet = XLSX.utils.json_to_sheet(allMasterData);
  XLSX.utils.book_append_sheet(workbook, masterSheet, 'All Items Master');

  // Download
  XLSX.writeFile(workbook, `Inventory_Intelligence_${storeName.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}

export function exportInventoryToPDF() {
  window.print();
}
