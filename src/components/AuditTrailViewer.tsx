
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Shield, Eye } from 'lucide-react';
import { useAuditTrails, useAuditTrailsByTable } from '@/hooks/useAuditTrails';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function AuditTrailViewer() {
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  
  const { data: allAudits = [], isLoading: allLoading } = useAuditTrails();
  const { data: tableAudits = [], isLoading: tableLoading } = useAuditTrailsByTable(selectedTable);
  
  const audits = selectedTable === 'all' ? allAudits : tableAudits;
  const isLoading = selectedTable === 'all' ? allLoading : tableLoading;

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Badge className="bg-green-600 text-white">Created</Badge>;
      case 'UPDATE':
        return <Badge className="bg-blue-600 text-white">Updated</Badge>;
      case 'DELETE':
        return <Badge className="bg-red-600 text-white">Deleted</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  return (
    <Card className="futuristic-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cyan-300 glow-text">
          <Shield className="h-5 w-5" />
          Audit Trail
        </CardTitle>
        <div className="flex gap-4">
          <div className="space-y-2">
            <label className="text-sm text-blue-200">Filter by Table</label>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="futuristic-card">
                <SelectItem value="all" className="text-blue-100">All Tables</SelectItem>
                <SelectItem value="items" className="text-blue-100">Items</SelectItem>
                <SelectItem value="sales" className="text-blue-100">Sales</SelectItem>
                <SelectItem value="purchases" className="text-blue-100">Purchases</SelectItem>
                <SelectItem value="payments" className="text-blue-100">Payments</SelectItem>
                <SelectItem value="stores" className="text-blue-100">Stores</SelectItem>
                <SelectItem value="categories" className="text-blue-100">Categories</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-blue-300">Loading audit trail...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="data-grid">
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Timestamp</TableHead>
                  <TableHead className="text-blue-200">Table</TableHead>
                  <TableHead className="text-blue-200">Action</TableHead>
                  <TableHead className="text-blue-200">Record ID</TableHead>
                  <TableHead className="text-blue-200">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((audit) => (
                  <TableRow key={audit.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                    <TableCell className="text-blue-100">
                      {new Date(audit.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-blue-200 capitalize">
                      {audit.table_name}
                    </TableCell>
                    <TableCell>
                      {getActionBadge(audit.action)}
                    </TableCell>
                    <TableCell className="font-mono text-blue-300 text-xs">
                      {audit.record_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedAudit(audit)}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="futuristic-card max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-cyan-300">Audit Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-blue-300">Table</p>
                                <p className="text-blue-100 capitalize">{audit.table_name}</p>
                              </div>
                              <div>
                                <p className="text-sm text-blue-300">Action</p>
                                {getActionBadge(audit.action)}
                              </div>
                            </div>
                            
                            {audit.old_data && (
                              <div>
                                <p className="text-sm text-blue-300 mb-2">Previous Data</p>
                                <pre className="bg-slate-800/50 p-3 rounded text-xs text-blue-100 overflow-auto max-h-40">
                                  {JSON.stringify(audit.old_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            
                            {audit.new_data && (
                              <div>
                                <p className="text-sm text-blue-300 mb-2">New Data</p>
                                <pre className="bg-slate-800/50 p-3 rounded text-xs text-blue-100 overflow-auto max-h-40">
                                  {JSON.stringify(audit.new_data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {audits.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-blue-300">No audit records found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
