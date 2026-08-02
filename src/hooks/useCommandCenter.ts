import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { useAuth } from '@/contexts/AuthContext';

// 60 seconds stale time
const STALE_TIME = 60 * 1000;

// ────────────────────────────────────────────────────────
// 1. Operational Alerts Hook
// ────────────────────────────────────────────────────────
export interface OperationalAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority_score: number;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  dedupe_key: string | null;
  store_id: string;
  status: 'active' | 'resolved' | 'ignored';
  assigned_to: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  resolved_source: string | null;
  ai_summary: string | null;
  ai_recommendation: string | null;
  ai_confidence: number | null;
  metadata: any;
  created_at: string;
  resolved_at: string | null;
  updated_at: string | null;
  snoozed_until: string | null;
  last_signal_hash: string | null;
  last_numeric_signal: number | null;
  last_seen_at: string | null;
  auto_resolved: boolean;
  reopened_from: string | null;
}

export const useOperationalAlerts = (storeId?: string) => {
  const { selectedYear } = useFinancialYear();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['operational-alerts', storeId, selectedYear?.id],
    enabled: !!selectedYear,
    staleTime: STALE_TIME,
    queryFn: async (): Promise<OperationalAlert[]> => {
      let q = supabase
        .from('operational_alerts')
        .select('*')
        .order('priority_score', { ascending: false });

      if (storeId && storeId !== 'all') {
        q = q.eq('store_id', storeId);
      }

      if (selectedYear) {
        q = q.gte('created_at', selectedYear.start_date).lte('created_at', `${selectedYear.end_date}T23:59:59Z`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as OperationalAlert[];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ alertId, note, userId }: { alertId: string; note: string; userId: string }) => {
      const { error } = await supabase
        .from('operational_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
          resolution_note: note,
          resolved_source: 'user',
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-alerts'] });
      toast({ title: 'Alert Resolved', description: 'The alert has been marked as resolved.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async ({ alertId, days }: { alertId: string; days: number }) => {
      const snoozedUntil = new Date();
      snoozedUntil.setDate(snoozedUntil.getDate() + days);

      const { error } = await supabase
        .from('operational_alerts')
        .update({
          status: 'ignored',
          snoozed_until: snoozedUntil.toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-alerts'] });
      toast({ title: 'Alert Snoozed', description: 'The alert has been snoozed.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ alertId, userId }: { alertId: string; userId: string | null }) => {
      const { error } = await supabase
        .from('operational_alerts')
        .update({ assigned_to: userId })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-alerts'] });
      toast({ title: 'Assignee Updated', description: 'The alert assignment has been updated.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return {
    ...query,
    resolveAlert: resolveMutation.mutateAsync,
    snoozeAlert: snoozeMutation.mutateAsync,
    assignAlert: assignMutation.mutateAsync,
    isResolving: resolveMutation.isPending,
    isSnoozing: snoozeMutation.isPending,
    isAssigning: assignMutation.isPending,
  };
};

// ────────────────────────────────────────────────────────
// 2. Business KPIs Hook
// ────────────────────────────────────────────────────────
export interface BusinessKpi {
  id: string;
  store_id: string;
  date: string;
  sales_amount: number;
  collections_amount: number;
  pending_collections: number;
  inventory_value: number;
  dead_stock_value: number;
  delivery_success_rate: number;
  gross_margin: number;
  created_at: string;
}

export const useBusinessKpis = (storeId?: string) => {
  const { selectedYear } = useFinancialYear();

  return useQuery({
    queryKey: ['daily-business-kpis', storeId, selectedYear?.id],
    enabled: !!selectedYear,
    staleTime: STALE_TIME,
    queryFn: async (): Promise<BusinessKpi[]> => {
      let q = supabase
        .from('daily_business_kpis')
        .select('*')
        .order('date', { ascending: true });

      if (storeId && storeId !== 'all') {
        q = q.eq('store_id', storeId);
      }

      if (selectedYear) {
        q = q.gte('date', selectedYear.start_date).lte('date', selectedYear.end_date);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as BusinessKpi[];
    },
  });
};

// ────────────────────────────────────────────────────────
// 3. Store Operational Scores Hook
// ────────────────────────────────────────────────────────
export interface StoreOperationalScore {
  id: string;
  store_id: string;
  date: string;
  delivery_score: number;
  inventory_score: number;
  finance_score: number;
  customer_score: number;
  compliance_score: number;
  overall_score: number;
  created_at: string;
}

export const useOperationalScores = (storeId?: string) => {
  const { selectedYear } = useFinancialYear();

  return useQuery({
    queryKey: ['store-operational-scores', storeId, selectedYear?.id],
    enabled: !!selectedYear,
    staleTime: STALE_TIME,
    queryFn: async (): Promise<StoreOperationalScore[]> => {
      let q = supabase
        .from('store_operational_scores')
        .select('*')
        .order('date', { ascending: false });

      if (storeId && storeId !== 'all') {
        q = q.eq('store_id', storeId);
      }

      if (selectedYear) {
        q = q.gte('date', selectedYear.start_date).lte('date', selectedYear.end_date);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as StoreOperationalScore[];
    },
  });
};

// ────────────────────────────────────────────────────────
// 4. Agent Briefings Hook
// ────────────────────────────────────────────────────────
export interface AgentBriefing {
  id: string;
  store_id: string;
  generated_at: string;
  summary: string;
  agent_outputs: {
    sales?: string;
    inventory?: string;
    purchases?: string;
    finance?: string;
    [key: string]: any;
  };
  source: 'scheduled' | 'manual';
  generated_for_date: string;
  created_at: string;
}

export const useAgentBriefings = (storeId?: string) => {
  const { selectedYear } = useFinancialYear();

  return useQuery({
    queryKey: ['agent-briefings', storeId, selectedYear?.id],
    enabled: !!selectedYear,
    staleTime: STALE_TIME,
    queryFn: async (): Promise<AgentBriefing[]> => {
      let q = supabase
        .from('agent_briefings')
        .select('*')
        .order('generated_at', { ascending: false });

      if (storeId && storeId !== 'all') {
        q = q.eq('store_id', storeId);
      }

      if (selectedYear) {
        q = q.gte('generated_for_date', selectedYear.start_date).lte('generated_for_date', selectedYear.end_date);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AgentBriefing[];
    },
  });
};

// ────────────────────────────────────────────────────────
// 5. Agent Settings Hook
// ────────────────────────────────────────────────────────
export interface AgentSettings {
  store_id: string;
  briefing_enabled: boolean;
  briefing_time: string;
  briefing_timezone: string;
  enabled_agents: string[];
  last_briefing_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useAgentSettings = (storeId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['agent-settings', storeId],
    enabled: !!storeId && storeId !== 'all',
    staleTime: STALE_TIME,
    queryFn: async (): Promise<AgentSettings | null> => {
      if (!storeId || storeId === 'all') return null;
      const { data, error } = await supabase
        .from('agent_settings')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();

      if (error) throw error;
      return data as AgentSettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (settings: Partial<AgentSettings>) => {
      if (!storeId || storeId === 'all') throw new Error('Valid store ID is required');

      // Check if row exists
      const { data: existing } = await supabase
        .from('agent_settings')
        .select('store_id')
        .eq('store_id', storeId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('agent_settings')
          .update(settings)
          .eq('store_id', storeId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agent_settings')
          .insert({ store_id: storeId, ...settings });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-settings', storeId] });
      toast({ title: 'Settings Saved', description: 'Agent briefing preferences updated.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error Saving Settings', description: err.message, variant: 'destructive' });
    },
  });

  return {
    ...query,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};

// ────────────────────────────────────────────────────────
// 6. Telegram Link Hook
// ────────────────────────────────────────────────────────
export interface TelegramLink {
  id: string;
  user_id: string;
  store_id: string;
  chat_id: number;
  telegram_username: string | null;
  telegram_first_name: string | null;
  notification_preferences: {
    low_stock: boolean;
    new_orders: boolean;
    daily_summary: boolean;
    quote_accepted: boolean;
    payments_received: boolean;
    delivery_reminders: boolean;
    large_order_threshold: number;
  };
  is_active: boolean;
  linked_at: string;
}

export interface TelegramMessage {
  update_id: number;
  chat_id: number;
  user_id: number | null;
  text: string | null;
  raw_update: any;
  created_at: string;
}

export const useTelegramLink = (storeId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const linkQuery = useQuery({
    queryKey: ['telegram-link', storeId, user?.id],
    enabled: !!storeId && storeId !== 'all' && !!user?.id,
    staleTime: STALE_TIME,
    queryFn: async (): Promise<TelegramLink | null> => {
      if (!storeId || storeId === 'all' || !user?.id) return null;
      const { data, error } = await supabase
        .from('telegram_links')
        .select('*')
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as TelegramLink;
    },
  });

  const messagesQuery = useQuery({
    queryKey: ['telegram-messages'],
    staleTime: STALE_TIME,
    queryFn: async (): Promise<TelegramMessage[]> => {
      const { data, error } = await supabase
        .from('telegram_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data || []) as TelegramMessage[];
    },
  });

  const generateCodeMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!storeId || storeId === 'all' || !user?.id) throw new Error('Missing store or user session');

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      const { error } = await supabase
        .from('telegram_link_codes')
        .insert({
          user_id: user.id,
          store_id: storeId,
          code,
          expires_at: expiresAt,
        });

      if (error) throw error;
      return code;
    },
    onError: (err: any) => {
      toast({ title: 'Error Generating Code', description: err.message, variant: 'destructive' });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (prefs: TelegramLink['notification_preferences']) => {
      if (!linkQuery.data?.id) throw new Error('No active Telegram link');

      const { error } = await supabase
        .from('telegram_links')
        .update({ notification_preferences: prefs })
        .eq('id', linkQuery.data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-link', storeId, user?.id] });
      toast({ title: 'Preferences Saved', description: 'Notification settings updated.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      if (!linkQuery.data?.id) throw new Error('No active Telegram link');

      const { error } = await supabase
        .from('telegram_links')
        .delete()
        .eq('id', linkQuery.data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-link', storeId, user?.id] });
      toast({ title: 'Telegram Unlinked', description: 'Your Telegram account has been unlinked.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return {
    link: linkQuery.data,
    isLoadingLink: linkQuery.isLoading,
    messages: messagesQuery.data || [],
    isLoadingMessages: messagesQuery.isLoading,
    generateCode: generateCodeMutation.mutateAsync,
    isGeneratingCode: generateCodeMutation.isPending,
    updatePreferences: updatePreferencesMutation.mutateAsync,
    isSavingPreferences: updatePreferencesMutation.isPending,
    unlinkTelegram: unlinkMutation.mutateAsync,
    isUnlinking: unlinkMutation.isPending,
    refetchLink: linkQuery.refetch,
    refetchMessages: messagesQuery.refetch,
  };
};

// ────────────────────────────────────────────────────────
// 7. System Events Hook
// ────────────────────────────────────────────────────────
export interface SystemEvent {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  store_id: string | null;
  payload: any;
  source_table: string | null;
  source_operation: string | null;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
}

export const useSystemEvents = (storeId?: string) => {
  const { selectedYear } = useFinancialYear();

  return useQuery({
    queryKey: ['system-events', storeId, selectedYear?.id],
    enabled: !!selectedYear,
    staleTime: STALE_TIME,
    queryFn: async (): Promise<SystemEvent[]> => {
      let q = supabase
        .from('system_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (storeId && storeId !== 'all') {
        q = q.eq('store_id', storeId);
      }

      if (selectedYear) {
        q = q.gte('created_at', selectedYear.start_date).lte('created_at', `${selectedYear.end_date}T23:59:59Z`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SystemEvent[];
    },
  });
};

// ────────────────────────────────────────────────────────
// 8. Security Audit Log Hook (Admins Only)
// ────────────────────────────────────────────────────────
export interface SecurityAuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export const useSecurityAuditLog = () => {
  const { selectedYear } = useFinancialYear();

  return useQuery({
    queryKey: ['security-audit-log', selectedYear?.id],
    enabled: !!selectedYear,
    staleTime: STALE_TIME,
    queryFn: async (): Promise<SecurityAuditLog[]> => {
      let q = supabase
        .from('security_audit_log')
        .select(`
          id, user_id, action, table_name, record_id, ip_address, user_agent, created_at,
          profiles ( first_name, last_name, email )
        `)
        .order('created_at', { ascending: false });

      if (selectedYear) {
        q = q.gte('created_at', selectedYear.start_date).lte('created_at', `${selectedYear.end_date}T23:59:59Z`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles,
      })) as SecurityAuditLog[];
    },
  });
};

// ────────────────────────────────────────────────────────
// 9. Supplier Store Access Hook
// ────────────────────────────────────────────────────────
export interface SupplierStoreAccess {
  id: string;
  supplier_id: string;
  store_id: string;
  created_at: string;
  suppliers?: { name: string } | null;
  stores?: { name: string } | null;
}

export const useSupplierStoreAccess = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['supplier-store-access'],
    staleTime: STALE_TIME,
    queryFn: async (): Promise<SupplierStoreAccess[]> => {
      const { data, error } = await supabase
        .from('supplier_store_access')
        .select(`
          id, supplier_id, store_id, created_at,
          suppliers ( name ),
          stores ( name )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        suppliers: Array.isArray(d.suppliers) ? d.suppliers[0] : d.suppliers,
        stores: Array.isArray(d.stores) ? d.stores[0] : d.stores,
      })) as SupplierStoreAccess[];
    },
  });

  const grantMutation = useMutation({
    mutationFn: async ({ supplierId, storeId }: { supplierId: string; storeId: string }) => {
      const { error } = await supabase
        .from('supplier_store_access')
        .insert({ supplier_id: supplierId, store_id: storeId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-store-access'] });
      toast({ title: 'Access Granted', description: 'Supplier access mapping added successfully.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error Granting Access', description: err.message, variant: 'destructive' });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('supplier_store_access')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-store-access'] });
      toast({ title: 'Access Revoked', description: 'Supplier access mapping removed successfully.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error Revoking Access', description: err.message, variant: 'destructive' });
    },
  });

  return {
    ...query,
    grantAccess: grantMutation.mutateAsync,
    revokeAccess: revokeMutation.mutateAsync,
    isGranting: grantMutation.isPending,
    isRevoking: revokeMutation.isPending,
  };
};

// ────────────────────────────────────────────────────────
// 10. AI insights Table Hook
// ────────────────────────────────────────────────────────
export interface AiInsight {
  id: string;
  store_id: string | null;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  recommendation: string;
  confidence: number;
  impact_score: number;
  created_at: string;
}

export const useAiTableInsights = (storeId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['ai-table-insights', storeId],
    staleTime: STALE_TIME,
    queryFn: async (): Promise<AiInsight[]> => {
      let q = supabase
        .from('ai_insights')
        .select('*')
        .order('impact_score', { ascending: false });

      if (storeId && storeId !== 'all') {
        q = q.or(`store_id.is.null,store_id.eq.${storeId}`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AiInsight[];
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('generate_ai_insights');
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['ai-table-insights'] });
      toast({ title: 'Insights Refreshed', description: `Successfully generated ${count} insights.` });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return {
    ...query,
    refreshInsights: refreshMutation.mutateAsync,
    isRefreshing: refreshMutation.isPending,
  };
};
