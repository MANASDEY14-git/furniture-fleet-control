import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Percent, DollarSign, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SalespersonPerformance, DiscountViolation } from '@/hooks/useSalesIntelligence';

interface DiscountAnalysisSectionProps {
  salespeople?: SalespersonPerformance[];
}

export function DiscountAnalysisSection({ salespeople = [] }: DiscountAnalysisSectionProps) {
  if (!salespeople || salespeople.length === 0) return null;

  const totalLostToDiscounts = salespeople.reduce((acc, s) => acc + s.revenueLostToDiscounts, 0);
  const totalViolationsCount = salespeople.reduce((acc, s) => acc + s.approvalViolationsCount, 0);

  // Flatten all violations
  const allViolations: Array<DiscountViolation & { repName: string }> = [];
  salespeople.forEach(sp => {
    sp.discountViolations.forEach(v => {
      allViolations.push({ ...v, repName: sp.name });
    });
  });

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-500" /> Discount Analysis & Margin Protection Governance
            </CardTitle>
            <CardDescription className="text-xs">
              Monitor average discount levels, revenue lost to unapproved price concessions, and manager approval gates.
            </CardDescription>
          </div>

          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" /> Total Discount Loss: {formatCurrency(totalLostToDiscounts)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Salespeople Discount Overview Table */}
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] bg-accent/40">
                <TableHead>Salesperson</TableHead>
                <TableHead>Avg Discount %</TableHead>
                <TableHead>Highest Discount</TableHead>
                <TableHead>Revenue Lost to Discounts</TableHead>
                <TableHead>Margin Impact</TableHead>
                <TableHead>Violations Flagged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {salespeople.map((sp) => (
                <TableRow key={sp.id}>
                  <TableCell className="font-bold">{sp.name}</TableCell>
                  <TableCell className={sp.avgDiscountPct > 10 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-medium'}>
                    {sp.avgDiscountPct}%
                  </TableCell>
                  <TableCell>{sp.highestDiscountPct}%</TableCell>
                  <TableCell className="font-semibold text-rose-600 dark:text-rose-400">
                    {formatCurrency(sp.revenueLostToDiscounts)}
                  </TableCell>
                  <TableCell>{sp.marginImpactPct}% margin drop</TableCell>
                  <TableCell>
                    {sp.approvalViolationsCount > 0 ? (
                      <Badge variant="destructive" className="text-[10px] font-bold">
                        {sp.approvalViolationsCount} Flagged
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                        0 Violations
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Flagged Discount Violations Ledger */}
        {allViolations.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5 text-rose-500" /> Recent Unapproved Discount Exception Logs
            </h4>
            <div className="space-y-2">
              {allViolations.map((v) => (
                <div key={v.id} className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-rose-900 dark:text-rose-100">{v.repName}</span>
                    <span className="text-muted-foreground ml-2">({v.orderNumber} - {v.customerName})</span>
                    <p className="text-[11px] text-rose-800 dark:text-rose-200 mt-0.5">{v.reason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-rose-600 dark:text-rose-400 block">{v.discountPct}% Discount</span>
                    <span className="text-[10px] text-muted-foreground">Lost: {formatCurrency(v.revenueLost)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
