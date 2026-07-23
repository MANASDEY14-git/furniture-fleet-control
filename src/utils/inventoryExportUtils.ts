import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { InventoryIntelligenceRow } from '@/hooks/useInventoryIntelligence';

const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : Number(n).toFixed(2);

function baseRows(rows: InventoryIntelligenceRow[]) {
  return rows.map((r) => ({
    Item: r.item_name,
    Category: r.category_name ?? '',
    Supplier: r.supplier_name ?? '',
    Brand: r.brand ?? '',
    Warehouse: r.warehouse ?? '',
    Store: r.store_name ?? '',
    Quantity: r.quantity_available,
    'Cost Price': fmt(r.cost_price),
    'Selling Price': fmt(r.selling_price),
    'Inventory Value': fmt(r.inventory_value),
    'Inventory Cost': fmt(r.inventory_cost),
    'Units Sold (period)': r.units_sold_period,
    'Revenue (period)': fmt(r.revenue_period),
    'Gross Profit (period)': fmt(r.gross_profit_period),
    'Stock Age (days)': r.stock_age_days ?? '',
    'Age Bucket': r.stock_age_bucket,
    'Monthly Velocity': fmt(r.monthly_velocity),
    'Days to Sell': fmt(r.days_to_sell),
    'Reorder Status': r.reorder_status,
    'Hero Score': fmt(r.hero_score),
    'Cash Locked': fmt(r.cash_locked),
    'Recommended Action': r.recommended_action,
    'Last Sold': r.last_sold_date ?? '',
  }));
}

export function exportInventoryIntelligenceToExcel(
  rows: InventoryIntelligenceRow[],
  filename = 'inventory-intelligence',
) {
  const wb = XLSX.utils.book_new();

  const all = XLSX.utils.json_to_sheet(baseRows(rows));
  XLSX.utils.book_append_sheet(wb, all, 'All Items');

  const hero = XLSX.utils.json_to_sheet(
    baseRows([...rows].sort((a, b) => b.hero_score - a.hero_score).slice(0, 50)),
  );
  XLSX.utils.book_append_sheet(wb, hero, 'Hero Products');

  const cash = XLSX.utils.json_to_sheet(
    baseRows(rows.filter((r) => r.cash_locked > 0).sort((a, b) => b.cash_locked - a.cash_locked)),
  );
  XLSX.utils.book_append_sheet(wb, cash, 'Cash Locked');

  const fast = XLSX.utils.json_to_sheet(
    baseRows(
      rows
        .filter((r) => r.reorder_status === 'Reorder Soon')
        .sort((a, b) => (a.days_to_sell ?? 0) - (b.days_to_sell ?? 0)),
    ),
  );
  XLSX.utils.book_append_sheet(wb, fast, 'Fast Movers');

  XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportInventoryIntelligenceToPdf(
  rows: InventoryIntelligenceRow[],
  filename = 'inventory-intelligence',
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text('Inventory Intelligence Report', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 22);

  const totalValue = rows.reduce((s, r) => s + r.inventory_value, 0);
  const cashLocked = rows.reduce((s, r) => s + r.cash_locked, 0);
  const dead = rows.filter((r) => (r.stock_age_days ?? 0) > 365).length;
  doc.text(
    `SKUs: ${rows.length}  •  Inventory value: ₹${totalValue.toFixed(0)}  •  Cash locked >180d: ₹${cashLocked.toFixed(0)}  •  Dead stock >365d: ${dead}`,
    14,
    28,
  );

  autoTable(doc, {
    startY: 34,
    head: [
      [
        'Item',
        'Category',
        'Qty',
        'Cost',
        'Value',
        'Age',
        'Bucket',
        'Hero',
        'Reorder',
        'Cash Locked',
        'Action',
      ],
    ],
    body: rows
      .sort((a, b) => b.hero_score - a.hero_score)
      .slice(0, 100)
      .map((r) => [
        r.item_name,
        r.category_name ?? '',
        r.quantity_available,
        fmt(r.cost_price),
        fmt(r.inventory_value),
        r.stock_age_days ?? '',
        r.stock_age_bucket,
        fmt(r.hero_score),
        r.reorder_status,
        fmt(r.cash_locked),
        r.recommended_action,
      ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  doc.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
