import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useStores } from '@/hooks/useStores';
import { useStoreContext } from '@/contexts/StoreContext';

interface BulkImportSalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccessRefresh?: () => void;
}

export function BulkImportSalesDialog({ open, onOpenChange, onSuccessRefresh }: BulkImportSalesDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { data: stores = [] } = useStores();
  const { activeStoreId } = useStoreContext();

  const handleDownloadSample = () => {
    const sampleData = [
      {
        order_date: '2026-05-15',
        order_number: 'SO-2026-MAY-001',
        customer_name: 'Oberoi Villa',
        category: 'Sofa',
        item_name: 'Chesterfield Leather 3-Seater',
        quantity: 1,
        unit_price: 120000,
        cost_price: 75000,
        discount_pct: 5,
        salespeople: 'Rahul Sharma, Amit Verma',
      },
      {
        order_date: '2026-06-10',
        order_number: 'SO-2026-JUN-002',
        customer_name: 'Horizon Tech Corp',
        category: 'Office Furniture',
        item_name: 'Ergonomic Desk & Mesh Chair Set',
        quantity: 10,
        unit_price: 25000,
        cost_price: 15000,
        discount_pct: 10,
        salespeople: 'Amit Verma, Rajiv Patel',
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Past Sales Import Template');
    XLSX.writeFile(wb, 'Furniture_Past_Sales_Import_Template.xlsx');
    toast.success('Sample Excel import template downloaded!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcessImport = () => {
    if (!file) {
      toast.error('Please select an Excel or CSV file to import');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);

        const rows = data as any[];
        const targetStoreId = activeStoreId && activeStoreId !== 'all' 
          ? activeStoreId 
          : (stores[0]?.id);

        if (!targetStoreId) {
          toast.error('No target store available to import sales.');
          setIsProcessing(false);
          return;
        }

        let importCount = 0;
        for (const row of rows) {
          const { error } = await supabase.rpc('import_past_sales_order', {
            _order_date: row.order_date || new Date().toISOString().split('T')[0],
            _order_number: row.order_number || `SO-HIST-IMP-${Math.floor(Math.random() * 10000)}`,
            _customer_name: row.customer_name || 'Imported Client',
            _category_name: row.category || 'General',
            _item_name: row.item_name || 'Imported Item',
            _quantity: parseInt(row.quantity) || 1,
            _unit_price: parseFloat(row.unit_price) || 0,
            _cost_price: parseFloat(row.cost_price) || (parseFloat(row.unit_price) * 0.6) || 0,
            _discount_pct: parseFloat(row.discount_pct) || 0,
            _salespeople: row.salespeople || 'General Staff',
            _store_id: targetStoreId
          });

          if (error) {
            console.error('Error importing row:', row, error);
            toast.error(`Error importing row: ${row.order_number || ''}`);
          } else {
            importCount++;
          }
        }

        toast.success(`Successfully imported ${importCount} of ${rows.length} historical sales records!`);
        setIsProcessing(false);
        onOpenChange(false);
        if (onSuccessRefresh) onSuccessRefresh();
      } catch (err: any) {
        console.error(err);
        toast.error(`Failed to parse import file: ${err.message || err}`);
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 space-y-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Bulk Import Past Sales (CSV / Excel)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Upload an Excel spreadsheet with past order dates, salespeople, items, prices, and discounts to import historical sales data in bulk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {/* Step 1: Download Template */}
          <div className="p-3 bg-accent/40 rounded-lg border flex items-center justify-between gap-2">
            <div>
              <span className="font-bold block">1. Download Template</span>
              <span className="text-[11px] text-muted-foreground">Get formatted sample file with 50-50 split columns</span>
            </div>
            <Button size="sm" variant="outline" onClick={handleDownloadSample} className="h-8 text-xs gap-1 border-border/60">
              <Download className="h-3.5 w-3.5" /> Sample .xlsx
            </Button>
          </div>

          {/* Step 2: Upload File */}
          <div className="p-4 border-2 border-dashed rounded-xl border-border/60 text-center space-y-2 bg-accent/10">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
            <div>
              <span className="font-bold text-xs block">Select CSV or Excel File</span>
              <span className="text-[11px] text-muted-foreground">Supports .xlsx, .xls, .csv</span>
            </div>

            <Input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="h-9 text-xs cursor-pointer"
            />

            {file && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 font-semibold gap-1 text-[11px] mt-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Selected: {file.name}
              </Badge>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleProcessImport}
            disabled={!file || isProcessing}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isProcessing ? 'Importing...' : 'Upload & Import Sales'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
