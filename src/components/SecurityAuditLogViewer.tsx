import { useState } from 'react';
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
import { ShieldAlert, Info, Monitor, Globe } from 'lucide-react';
import { useSecurityAuditLog, type SecurityAuditLog } from '@/hooks/useCommandCenter';

export default function SecurityAuditLogViewer() {
  const { data: logs = [], isLoading } = useSecurityAuditLog();

  const getActionColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('login') || act.includes('auth')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (act.includes('delete') || act.includes('revoke')) return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    if (act.includes('update') || act.includes('role')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  };

  return (
    <Card className="futuristic-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cyan-300 glow-text text-lg">
          <ShieldAlert className="h-5 w-5 text-rose-500" />
          Security Audit Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-blue-300 text-sm">Loading security logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="data-grid w-full text-xs">
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Timestamp</TableHead>
                  <TableHead className="text-blue-200">User / Operator</TableHead>
                  <TableHead className="text-blue-200">Action Event</TableHead>
                  <TableHead className="text-blue-200">Table Scoped</TableHead>
                  <TableHead className="text-blue-200">Record Hash</TableHead>
                  <TableHead className="text-blue-200">Network IP</TableHead>
                  <TableHead className="text-blue-200 text-right">User Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const operatorName = log.profiles
                    ? `${log.profiles.first_name || ''} ${log.profiles.last_name || ''}`.trim() || log.profiles.email
                    : 'System/Unknown';
                  return (
                    <TableRow key={log.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                      <TableCell className="text-blue-100 font-mono text-[10px]">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-blue-100 font-semibold">
                        {operatorName}
                        {log.profiles?.email && log.profiles.email !== operatorName && (
                          <span className="text-[9px] block text-blue-400/80 font-normal">{log.profiles.email}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize font-bold text-[9px] ${getActionColor(log.action)}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-blue-200 capitalize font-mono text-[10px]">
                        {log.table_name || 'System'}
                      </TableCell>
                      <TableCell className="font-mono text-blue-300 text-[10px]">
                        {log.record_id ? `${log.record_id.substring(0, 8)}...` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-blue-200 font-mono text-[10px] flex items-center gap-1">
                        <Globe className="w-3 h-3 text-blue-400" />
                        {log.ip_address || 'Internal/Local'}
                      </TableCell>
                      <TableCell className="text-right text-[9px] text-blue-400 max-w-xs truncate" title={log.user_agent || ''}>
                        {log.user_agent ? (
                          <span className="flex items-center justify-end gap-1">
                            <Monitor className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="truncate">{log.user_agent}</span>
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {logs.length === 0 && !isLoading && (
          <div className="text-center py-8 text-blue-300 text-sm">
            No security audit records registered in system.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
