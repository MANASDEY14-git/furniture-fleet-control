import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAllUsers } from '@/hooks/useAllUsers';
import {
  useOperationalAlerts,
  useBusinessKpis,
  useOperationalScores,
  useAgentBriefings,
  type OperationalAlert,
  type AgentBriefing
} from '@/hooks/useCommandCenter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  UserPlus,
  Moon,
  Check,
  TrendingUp,
  AlertOctagon,
  ShieldAlert as CriticalIcon,
  Info,
  Bot,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ────────────────────────────────────────────────────────
// Mini Sparkline component
// ────────────────────────────────────────────────────────
function Sparkline({ data, width = 120, height = 24 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return <div className="h-6 w-20 bg-muted/20 animate-pulse rounded" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;

  const points = data
    .map((val, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible select-none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// ────────────────────────────────────────────────────────
// Radial Progress Ring Component
// ────────────────────────────────────────────────────────
function RadialProgress({ value, label, size = 64, strokeWidth = 5 }: { value: number; label: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const getColor = (val: number) => {
    if (val >= 90) return 'text-emerald-500 stroke-emerald-500';
    if (val >= 75) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };

  const getBgColor = (val: number) => {
    if (val >= 90) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (val >= 75) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
  };

  return (
    <div className={`flex items-center gap-3 p-3 bg-card border rounded-xl shadow-sm ${getBgColor(value)}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-muted fill-none"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={`fill-none transition-all duration-500 ${getColor(value)}`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
          {Math.round(value)}%
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Score</span>
        <span className="text-sm font-semibold text-foreground leading-tight">{label}</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// CommandCenter Component
// ────────────────────────────────────────────────────────
export default function CommandCenter() {
  const { activeStoreId, activeStore } = useStoreContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const storeId = activeStoreId === 'all' ? undefined : activeStoreId;

  // Queries
  const {
    data: alerts = [],
    isLoading: isLoadingAlerts,
    resolveAlert,
    snoozeAlert,
    assignAlert,
  } = useOperationalAlerts(storeId);

  const { data: kpis = [], isLoading: isLoadingKpis } = useBusinessKpis(storeId);
  const { data: scores = [], isLoading: isLoadingScores } = useOperationalScores(storeId);
  const { data: users = [] } = useAllUsers();
  const { data: briefings = [] } = useAgentBriefings(storeId);

  // Dialog / Action States
  const [selectedAlert, setSelectedAlert] = useState<OperationalAlert | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'active' | 'ignored' | 'resolved'>('active');

  const latestScore = scores[0] || {
    overall_score: 100,
    delivery_score: 100,
    inventory_score: 100,
    finance_score: 100,
    customer_score: 100,
    compliance_score: 100,
  };

  // KPI calculations
  const latestKpi = kpis[kpis.length - 1] || {
    sales_amount: 0,
    collections_amount: 0,
    pending_collections: 0,
    inventory_value: 0,
    dead_stock_value: 0,
    delivery_success_rate: 100,
    gross_margin: 0,
  };

  const getKpiTrend = (key: keyof typeof latestKpi) => {
    return kpis.map((k) => Number(k[key] || 0)).slice(-30);
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.rpc('scan_operational_risks');
      if (error) throw error;
      const result = (data ?? {}) as any;
      setScanResult(result);
      setLastScanTime(new Date().toLocaleTimeString());
      toast({
        title: 'Scan Completed',
        description: `Alerts created: ${result.created || 0}, reopened: ${result.reopened || 0}, resolved: ${result.auto_resolved || 0}`,
      });
    } catch (err: any) {
      toast({
        title: 'Scan Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const openResolveDialog = (alert: OperationalAlert) => {
    setSelectedAlert(alert);
    setResolutionNote('');
    setResolveDialogOpen(true);
  };

  const handleResolve = async () => {
    if (!selectedAlert || !user?.id) return;
    try {
      await resolveAlert({ alertId: selectedAlert.id, note: resolutionNote, userId: user.id });
      setResolveDialogOpen(false);
      setSelectedAlert(null);
    } catch (err) {}
  };

  const handleSnooze = async (alertId: string, days: number) => {
    try {
      await snoozeAlert({ alertId, days });
    } catch (err) {}
  };

  const handleAssign = async (alertId: string, assigneeId: string) => {
    const targetVal = assigneeId === 'none' ? null : assigneeId;
    try {
      await assignAlert({ alertId, userId: targetVal });
    } catch (err) {}
  };

  // Group alerts by severity
  const filteredAlerts = alerts.filter((alert) => {
    if (statusFilter === 'active') return alert.status === 'active';
    if (statusFilter === 'resolved') return alert.status === 'resolved';
    if (statusFilter === 'ignored') {
      return (
        alert.status === 'ignored' &&
        alert.snoozed_until &&
        new Date(alert.snoozed_until).getTime() > Date.now()
      );
    }
    return false;
  });

  const criticalAlerts = filteredAlerts.filter((a) => a.severity === 'critical');
  const highAlerts = filteredAlerts.filter((a) => a.severity === 'high');
  const mediumAlerts = filteredAlerts.filter((a) => a.severity === 'medium');
  const lowAlerts = filteredAlerts.filter((a) => a.severity === 'low');

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-rose-500 text-white border-0"><CriticalIcon className="w-3 h-3 mr-1" /> Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white border-0"><AlertTriangle className="w-3 h-3 mr-1" /> High</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500 text-white border-0"><Info className="w-3 h-3 mr-1" /> Medium</Badge>;
      default:
        return <Badge className="bg-blue-500 text-white border-0"><Info className="w-3 h-3 mr-1" /> Low</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto min-h-screen">
      {/* Header Block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-primary" />
            Mission Control
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time operational scores, business KPIs, and alert management for {activeStoreId === 'all' ? 'All Stores' : activeStore?.name}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            {lastScanTime && (
              <p className="text-[10px] text-muted-foreground">
                Last scan: {lastScanTime}
              </p>
            )}
            {scanResult && (
              <p className="text-[10px] text-emerald-500 font-medium">
                Auto-resolved: {scanResult.auto_resolved || 0} alerts
              </p>
            )}
          </div>
          <Button
            onClick={handleRunScan}
            disabled={isScanning}
            className="shadow-sm font-semibold transition-all"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
            Run Intelligence Scan
          </Button>
        </div>
      </div>

      {/* Health Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <RadialProgress value={latestScore.overall_score} label="Overall Score" />
        <RadialProgress value={latestScore.delivery_score} label="Delivery Success" />
        <RadialProgress value={latestScore.inventory_score} label="Inventory Health" />
        <RadialProgress value={latestScore.finance_score} label="Financial Health" />
        <RadialProgress value={latestScore.customer_score} label="Customer Score" />
        <RadialProgress value={latestScore.compliance_score} label="Compliance" />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        {[
          { label: 'Sales', val: `₹${latestKpi.sales_amount.toLocaleString('en-IN')}`, key: 'sales_amount', color: 'text-emerald-500' },
          { label: 'Collections', val: `₹${latestKpi.collections_amount.toLocaleString('en-IN')}`, key: 'collections_amount', color: 'text-indigo-500' },
          { label: 'Pending Dues', val: `₹${latestKpi.pending_collections.toLocaleString('en-IN')}`, key: 'pending_collections', color: 'text-rose-500' },
          { label: 'Inventory Val', val: `₹${latestKpi.inventory_value.toLocaleString('en-IN')}`, key: 'inventory_value', color: 'text-blue-500' },
          { label: 'Dead Stock', val: `₹${latestKpi.dead_stock_value.toLocaleString('en-IN')}`, key: 'dead_stock_value', color: 'text-amber-500' },
          { label: 'Delivery Rate', val: `${latestKpi.delivery_success_rate}%`, key: 'delivery_success_rate', color: 'text-emerald-500' },
          { label: 'Gross Margin', val: `${latestKpi.gross_margin}%`, key: 'gross_margin', color: 'text-teal-500' },
        ].map((k) => (
          <Card key={k.label} className="bg-card/40 border border-border/50">
            <CardHeader className="p-3 pb-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{k.label}</span>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <div className="text-base font-bold truncate">{k.val}</div>
              <div className={`flex items-center gap-1 ${k.color}`}>
                <TrendingUp className="w-3.5 h-3.5" />
                <Sparkline data={getKpiTrend(k.key as any)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Inbox Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">Alert Inbox</h2>
            <Badge variant="outline" className="bg-primary/5 text-primary">
              {filteredAlerts.length} total
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/50 p-0.5 rounded-lg border">
            {(['active', 'ignored', 'resolved'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-xs px-3 py-1 rounded-md font-semibold transition-all ${
                  statusFilter === status
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {status === 'active' ? 'Open' : status === 'ignored' ? 'Snoozed' : 'Resolved'}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts List by Severity */}
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-2xl bg-card/20">
            <CheckCircle className="w-12 h-12 text-emerald-500/80 mb-3" />
            <h3 className="font-semibold text-lg">All Operational Systems Normal</h3>
            <p className="text-muted-foreground text-sm mt-1">There are no operational risk alerts currently active.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* critical alerts */}
            {criticalAlerts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4" /> Critical Alerts
                </h3>
                <div className="grid gap-3">
                  {criticalAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} users={users} onResolve={openResolveDialog} onSnooze={handleSnooze} onAssign={handleAssign} />
                  ))}
                </div>
              </div>
            )}

            {/* high alerts */}
            {highAlerts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> High Priority Alerts
                </h3>
                <div className="grid gap-3">
                  {highAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} users={users} onResolve={openResolveDialog} onSnooze={handleSnooze} onAssign={handleAssign} />
                  ))}
                </div>
              </div>
            )}

            {/* medium alerts */}
            {mediumAlerts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Medium Priority Alerts
                </h3>
                <div className="grid gap-3">
                  {mediumAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} users={users} onResolve={openResolveDialog} onSnooze={handleSnooze} onAssign={handleAssign} />
                  ))}
                </div>
              </div>
            )}

            {/* low alerts */}
            {lowAlerts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-4 h-4" /> Low Priority Alerts
                </h3>
                <div className="grid gap-3">
                  {lowAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} users={users} onResolve={openResolveDialog} onSnooze={handleSnooze} onAssign={handleAssign} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Alert</DialogTitle>
            <DialogDescription>
              Provide audit-trail comments detailing how this issue was resolved.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="e.g. Purchase order #1024 placed to replenish Oakwood logs. Transport scheduled for tomorrow."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleResolve} disabled={!resolutionNote.trim()}>
              Confirm Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Alert Card Component
// ────────────────────────────────────────────────────────
interface AlertCardProps {
  alert: OperationalAlert;
  users: any[];
  onResolve: (alert: OperationalAlert) => void;
  onSnooze: (alertId: string, days: number) => void;
  onAssign: (alertId: string, userId: string) => void;
}

function AlertCard({ alert, users, onResolve, onSnooze, onAssign }: AlertCardProps) {
  const isReopened = !!alert.reopened_from;

  return (
    <Card className={`border shadow-sm transition-all overflow-hidden ${
      alert.severity === 'critical' ? 'border-l-4 border-l-rose-500' :
      alert.severity === 'high' ? 'border-l-4 border-l-orange-500' :
      alert.severity === 'medium' ? 'border-l-4 border-l-amber-500' :
      'border-l-4 border-l-blue-500'
    }`}>
      <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <span className="font-bold text-sm text-foreground truncate">{alert.title}</span>
            {isReopened && (
              <Badge className="bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold text-[9px] uppercase tracking-wider">
                Recurrent / Reopened
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>

          {/* Deduplication / Reopen Diagnostics */}
          {isReopened && (
            <div className="bg-muted/40 border p-2 rounded-lg text-[10px] space-y-1 mt-2 max-w-2xl">
              <div className="font-medium text-foreground">Reopened Frequency Diagnostics:</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
                <div>• Last Active Hash: <code className="bg-muted px-1 rounded">{alert.last_signal_hash?.substring(0, 12) || 'N/A'}</code></div>
                <div>• Diagnostic Value: <span className="font-semibold text-foreground">₹{Number(alert.last_numeric_signal || 0).toLocaleString('en-IN')}</span></div>
                <div>• Last Seen: {alert.last_seen_at ? new Date(alert.last_seen_at).toLocaleString() : 'N/A'}</div>
                <div>• Auto-Reopen Threshold: <span className="font-semibold text-foreground">1.5x change</span></div>
              </div>
            </div>
          )}

          <div className="flex items-center flex-wrap gap-3 text-[10px] text-muted-foreground pt-1">
            <span>Created: {new Date(alert.created_at).toLocaleString()}</span>
            {alert.snoozed_until && (
              <span className="flex items-center gap-1 text-amber-500">
                <Clock className="w-3 h-3" />
                Snoozed until: {new Date(alert.snoozed_until).toLocaleDateString()}
              </span>
            )}
            {alert.status === 'resolved' && (
              <span className="text-emerald-500 font-semibold">
                Resolved: {alert.resolved_at ? new Date(alert.resolved_at).toLocaleDateString() : ''}
              </span>
            )}
          </div>
        </div>

        {/* Actions strip */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
          {alert.status !== 'resolved' && (
            <>
              {/* Assignee select */}
              <div className="flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                <Select
                  value={alert.assigned_to || 'none'}
                  onValueChange={(val) => onAssign(alert.id, val)}
                >
                  <SelectTrigger className="h-8 text-xs min-w-[130px] border-border bg-accent/40 hover:bg-accent">
                    <SelectValue placeholder="Assign To" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Snooze Options */}
              <Select onValueChange={(val) => onSnooze(alert.id, parseInt(val))}>
                <SelectTrigger className="h-8 text-xs w-[90px] border-border bg-accent/40 hover:bg-accent">
                  <Moon className="w-3 h-3 mr-1 text-muted-foreground" />
                  Snooze
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                </SelectContent>
              </Select>

              {/* Resolve Button */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 border-emerald-500/20"
                onClick={() => onResolve(alert)}
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Resolve
              </Button>
            </>
          )}

          {alert.status === 'resolved' && alert.resolution_note && (
            <div className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 p-2 rounded-lg max-w-xs">
              <span className="font-semibold block mb-0.5 text-emerald-700">Resolution Audit Note:</span>
              <p className="italic leading-normal">"{alert.resolution_note}"</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
