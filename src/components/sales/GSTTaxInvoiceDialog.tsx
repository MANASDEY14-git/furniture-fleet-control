import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, FileText, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';
import { numberToWordsINR, getStateByCode, calculateGST } from '@/utils/gstUtils';
import { useStores } from '@/hooks/useStores';
import { useBankAccounts } from '@/hooks/useBankAccounts';

interface SalesOrderItem {
  id: string;
  item_name: string;
  hsn_code?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  taxable_amount?: number;
  cgst_rate?: number;
  cgst_amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  igst_rate?: number;
  igst_amount?: number;
  gst_rate?: number;
  is_removed?: boolean;
}

interface GSTTaxInvoiceDialogProps {
  order: any;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function GSTTaxInvoiceDialog({
  order,
  trigger,
  open,
  onOpenChange,
}: GSTTaxInvoiceDialogProps) {
  const { data: stores = [] } = useStores();
  const { data: bankAccounts = [] } = useBankAccounts();

  const store = stores.find((s: any) => s.id === order?.store_id) || {
    name: 'BIJOY FURNISHERS',
    location: '15, Raja S.C. Mullick Road, Kolkata - 700086, West Bengal',
    gstin: '19AAACB1234F1Z5',
    state_code: '19',
    pan: 'AAACB1234F',
    phone: '+91 98300 00000',
    email: 'info@bijoyfurnishers.com',
  };

  const storeBank = bankAccounts.find((b: any) => b.store_id === order?.store_id && b.is_active) || bankAccounts[0];

  const supplierState = getStateByCode(store.state_code || '19');
  const posStateCode = order?.place_of_supply_state_code || store.state_code || '19';
  const posState = getStateByCode(posStateCode);
  const isIntraState = (store.state_code || '19') === posStateCode;

  const rawItems: SalesOrderItem[] = (order?.sales_order_items || order?.items || []).filter(
    (item: any) => !item.is_removed
  );

  // Calculate line items with tax breakdown if not already calculated
  const computedItems = rawItems.map((item) => {
    const gstRate = Number(item.gst_rate) || 18.0;
    const hsn = item.hsn_code || '9403';
    const total = Number(item.total_price) || 0;

    let taxable = Number(item.taxable_amount);
    let cgstAmt = Number(item.cgst_amount);
    let sgstAmt = Number(item.sgst_amount);
    let igstAmt = Number(item.igst_amount);

    if (!taxable || taxable === 0) {
      const tax = calculateGST({
        grossAmount: total,
        gstRate,
        isTaxInclusive: true,
        supplierStateCode: store.state_code || '19',
        placeOfSupplyStateCode: posStateCode,
      });
      taxable = tax.taxableAmount;
      cgstAmt = tax.cgstAmount;
      sgstAmt = tax.sgstAmount;
      igstAmt = tax.igstAmount;
    }

    return {
      ...item,
      hsn_code: hsn,
      gst_rate: gstRate,
      taxable_amount: taxable,
      cgst_rate: isIntraState ? gstRate / 2 : 0,
      cgst_amount: cgstAmt,
      sgst_rate: isIntraState ? gstRate / 2 : 0,
      sgst_amount: sgstAmt,
      igst_rate: isIntraState ? 0 : gstRate,
      igst_amount: igstAmt,
    };
  });

  const totalTaxable = computedItems.reduce((acc, i) => acc + (i.taxable_amount || 0), 0);
  const totalCGST = computedItems.reduce((acc, i) => acc + (i.cgst_amount || 0), 0);
  const totalSGST = computedItems.reduce((acc, i) => acc + (i.sgst_amount || 0), 0);
  const totalIGST = computedItems.reduce((acc, i) => acc + (i.igst_amount || 0), 0);
  const totalTax = totalCGST + totalSGST + totalIGST;
  const roundOff = Number(order?.round_off) || 0;
  const grandTotal = (Number(order?.total_amount) || (totalTaxable + totalTax)) + roundOff;
  const advancePaid = Number(order?.advance_paid) || 0;
  const balanceDue = Math.max(0, grandTotal - advancePaid);

  // Group by HSN for statutory HSN tax summary table
  const hsnSummaryMap = new Map<string, {
    hsn: string;
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  }>();

  computedItems.forEach((item) => {
    const hsn = item.hsn_code || '9403';
    const existing = hsnSummaryMap.get(hsn) || {
      hsn,
      taxable: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
    };
    existing.taxable += item.taxable_amount || 0;
    existing.cgst += item.cgst_amount || 0;
    existing.sgst += item.sgst_amount || 0;
    existing.igst += item.igst_amount || 0;
    existing.totalTax += (item.cgst_amount || 0) + (item.sgst_amount || 0) + (item.igst_amount || 0);
    hsnSummaryMap.set(hsn, existing);
  });

  const hsnSummary = Array.from(hsnSummaryMap.values());

  const handlePrint = () => {
    window.print();
  };

  if (!order) return null;

  const invoiceNumber = order.invoice_number || order.order_number || 'INV-DRAFT';
  const invoiceDate = order.invoice_date || order.date || new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-8 bg-card text-card-foreground print:max-w-none print:w-full print:p-0 print:border-none print:shadow-none print:overflow-visible">
        <DialogHeader className="print:hidden flex flex-row items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <DialogTitle className="text-xl font-bold">GST Tax Invoice</DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Statutory Invoice Document */}
        <div id="gst-tax-invoice" className="border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 p-6 sm:p-8 text-xs font-sans">
          
          {/* Header Title */}
          <div className="text-center border-b border-neutral-300 dark:border-neutral-700 pb-3 mb-4">
            <div className="flex justify-between items-center text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-1">
              <span>Original for Recipient</span>
              <span>GST Rule 46 Compliant</span>
              <span>Duplicate for Transporter</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white uppercase">
              TAX INVOICE
            </h1>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
              Issued under Section 31 of the Central Goods and Services Tax Act, 2017
            </p>
          </div>

          {/* Supplier & Invoice Details Grid */}
          <div className="grid grid-cols-2 border border-neutral-300 dark:border-neutral-700 mb-4 divide-x divide-neutral-300 dark:divide-neutral-700">
            {/* Supplier Details */}
            <div className="p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Details of Supplier</span>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">{store.name}</p>
              <p className="text-neutral-700 dark:text-neutral-300">{store.location}</p>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                GSTIN: <span className="font-mono">{store.gstin || '19AAACB1234F1Z5'}</span>
              </p>
              <p>State: <span className="font-medium">{supplierState?.name || 'West Bengal'}</span> (Code: <span className="font-mono">{store.state_code || '19'}</span>)</p>
              <p>PAN: <span className="font-mono">{store.pan || 'AAACB1234F'}</span></p>
              {store.phone && <p>Contact: {store.phone}</p>}
            </div>

            {/* Invoice Meta */}
            <div className="p-3 space-y-1.5 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex justify-between">
                <span className="font-semibold text-neutral-600 dark:text-neutral-400">Invoice No:</span>
                <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">{invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-neutral-600 dark:text-neutral-400">Invoice Date:</span>
                <span className="font-medium">{new Date(invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-neutral-600 dark:text-neutral-400">Order Reference:</span>
                <span className="font-mono">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-neutral-600 dark:text-neutral-400">Place of Supply (POS):</span>
                <span className="font-medium">{posState?.name || 'West Bengal'} ({posStateCode})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-neutral-600 dark:text-neutral-400">Reverse Charge:</span>
                <span className="font-medium uppercase">{order.is_reverse_charge ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-neutral-600 dark:text-neutral-400">Supply Type:</span>
                <span className="font-bold text-primary">{isIntraState ? 'INTRA-STATE (CGST + SGST)' : 'INTER-STATE (IGST)'}</span>
              </div>
            </div>
          </div>

          {/* Recipient (Billed To) & Consignee (Shipped To) */}
          <div className="grid grid-cols-2 border border-neutral-300 dark:border-neutral-700 mb-4 divide-x divide-neutral-300 dark:divide-neutral-700">
            {/* Recipient */}
            <div className="p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Details of Recipient (Billed To)</span>
              <p className="text-sm font-bold">{order.customer_name || 'Walk-in Customer'}</p>
              <p className="text-neutral-700 dark:text-neutral-300">{order.customer_address || 'Address not provided'}</p>
              <p>Phone: {order.customer_phone || '—'}</p>
              {order.customer_phone_2 && <p>Alt Phone: {order.customer_phone_2}</p>}
              <p className="font-semibold">
                GSTIN / UIN: <span className="font-mono">{order.customer_gst || order.gst_number || 'Unregistered'}</span>
              </p>
              <p>State: {posState?.name || 'West Bengal'} (Code: {posStateCode})</p>
            </div>

            {/* Consignee */}
            <div className="p-3 space-y-1 bg-neutral-50/50 dark:bg-neutral-900/50">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Consignee (Shipped To)</span>
              <p className="text-sm font-bold">{order.customer_name || 'Walk-in Customer'}</p>
              <p className="text-neutral-700 dark:text-neutral-300">{order.customer_address || 'Same as Billing Address'}</p>
              <p>Delivery Date: {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'As scheduled'}</p>
              <p>Delivery Status: <span className="font-semibold">{order.delivery_status || 'Pending'}</span></p>
              <p>State of Destination: {posState?.name || 'West Bengal'} (Code: {posStateCode})</p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-neutral-300 dark:border-neutral-700 mb-4 overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold">
                  <th className="p-2 border-r border-neutral-300 dark:border-neutral-700 w-8 text-center">#</th>
                  <th className="p-2 border-r border-neutral-300 dark:border-neutral-700 min-w-[180px]">Description of Goods</th>
                  <th className="p-2 border-r border-neutral-300 dark:border-neutral-700 text-center w-16">HSN</th>
                  <th className="p-2 border-r border-neutral-300 dark:border-neutral-700 text-right w-12">Qty</th>
                  <th className="p-2 border-r border-neutral-300 dark:border-neutral-700 text-right w-20">Rate (₹)</th>
                  <th className="p-2 border-r border-neutral-300 dark:border-neutral-700 text-right w-24">Taxable Value</th>
                  {isIntraState ? (
                    <>
                      <th className="p-1 border-r border-neutral-300 dark:border-neutral-700 text-right w-16">CGST</th>
                      <th className="p-1 border-r border-neutral-300 dark:border-neutral-700 text-right w-16">SGST</th>
                    </>
                  ) : (
                    <th className="p-1 border-r border-neutral-300 dark:border-neutral-700 text-right w-20">IGST</th>
                  )}
                  <th className="p-2 text-right w-24">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {computedItems.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50">
                    <td className="p-2 border-r border-neutral-300 dark:border-neutral-700 text-center font-mono">{index + 1}</td>
                    <td className="p-2 border-r border-neutral-300 dark:border-neutral-700 font-medium">
                      {item.item_name}
                    </td>
                    <td className="p-2 border-r border-neutral-300 dark:border-neutral-700 text-center font-mono">{item.hsn_code}</td>
                    <td className="p-2 border-r border-neutral-300 dark:border-neutral-700 text-right font-semibold">{item.quantity}</td>
                    <td className="p-2 border-r border-neutral-300 dark:border-neutral-700 text-right font-mono">
                      {Number(item.unit_price).toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-neutral-300 dark:border-neutral-700 text-right font-mono font-medium">
                      {Number(item.taxable_amount).toFixed(2)}
                    </td>
                    {isIntraState ? (
                      <>
                        <td className="p-1 border-r border-neutral-300 dark:border-neutral-700 text-right font-mono text-[10px]">
                          <div>{Number(item.cgst_amount).toFixed(2)}</div>
                          <span className="text-[9px] text-neutral-500">@{item.cgst_rate}%</span>
                        </td>
                        <td className="p-1 border-r border-neutral-300 dark:border-neutral-700 text-right font-mono text-[10px]">
                          <div>{Number(item.sgst_amount).toFixed(2)}</div>
                          <span className="text-[9px] text-neutral-500">@{item.sgst_rate}%</span>
                        </td>
                      </>
                    ) : (
                      <td className="p-1 border-r border-neutral-300 dark:border-neutral-700 text-right font-mono text-[10px]">
                        <div>{Number(item.igst_amount).toFixed(2)}</div>
                        <span className="text-[9px] text-neutral-500">@{item.igst_rate}%</span>
                      </td>
                    )}
                    <td className="p-2 text-right font-mono font-bold text-neutral-900 dark:text-white">
                      {Number(item.total_price).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-neutral-300 dark:border-neutral-700 font-bold bg-neutral-50 dark:bg-neutral-900">
                <tr>
                  <td colSpan={3} className="p-2 border-r border-neutral-300 dark:border-neutral-700 text-right">Total:</td>
                  <td className="p-2 border-r border-neutral-300 dark:border-neutral-700 text-right">
                    {computedItems.reduce((acc, i) => acc + (i.quantity || 0), 0)}
                  </td>
                  <td className="p-2 border-r border-neutral-300 dark:border-neutral-700" />
                  <td className="p-2 border-r border-neutral-300 dark:border-neutral-700 text-right font-mono">
                    ₹{totalTaxable.toFixed(2)}
                  </td>
                  {isIntraState ? (
                    <>
                      <td className="p-1 border-r border-neutral-300 dark:border-neutral-700 text-right font-mono text-[10px]">
                        ₹{totalCGST.toFixed(2)}
                      </td>
                      <td className="p-1 border-r border-neutral-300 dark:border-neutral-700 text-right font-mono text-[10px]">
                        ₹{totalSGST.toFixed(2)}
                      </td>
                    </>
                  ) : (
                    <td className="p-1 border-r border-neutral-300 dark:border-neutral-700 text-right font-mono text-[10px]">
                      ₹{totalIGST.toFixed(2)}
                    </td>
                  )}
                  <td className="p-2 text-right font-mono text-sm text-primary font-bold">
                    ₹{grandTotal.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* HSN/SAC Tax Summary Table (Statutory Requirement) */}
          <div className="border border-neutral-300 dark:border-neutral-700 mb-4">
            <div className="bg-neutral-100 dark:bg-neutral-800 px-3 py-1 font-bold text-[10px] uppercase tracking-wider border-b border-neutral-300 dark:border-neutral-700">
              Tax Summary under HSN / SAC (Statutory Rule 46 Table)
            </div>
            <table className="w-full text-[10px] text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 font-semibold text-neutral-600 dark:text-neutral-400">
                  <th className="p-1.5 border-r border-neutral-200 dark:border-neutral-800">HSN/SAC</th>
                  <th className="p-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right">Taxable Value</th>
                  {isIntraState ? (
                    <>
                      <th className="p-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right">Central Tax (CGST)</th>
                      <th className="p-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right">State Tax (SGST)</th>
                    </>
                  ) : (
                    <th className="p-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right">Integrated Tax (IGST)</th>
                  )}
                  <th className="p-1.5 text-right font-bold">Total Tax Amount</th>
                </tr>
              </thead>
              <tbody>
                {hsnSummary.map((hsn) => (
                  <tr key={hsn.hsn} className="border-b border-neutral-100 dark:border-neutral-900 font-mono">
                    <td className="p-1.5 border-r border-neutral-200 dark:border-neutral-800 font-bold">{hsn.hsn}</td>
                    <td className="p-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right">₹{hsn.taxable.toFixed(2)}</td>
                    {isIntraState ? (
                      <>
                        <td className="p-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right">₹{hsn.cgst.toFixed(2)}</td>
                        <td className="p-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right">₹{hsn.sgst.toFixed(2)}</td>
                      </>
                    ) : (
                      <td className="p-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right">₹{hsn.igst.toFixed(2)}</td>
                    )}
                    <td className="p-1.5 text-right font-bold">₹{hsn.totalTax.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Amount in Words & Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-neutral-300 dark:border-neutral-700 p-3 mb-4">
            <div className="space-y-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total Invoice Amount in Words</span>
                <p className="font-semibold text-neutral-900 dark:text-white capitalize leading-relaxed">
                  {numberToWordsINR(grandTotal)}
                </p>
              </div>

              {/* Bank Details for Remittance */}
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-2 text-[10px] space-y-0.5">
                <span className="font-bold text-neutral-600 dark:text-neutral-400 uppercase">Bank Remittance Details (NEFT / RTGS / IMPS)</span>
                <p>Bank: <span className="font-semibold">{storeBank?.bank_name || 'HDFC Bank'}</span></p>
                <p>Account Name: <span className="font-semibold">{storeBank?.account_name || store.name}</span></p>
                <p>Account Number: <span className="font-mono font-bold">{storeBank?.account_number || '022200000000'}</span></p>
                <p>IFSC Code: <span className="font-mono font-bold">{storeBank?.ifsc_code || 'HDFC0000222'}</span></p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-1.5 text-right border-l-0 sm:border-l sm:border-neutral-200 sm:dark:border-neutral-800 sm:pl-4 font-mono">
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Total Taxable Amount:</span>
                <span>₹{totalTaxable.toFixed(2)}</span>
              </div>
              {isIntraState ? (
                <>
                  <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                    <span>Central GST (CGST):</span>
                    <span>₹{totalCGST.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                    <span>State GST (SGST):</span>
                    <span>₹{totalSGST.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Integrated GST (IGST):</span>
                  <span>₹{totalIGST.toFixed(2)}</span>
                </div>
              )}
              {roundOff !== 0 && (
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Round Off:</span>
                  <span>₹{roundOff.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-neutral-900 dark:text-white border-t border-neutral-300 dark:border-neutral-700 pt-1">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 pt-1 font-semibold">
                <span>Advance Received:</span>
                <span>₹{advancePaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-amber-600 dark:text-amber-400 border-t border-neutral-200 dark:border-neutral-800 pt-1">
                <span>Balance Due:</span>
                <span>₹{balanceDue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions & Signatures */}
          <div className="grid grid-cols-2 border border-neutral-300 dark:border-neutral-700 divide-x divide-neutral-300 dark:divide-neutral-700">
            <div className="p-3 text-[10px] space-y-1 text-neutral-600 dark:text-neutral-400">
              <span className="font-bold text-neutral-700 dark:text-neutral-300 uppercase block">Terms & Conditions</span>
              <ol className="list-decimal pl-3 space-y-0.5">
                <li>Goods once delivered will not be returned unless manufacturing defect is established.</li>
                <li>Interest @ 18% p.a. will be levied on overdue payments beyond agreed terms.</li>
                <li>All disputes are subject to Kolkata jurisdiction only.</li>
                <li>This is a computer generated invoice under Rule 46 of the CGST Rules, 2017.</li>
              </ol>
            </div>

            <div className="p-3 flex flex-col justify-between text-center min-h-[100px]">
              <p className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
                For <span className="font-bold">{store.name}</span>
              </p>
              <div className="pt-8">
                <div className="border-t border-neutral-400 dark:border-neutral-600 w-3/4 mx-auto" />
                <p className="text-[10px] text-neutral-500 uppercase mt-1">Authorized Signatory</p>
              </div>
            </div>
          </div>

        </div>

        {/* Print Stylesheet Hook */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #gst-tax-invoice, #gst-tax-invoice * {
                visibility: visible;
              }
              #gst-tax-invoice {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 12px;
                border: none;
              }
            }
          `
        }} />
      </DialogContent>
    </Dialog>
  );
}
