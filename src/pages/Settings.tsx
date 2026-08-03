import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, Settings as SettingsIcon, Building2, Wrench,
  Bot, Send, RefreshCw, Clock, Sparkles, Key, Check, Info, ShieldAlert,
  ListFilter, AlertTriangle, Eye, ShieldCheck, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStores, useDeleteStore } from '@/hooks/useStores';
import { useCategories, useDeleteCategory } from '@/hooks/useCategories';
import { useAllBankAccounts, useDeleteBankAccount } from '@/hooks/useBankAccounts';
import { useLaborCategories, useDeleteLaborCategory } from '@/hooks/useLaborCategories';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import { useStoreContext } from '@/contexts/StoreContext';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAgentBriefings,
  useAgentSettings,
  useTelegramLink,
  useSystemEvents
} from '@/hooks/useCommandCenter';
import StoreForm from '@/components/StoreForm';
import CategoryForm from '@/components/CategoryForm';
import LaborCategoryForm from '@/components/LaborCategoryForm';
import UserManagementCard from '@/components/admin/UserManagementCard';
import BankAccountForm from '@/components/BankAccountForm';
import FinancialYearsCard from '@/components/FinancialYearsCard';
import { formatCurrency } from '@/utils/currencyUtils';

export default function Settings() {
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: bankAccounts = [], isLoading: bankAccountsLoading } = useAllBankAccounts();
  const { data: laborCategories = [], isLoading: laborCategoriesLoading } = useLaborCategories();
  const { data: roleData } = useCurrentUserRole();
  const { activeStoreId, activeStore } = useStoreContext();

  const deleteStore = useDeleteStore();
  const deleteCategory = useDeleteCategory();
  const deleteBankAccount = useDeleteBankAccount();
  const deleteLaborCategory = useDeleteLaborCategory();

  const isAdmin = roleData?.isAdmin;
  const isManager = roleData?.isManager;
  const canConfigure = isAdmin || isManager;
  const currentStoreId = activeStoreId === 'all' ? undefined : activeStoreId;

  const handleDeleteStore = (id: string) => {
    deleteStore.mutate(id);
  };

  const handleDeleteCategory = (id: string) => {
    deleteCategory.mutate(id);
  };

  const handleDeleteBankAccount = (id: string) => {
    deleteBankAccount.mutate(id);
  };

  const handleDeleteLaborCategory = (id: string) => {
    deleteLaborCategory.mutate(id);
  };

  const getStoreName = (storeId: string) => {
    return stores.find(s => s.id === storeId)?.name || 'Unknown Store';
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <SettingsIcon className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure registry data, agent parameters, bot triggers, and review audit trails.</p>
        </div>
      </div>

      <Tabs defaultValue="registry" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-2xl bg-muted/60 p-1 border rounded-xl">
          <TabsTrigger value="registry" className="font-semibold text-xs py-2 rounded-lg">Store Registry</TabsTrigger>
          <TabsTrigger value="agents" className="font-semibold text-xs py-2 rounded-lg">Agents & Briefs</TabsTrigger>
          <TabsTrigger value="telegram" className="font-semibold text-xs py-2 rounded-lg">Telegram Bot</TabsTrigger>
          <TabsTrigger value="events" className="font-semibold text-xs py-2 rounded-lg">System Logs</TabsTrigger>
        </TabsList>

        {/* TAB 1: STORE REGISTRY */}
        <TabsContent value="registry" className="space-y-6">
          {/* User Management - Admin Only */}
          {isAdmin && <UserManagementCard />}

          {/* Financial Years */}
          <FinancialYearsCard isAdmin={isAdmin} />

          {/* Stores Management */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Stores Registry</CardTitle>
                <CardDescription>Register physical branches or outlets.</CardDescription>
              </div>
              {isAdmin && (
                <StoreForm
                  trigger={
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Store
                    </Button>
                  }
                />
              )}
            </CardHeader>
            <CardContent>
              {storesLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">Loading stores...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="data-grid w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Store Name</TableHead>
                        <TableHead>Warehouse / Location</TableHead>
                        {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stores.map(store => (
                        <TableRow key={store.id}>
                          <TableCell className="font-medium text-foreground">{store.name}</TableCell>
                          <TableCell className="text-muted-foreground">{store.location}</TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <StoreForm
                                  store={store}
                                  trigger={
                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                  }
                                />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Store</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{store.name}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteStore(store.id)} className="bg-rose-600 hover:bg-rose-700 text-white">
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {stores.length === 0 && !storesLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    {isAdmin ? 'No stores found. Add your first store.' : 'No stores assigned.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bank Accounts Management */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Bank Accounts</CardTitle>
                <CardDescription>Record store financial ledgers.</CardDescription>
              </div>
              <BankAccountForm
                trigger={
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Bank Account
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              {bankAccountsLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">Loading bank accounts...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="data-grid w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>Account Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead className="text-right">Current Balance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankAccounts.map(account => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium text-foreground">{account.account_name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {account.bank_name}
                            {account.branch_name && (
                              <span className="text-[10px] block text-muted-foreground">{account.branch_name}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono">
                            ****{account.account_number.slice(-4)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {account.account_type || 'savings'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {account.stores?.name || getStoreName(account.store_id)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
                            {formatCurrency(account.current_balance || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <BankAccountForm
                                bankAccount={account}
                                trigger={
                                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                }
                              />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{account.account_name}"? Transaction histories are kept.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteBankAccount(account.id)} className="bg-rose-600 hover:bg-rose-700 text-white">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {bankAccounts.length === 0 && !bankAccountsLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">No bank accounts found. Add one to start tracking transactions.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Categories Management */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Category Database</CardTitle>
                <CardDescription>Product and variant categories.</CardDescription>
              </div>
              <CategoryForm
                trigger={
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">Loading categories...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="data-grid w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map(category => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium text-foreground">{category.name}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <CategoryForm
                                category={category}
                                trigger={
                                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                }
                              />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteCategory(category.id)} className="bg-rose-600 hover:bg-rose-700 text-white">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Labor Categories Management */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Labor Categories</CardTitle>
                <CardDescription>BOM Hourly Rates for manufacturing services.</CardDescription>
              </div>
              <LaborCategoryForm
                trigger={
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Labor Category
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              {laborCategoriesLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">Loading labor categories...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="data-grid w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Hourly Rate</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {laborCategories.map(category => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium text-foreground">{category.name}</TableCell>
                          <TableCell className="text-muted-foreground">{category.description || '-'}</TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
                            {formatCurrency(category.default_hourly_rate)}/hr
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <LaborCategoryForm
                                laborCategory={category}
                                trigger={
                                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                }
                              />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Labor Category</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteLaborCategory(category.id)} className="bg-rose-600 hover:bg-rose-700 text-white">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: AGENTS & BRIEFS */}
        <TabsContent value="agents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agent Configuration Settings Card */}
            <div className="lg:col-span-1">
              <AgentSettingsCard storeId={currentStoreId} isEditable={canConfigure} />
            </div>

            {/* Briefings history log */}
            <div className="lg:col-span-2">
              <AgentBriefingsList storeId={currentStoreId} />
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: TELEGRAM BOT */}
        <TabsContent value="telegram" className="space-y-6">
          <TelegramSettingsCard storeId={currentStoreId} isAdmin={isAdmin} />
        </TabsContent>

        {/* TAB 4: SYSTEM LOGS */}
        <TabsContent value="events" className="space-y-6">
          <SystemEventsLog storeId={currentStoreId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Sub-Component: AgentSettingsCard
// ────────────────────────────────────────────────────────
function AgentSettingsCard({ storeId, isEditable }: { storeId?: string; isEditable: boolean }) {
  const { data: settings, updateSettings, isUpdating, isLoading } = useAgentSettings(storeId);
  const [enabled, setEnabled] = useState(true);
  const [time, setTime] = useState('08:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [agents, setAgents] = useState<string[]>([]);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.briefing_enabled);
      setTime(settings.briefing_time?.substring(0, 5) || '08:00');
      setTimezone(settings.briefing_timezone || 'Asia/Kolkata');
      setAgents(settings.enabled_agents || []);
    }
  }, [settings]);

  if (!storeId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Select a specific store outlet in the top-bar to configure AI Agent settings.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Loading Agent parameters...
        </CardContent>
      </Card>
    );
  }

  const handleSave = async () => {
    try {
      await updateSettings({
        briefing_enabled: enabled,
        briefing_time: time + ':00',
        briefing_timezone: timezone,
        enabled_agents: agents,
      });
    } catch (err) {}
  };

  const toggleAgent = (agent: string) => {
    if (!isEditable) return;
    setAgents(prev =>
      prev.includes(agent) ? prev.filter(a => a !== agent) : [...prev, agent]
    );
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          Briefing Configuration
        </CardTitle>
        <CardDescription>Enable scheduled briefings and toggle active specialists.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-2.5 bg-muted/30 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="font-semibold text-sm">Daily Briefing Emails</Label>
            <span className="text-[10px] text-muted-foreground block">Receive consolidated reports.</span>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={!isEditable || isUpdating}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Delivery Time</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!isEditable || !enabled || isUpdating}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Timezone</Label>
            <Select
              value={timezone}
              onValueChange={setTimezone}
              disabled={!isEditable || !enabled || isUpdating}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Kolkata">Kolkata (IST)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">New York (EST)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label className="text-xs font-semibold block">Enabled Specialists</Label>
          <div className="grid grid-cols-2 gap-2">
            {['sales', 'inventory', 'purchases', 'finance'].map((agent) => {
              const active = agents.includes(agent);
              return (
                <button
                  key={agent}
                  onClick={() => toggleAgent(agent)}
                  disabled={!isEditable || isUpdating}
                  className={`px-3 py-2 border rounded-lg text-left text-xs font-medium capitalize transition-all flex items-center justify-between ${
                    active
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-card text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  {agent}
                  {active && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {settings?.last_briefing_at && (
          <div className="text-[10px] text-muted-foreground bg-muted/40 border p-2 rounded-lg flex items-center justify-between">
            <span>Last Briefing Generated:</span>
            <span className="font-semibold text-foreground">
              {new Date(settings.last_briefing_at).toLocaleString()}
            </span>
          </div>
        )}

        {isEditable && (
          <Button
            onClick={handleSave}
            disabled={isUpdating}
            className="w-full font-semibold"
            size="sm"
          >
            {isUpdating && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            Save Configuration
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────
// Sub-Component: AgentBriefingsList
// ────────────────────────────────────────────────────────
function AgentBriefingsList({ storeId }: { storeId?: string }) {
  const { data: briefings = [], isLoading, refetch } = useAgentBriefings(storeId);
  const [expandedBriefingId, setExpandedBriefingId] = useState<string | null>(null);

  if (!storeId) {
    return null;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
        <div>
          <CardTitle className="text-base">Daily Briefing Logs</CardTitle>
          <CardDescription>Review compiled diagnostic outputs from department specialists.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh briefs">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Fetching daily briefings...
          </div>
        ) : briefings.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm space-y-2">
            <Info className="w-8 h-8 mx-auto text-muted-foreground/60" />
            <h4 className="font-semibold">No Briefings Available</h4>
            <p className="text-xs">No daily briefing records exist yet for this store.</p>
          </div>
        ) : (
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {briefings.map((brief) => {
              const isExpanded = expandedBriefingId === brief.id;
              return (
                <div key={brief.id} className="p-4 space-y-2 transition-colors hover:bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {new Date(brief.generated_for_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {brief.source}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedBriefingId(isExpanded ? null : brief.id)}
                      className="text-xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {brief.summary}
                  </p>

                  {isExpanded && (
                    <div className="border rounded-lg bg-muted/20 p-3 mt-3 space-y-4 text-xs">
                      {/* Summary Block */}
                      <div>
                        <h4 className="font-bold text-foreground mb-1 text-sm border-b pb-0.5">Briefing Executive Summary</h4>
                        <p className="text-muted-foreground leading-relaxed">{brief.summary}</p>
                      </div>

                      {/* Specialist Outputs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {['sales', 'inventory', 'purchases', 'finance'].map((dept) => {
                          const output = brief.agent_outputs?.[dept];
                          if (!output) return null;
                          return (
                            <div key={dept} className="bg-card p-3 rounded-lg border shadow-sm space-y-1">
                              <h5 className="font-bold capitalize text-primary border-b pb-1 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                {dept} Specialization Output
                              </h5>
                              <p className="text-muted-foreground text-[11px] whitespace-pre-line leading-relaxed pt-1">
                                {output}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────
// Sub-Component: TelegramSettingsCard
// ────────────────────────────────────────────────────────
function TelegramSettingsCard({ storeId, isAdmin }: { storeId?: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const {
    link,
    isLoadingLink,
    messages,
    generateCode,
    isGeneratingCode,
    updatePreferences,
    isSavingPreferences,
    unlinkTelegram,
    isUnlinking,
    refetchLink,
    refetchMessages
  } = useTelegramLink(storeId);

  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [expiryTime, setExpiryTime] = useState<number>(0);

  // Expiry countdown
  useEffect(() => {
    if (expiryTime <= 0) return;
    const t = setInterval(() => {
      setExpiryTime(prev => prev - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [expiryTime]);

  // Link status polling while code is active
  useEffect(() => {
    if (!linkCode || expiryTime <= 0) return;
    const poller = setInterval(async () => {
      const { data } = await refetchLink();
      if (data) {
        setLinkCode(null);
        setExpiryTime(0);
        toast({ title: 'Telegram Linked!', description: 'Your Telegram integration is now active.' });
      }
    }, 5000);
    return () => clearInterval(poller);
  }, [linkCode, expiryTime, refetchLink]);


  if (!storeId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Select a specific store outlet in the top-bar to configure Telegram integration.
        </CardContent>
      </Card>
    );
  }

  if (isLoadingLink) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Loading Telegram details...
        </CardContent>
      </Card>
    );
  }

  const handleLinkClick = async () => {
    try {
      const code = await generateCode();
      setLinkCode(code);
      setExpiryTime(600); // 10 minutes
    } catch (err) {}
  };

  const handleTogglePref = async (key: string, val: boolean) => {
    if (!link) return;
    const newPrefs = {
      ...link.notification_preferences,
      [key]: val,
    };
    try {
      await updatePreferences(newPrefs);
    } catch (err) {}
  };

  const formatThreshold = (val: number) => {
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Link status & Preference toggles */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Telegram Connection Status
            </CardTitle>
            <CardDescription>Link your ERP user account to Telegram to receive real-time notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {link ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <div>
                      <span className="font-semibold text-sm block">Active Connection</span>
                      <span className="text-[10px] text-muted-foreground">
                        Username: {link.telegram_username ? `@${link.telegram_username}` : 'N/A'} (ID: {link.chat_id})
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-rose-500/20"
                    onClick={() => unlinkTelegram()}
                    disabled={isUnlinking}
                  >
                    Unlink Bot
                  </Button>
                </div>

                <hr className="my-2 border-border/50" />

                {/* Preference switches */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Notification Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {[
                      { key: 'low_stock', label: 'Low Stock Alerts', desc: 'Warn when items drop below threshold.' },
                      { key: 'new_orders', label: 'New Sales Orders', desc: 'Notify immediately on sales orders.' },
                      { key: 'daily_summary', label: 'Daily Business Summary', desc: 'Consolidated briefing details.' },
                      { key: 'quote_accepted', label: 'Quotes Conversion', desc: 'Alert when draft quote is converted.' },
                      { key: 'payments_received', label: 'Receipt Transactions', desc: 'Realtime updates on payments.' },
                      { key: 'delivery_reminders', label: 'Delivery Reminders', desc: 'Scheduled delivery date warnings.' },
                    ].map((pref) => (
                      <div key={pref.key} className="flex items-center justify-between p-2.5 border rounded-lg bg-muted/10">
                        <div className="space-y-0.5 max-w-[80%]">
                          <Label className="text-xs font-semibold">{pref.label}</Label>
                          <span className="text-[9px] text-muted-foreground block leading-tight">{pref.desc}</span>
                        </div>
                        <Switch
                          checked={!!(link.notification_preferences as any)[pref.key]}
                          onCheckedChange={(val) => handleTogglePref(pref.key, val)}
                          disabled={isSavingPreferences}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 max-w-sm pt-2">
                    <Label className="text-xs font-semibold">Large Order Alert Threshold</Label>
                    <div className="flex gap-2 items-center">
                      <Select
                        value={String(link.notification_preferences.large_order_threshold || 50000)}
                        onValueChange={(val) => handleTogglePref('large_order_threshold', parseInt(val))}
                        disabled={isSavingPreferences}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select threshold" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10000">₹10,000</SelectItem>
                          <SelectItem value="25000">₹25,000</SelectItem>
                          <SelectItem value="50000">₹50,000</SelectItem>
                          <SelectItem value="100000">₹1,000,000</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-[10px] text-muted-foreground leading-normal">Orders exceeding this limit raise high-priority signals.</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-4">
                <Bot className="w-12 h-12 text-muted-foreground/60 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm text-foreground">Link Telegram Bot</h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Generate an authentication link code and send it to our corporate bot to establish notification hooks.
                  </p>
                </div>

                {linkCode ? (
                  <div className="max-w-md mx-auto p-4 bg-muted/60 border border-primary/20 rounded-xl space-y-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Verification Token</div>
                    <div className="text-3xl font-extrabold tracking-widest text-primary font-mono select-all">
                      {linkCode}
                    </div>
                    <div className="text-[10px] text-amber-500 font-semibold flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 animate-pulse" />
                      Expires in: {Math.floor(expiryTime / 60)}m {expiryTime % 60}s
                    </div>
                    <div className="text-left text-xs text-muted-foreground leading-relaxed p-2 bg-card border rounded-lg mt-2">
                      <span className="font-bold text-foreground block mb-0.5">Instructions:</span>
                      1. Open Telegram and search for <strong className="text-primary font-bold">@furniture_fleet_bot</strong><br />
                      2. Start the conversation (click Start or send <code className="bg-muted px-1 rounded">/start</code>)<br />
                      3. Send the command: <code className="bg-muted px-1 py-0.5 rounded font-mono font-bold text-foreground">/link {linkCode}</code>
                    </div>
                  </div>
                ) : (
                  <Button onClick={handleLinkClick} disabled={isGeneratingCode} className="font-semibold">
                    {isGeneratingCode && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                    Generate Telegram Token
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Telegram messages debug listing */}
      <div className="lg:col-span-1">
        {isAdmin ? (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
              <div>
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  Bot Debug Log
                </CardTitle>
                <CardDescription>Recent incoming Telegram message payloads.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => refetchMessages()} title="Refresh log">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {messages.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs">
                    No inbound bot messages recorded in system.
                  </div>
                ) : (
                  <div className="divide-y">
                    {messages.map((msg) => (
                      <div key={msg.update_id} className="p-3 space-y-1 text-[11px] hover:bg-muted/10 transition-colors">
                        <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                          <span>Chat: {msg.chat_id}</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="font-semibold text-foreground font-mono">
                          Text: "{msg.text || 'N/A'}"
                        </div>
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[9px] text-primary hover:underline font-semibold select-none">View Raw payload</summary>
                          <pre className="p-1.5 bg-muted/60 border rounded font-mono text-[9px] mt-1 overflow-x-auto whitespace-pre-wrap select-all max-h-[120px]">
                            {JSON.stringify(msg.raw_update, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-muted-foreground/50" />
              <span>Debug Log is accessible to Administrators only.</span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Sub-Component: SystemEventsLog
// ────────────────────────────────────────────────────────
function SystemEventsLog({ storeId }: { storeId?: string }) {
  const { data: events = [], isLoading, refetch } = useSystemEvents(storeId);
  const [filter, setFilter] = useState<'all' | 'processed' | 'unprocessed'>('all');

  const filteredEvents = events.filter((ev) => {
    if (filter === 'processed') return ev.processed;
    if (filter === 'unprocessed') return !ev.processed;
    return true;
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            System Events Stream
          </CardTitle>
          <CardDescription>Real-time database webhook operations pipeline.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {/* processed filter */}
          <div className="flex items-center gap-1 bg-muted p-0.5 border rounded-lg">
            {(['all', 'unprocessed', 'processed'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`text-[10px] px-2.5 py-1 rounded font-semibold transition-all capitalize ${
                  filter === opt ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh logs" className="h-8 w-8">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Fetching system events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No matching system events found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Source Table</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Target Entity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-right">Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((ev) => (
                  <TableRow key={ev.id} className="hover:bg-muted/10">
                    <TableCell className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                      {ev.event_type}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono">{ev.source_table || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground font-mono">{ev.source_operation || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground font-mono">
                      {ev.entity_type ? `${ev.entity_type} (${ev.entity_id?.substring(0, 8)})` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {ev.processed ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 font-bold text-[9px] hover:bg-emerald-500/10">
                          Processed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/25 font-bold text-[9px] hover:bg-amber-500/10">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <details>
                        <summary className="cursor-pointer font-bold text-primary hover:underline select-none">Show Data</summary>
                        <pre className="p-1.5 bg-muted/60 border rounded font-mono text-[9px] mt-1 text-left overflow-x-auto whitespace-pre select-all max-w-sm max-h-[100px] absolute right-4 z-10 shadow-lg">
                          {JSON.stringify(ev.payload, null, 2)}
                        </pre>
                      </details>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
