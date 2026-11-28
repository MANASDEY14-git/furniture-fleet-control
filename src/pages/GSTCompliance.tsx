import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Building,
  Users,
  Layers,
  Calendar,
  Search,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';
import { useGSTCompliance } from '@/hooks/useGSTCompliance';
import { validateGSTIN, INDIAN_STATES } from '@/utils/gstUtils';

export default function GSTCompliance() {
  const { b2bData, b2csData, hsnData, gstr3bData, isLoading, refetch } = useGSTCompliance();

  const [activeTab, setActiveTab] = useState('gstr1-hsn');
  const [gstinInput, setGstinInput] = useState('');
  const [gstinResult, setGstinResult] = useState<any>(null);

  // Compute overall GST metrics
  const totalTaxable = hsnData.reduce((acc, row) => acc + Number(row.taxable_value || 0), 0);
  const totalCGST = hsnData.reduce((acc, row) => acc + Number(row.central_tax_amount || 0), 0);
  const totalSGST = hsnData.reduce((acc, row) => acc + Number(row.state_tax_amount || 0), 0);
  const totalIGST = hsnData.reduce((acc, row) => acc + Number(row.integrated_tax_amount || 0), 0);
  const totalTax = totalCGST + totalSGST + totalIGST;

  const handleValidateGSTIN = () => {
    if (!gstinInput.trim()) {
      setGstinResult(null);
      return;
    }
    const res = validateGSTIN(gstinInput);
    setGstinResult(res);
  };

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Indian GST Compliance Engine
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            CGST, SGST, IGST calculations, Place of Supply (POS) validation, Rule 46 Tax Invoicing & GSTR return readiness.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            Refresh Returns
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => exportCSV(hsnData, 'GSTR1_Table12_HSN')}
            disabled={!hsnData.length}
          >
            <Download className="w-4 h-4" /> Export HSN CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-card">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-semibold">Total Taxable Turnover</CardDescription>
            <CardTitle className="text-xl font-bold font-mono">{formatCurrency(totalTaxable)}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Aggregate across all sales orders
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-semibold">Output CGST (Central)</CardDescription>
            <CardTitle className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {formatCurrency(totalCGST)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Account Code 2321
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-semibold">Output SGST (State)</CardDescription>
            <CardTitle className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {formatCurrency(totalSGST)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Account Code 2322
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-semibold">Output IGST (Integrated)</CardDescription>
            <CardTitle className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {formatCurrency(totalIGST)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Account Code 2323
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-semibold text-primary">Total GST Liability</CardDescription>
            <CardTitle className="text-xl font-bold font-mono text-primary">
              {formatCurrency(totalTax)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Gross tax collected
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full max-w-4xl">
          <TabsTrigger value="gstr1-hsn" className="gap-1.5 text-xs">
            <Layers className="w-3.5 h-3.5" /> HSN Summary (T12)
          </TabsTrigger>
          <TabsTrigger value="gstr1-b2cs" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" /> B2CS Retail (T7)
          </TabsTrigger>
          <TabsTrigger value="gstr1-b2b" className="gap-1.5 text-xs">
            <Building className="w-3.5 h-3.5" /> B2B Invoices (T4)
          </TabsTrigger>
          <TabsTrigger value="gstr3b" className="gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5" /> GSTR-3B Monthly
          </TabsTrigger>
          <TabsTrigger value="gstin-tool" className="gap-1.5 text-xs">
            <Search className="w-3.5 h-3.5" /> GSTIN Validator
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Table 12 HSN Summary */}
        <TabsContent value="gstr1-hsn" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold">GSTR-1 Table 12: HSN-wise Summary of Outward Supplies</CardTitle>
                <CardDescription>Mandatory HSN disclosure for statutory tax filings</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV(hsnData, 'GSTR1_Table12_HSN')}
                disabled={!hsnData.length}
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs font-bold">
                      <TableHead>HSN Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">UQC</TableHead>
                      <TableHead className="text-right">Total Qty</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead className="text-right">Taxable Value</TableHead>
                      <TableHead className="text-right">CGST</TableHead>
                      <TableHead className="text-right">SGST</TableHead>
                      <TableHead className="text-right">IGST</TableHead>
                      <TableHead className="text-right">Total Tax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hsnData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
                          No HSN records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      hsnData.map((row) => (
                        <TableRow key={row.hsn_code} className="text-xs font-mono">
                          <TableCell className="font-bold text-foreground">{row.hsn_code}</TableCell>
                          <TableCell className="font-sans">{row.description}</TableCell>
                          <TableCell className="text-center">{row.uqc}</TableCell>
                          <TableCell className="text-right font-semibold">{row.total_quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.total_value)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(row.taxable_value)}</TableCell>
                          <TableCell className="text-right text-blue-600 dark:text-blue-400">{formatCurrency(row.central_tax_amount)}</TableCell>
                          <TableCell className="text-right text-indigo-600 dark:text-indigo-400">{formatCurrency(row.state_tax_amount)}</TableCell>
                          <TableCell className="text-right text-purple-600 dark:text-purple-400">{formatCurrency(row.integrated_tax_amount)}</TableCell>
                          <TableCell className="text-right font-bold text-foreground">{formatCurrency(row.total_tax_amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Table 7 B2CS Small Retail Supplies */}
        <TabsContent value="gstr1-b2cs" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold">GSTR-1 Table 7: B2C (Small) Outward Supplies</CardTitle>
                <CardDescription>Supplies made to unregistered retail end-consumers grouped by Place of Supply & Tax Rate</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV(b2csData, 'GSTR1_Table7_B2CS')}
                disabled={!b2csData.length}
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs font-bold">
                      <TableHead>Type</TableHead>
                      <TableHead>Place of Supply (POS)</TableHead>
                      <TableHead className="text-center">Rate (%)</TableHead>
                      <TableHead className="text-center">Invoice Count</TableHead>
                      <TableHead className="text-right">Taxable Value</TableHead>
                      <TableHead className="text-right">Central Tax (CGST)</TableHead>
                      <TableHead className="text-right">State Tax (SGST)</TableHead>
                      <TableHead className="text-right">Integrated Tax (IGST)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {b2csData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                          No B2CS consumer records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      b2csData.map((row, idx) => (
                        <TableRow key={idx} className="text-xs font-mono">
                          <TableCell className="font-sans font-bold">{row.type}</TableCell>
                          <TableCell className="font-sans">
                            {row.pos_state_name} ({row.pos_state_code})
                          </TableCell>
                          <TableCell className="text-center font-bold">{Number(row.rate)}%</TableCell>
                          <TableCell className="text-center font-sans font-semibold">{row.invoice_count}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(row.total_taxable_value)}</TableCell>
                          <TableCell className="text-right text-blue-600 dark:text-blue-400">{formatCurrency(row.total_cgst)}</TableCell>
                          <TableCell className="text-right text-indigo-600 dark:text-indigo-400">{formatCurrency(row.total_sgst)}</TableCell>
                          <TableCell className="text-right text-purple-600 dark:text-purple-400">{formatCurrency(row.total_igst)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Table 4 B2B Supplies */}
        <TabsContent value="gstr1-b2b" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold">GSTR-1 Table 4: Taxable Outward Supplies to Registered Persons (B2B)</CardTitle>
                <CardDescription>Invoices issued to business customers with valid GSTIN</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV(b2bData, 'GSTR1_Table4_B2B')}
                disabled={!b2bData.length}
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs font-bold">
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Recipient GSTIN</TableHead>
                      <TableHead>Recipient Name</TableHead>
                      <TableHead>POS</TableHead>
                      <TableHead className="text-right">Invoice Value</TableHead>
                      <TableHead className="text-right">Taxable Value</TableHead>
                      <TableHead className="text-right">CGST</TableHead>
                      <TableHead className="text-right">SGST</TableHead>
                      <TableHead className="text-right">IGST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {b2bData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
                          No B2B invoices with recipient GSTIN found. Invoices with registered customers will appear here automatically.
                        </TableCell>
                      </TableRow>
                    ) : (
                      b2bData.map((row) => (
                        <TableRow key={row.order_id} className="text-xs font-mono">
                          <TableCell className="font-bold text-foreground">{row.invoice_number}</TableCell>
                          <TableCell>{row.invoice_date}</TableCell>
                          <TableCell className="font-bold text-primary">{row.recipient_gstin}</TableCell>
                          <TableCell className="font-sans">{row.recipient_name}</TableCell>
                          <TableCell>{row.pos_state_code}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(row.invoice_value)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.taxable_amount)}</TableCell>
                          <TableCell className="text-right text-blue-600 dark:text-blue-400">{formatCurrency(row.cgst_amount)}</TableCell>
                          <TableCell className="text-right text-indigo-600 dark:text-indigo-400">{formatCurrency(row.sgst_amount)}</TableCell>
                          <TableCell className="text-right text-purple-600 dark:text-purple-400">{formatCurrency(row.igst_amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: GSTR-3B Monthly Return Summary */}
        <TabsContent value="gstr3b" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold">GSTR-3B: Monthly Tax Liability Summary</CardTitle>
                <CardDescription>Table 3.1(a) Outward Taxable Supplies across accounting tax periods</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV(gstr3bData, 'GSTR3B_Monthly_Summary')}
                disabled={!gstr3bData.length}
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs font-bold">
                      <TableHead>Tax Period</TableHead>
                      <TableHead>Nature of Supplies</TableHead>
                      <TableHead className="text-right">Total Taxable Value</TableHead>
                      <TableHead className="text-right">Integrated Tax (IGST)</TableHead>
                      <TableHead className="text-right">Central Tax (CGST)</TableHead>
                      <TableHead className="text-right">State Tax (SGST)</TableHead>
                      <TableHead className="text-right">Total Liability</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gstr3bData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          No monthly return periods generated yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      gstr3bData.map((row) => {
                        const periodDate = new Date(row.tax_period);
                        const label = periodDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                        const periodLiability = Number(row.total_cgst || 0) + Number(row.total_sgst || 0) + Number(row.total_igst || 0);
                        return (
                          <TableRow key={row.tax_period} className="text-xs font-mono">
                            <TableCell className="font-bold text-foreground font-sans">{label}</TableCell>
                            <TableCell className="font-sans max-w-sm truncate">{row.nature_of_supplies}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(row.total_taxable_value)}</TableCell>
                            <TableCell className="text-right text-purple-600 dark:text-purple-400">{formatCurrency(row.total_igst)}</TableCell>
                            <TableCell className="text-right text-blue-600 dark:text-blue-400">{formatCurrency(row.total_cgst)}</TableCell>
                            <TableCell className="text-right text-indigo-600 dark:text-indigo-400">{formatCurrency(row.total_sgst)}</TableCell>
                            <TableCell className="text-right font-bold text-primary">{formatCurrency(periodLiability)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: GSTIN Validator Tool */}
        <TabsContent value="gstin-tool" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">GSTIN Verification & State Decoder</CardTitle>
                <CardDescription>Validate statutory 15-character GST Identification Number</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gstin-test">Enter GSTIN to Verify</Label>
                  <div className="flex gap-2">
                    <Input
                      id="gstin-test"
                      placeholder="e.g. 19AAACB1234F1Z5"
                      value={gstinInput}
                      onChange={(e) => setGstinInput(e.target.value)}
                      className="font-mono uppercase"
                      maxLength={15}
                    />
                    <Button onClick={handleValidateGSTIN}>Verify</Button>
                  </div>
                </div>

                {gstinResult && (
                  <div
                    className={`p-4 rounded-lg border ${
                      gstinResult.isValid
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                    }`}
                  >
                    {gstinResult.isValid ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Valid Statutory GSTIN Format</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800 font-sans">
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">State</span>
                            <span className="font-semibold text-foreground">{gstinResult.stateName} ({gstinResult.stateCode})</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">PAN Number</span>
                            <span className="font-mono font-bold text-foreground">{gstinResult.pan}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{gstinResult.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Indian State GST Codes (Top Jurisdictions)</CardTitle>
                <CardDescription>Reference for Place of Supply (POS) Determination</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto rounded border">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-muted/50 font-bold">
                        <TableHead className="w-16">Code</TableHead>
                        <TableHead>State / UT Name</TableHead>
                        <TableHead className="text-right">Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {INDIAN_STATES.slice(0, 15).map((state) => (
                        <TableRow key={state.code}>
                          <TableCell className="font-mono font-bold">{state.code}</TableCell>
                          <TableCell>{state.name}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {state.isUnionTerritory ? 'Union Territory' : 'State'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
