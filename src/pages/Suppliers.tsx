import { useState, useEffect, useMemo, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSupplierBalances } from '@/hooks/useSupplierLedger';
import { useStores } from '@/hooks/useStores';
import { useSupplierOpeningBalances } from '@/hooks/useSupplierOpeningBalances';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { SupplierHeader } from '@/components/suppliers/SupplierHeader';
import { SupplierList } from '@/components/suppliers/SupplierList';
import { SupplierFilters, type FilterState } from '@/components/suppliers/SupplierFilters';
import { SupplierStatsBar } from '@/components/suppliers/SupplierStatsBar';
import { SupplierDetailPanel } from '@/components/suppliers/SupplierDetailPanel';
import SupplierForm from '@/components/SupplierForm';
import MobileFloatingActionButton from '@/components/mobile/MobileFloatingActionButton';

const STORAGE_KEY = 'erp-selected-supplier';

export default function Suppliers() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const [filters, setFilters] = useState<FilterState>({ search: '', status: 'all', store: 'all', sort: 'name' });
  const { data: balances = [] } = useSupplierBalances(filters.store !== 'all' ? filters.store : undefined);
  const { data: openingBalances = [] } = useSupplierOpeningBalances(filters.store !== 'all' ? filters.store : undefined);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [ledgerExpanded, setLedgerExpanded] = useState(false);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Restore last selected supplier from localStorage (desktop only)
  useEffect(() => {
    if (!isMobile && !selectedSupplierId) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && suppliers.some(s => s.id === stored)) {
        setSelectedSupplierId(stored);
      }
    }
  }, [isMobile, suppliers, selectedSupplierId]);

  // Auto-select first supplier on desktop if none selected
  useEffect(() => {
    if (!isMobile && !selectedSupplierId && suppliers.length > 0 && !isLoading) {
      const stored = localStorage.getItem(STORAGE_KEY);
      const validStored = stored && suppliers.some(s => s.id === stored);
      setSelectedSupplierId(validStored ? stored : suppliers[0].id);
    }
  }, [isMobile, suppliers, selectedSupplierId, isLoading]);

  // Persist selection to localStorage
  useEffect(() => {
    if (selectedSupplierId) {
      localStorage.setItem(STORAGE_KEY, selectedSupplierId);
    }
  }, [selectedSupplierId]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('suppliers-listen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => {
        queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_ledger' }, () => {
        queryClient.invalidateQueries({ queryKey: ['supplier-balances'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_opening_balances' }, () => {
        queryClient.invalidateQueries({ queryKey: ['supplier-opening-balances'] });
        queryClient.invalidateQueries({ queryKey: ['supplier-balances'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Get aggregated balance data for a supplier
  const getSupplierBalanceData = useCallback((supplierId: string) => {
    const supplierBalances = balances.filter((b) => b.supplier_id === supplierId);

    if (supplierBalances.length === 0) {
      const openingBal = openingBalances.find((ob) => ob.supplier_id === supplierId);
      if (openingBal) {
        const openingValue = openingBal.balance_type === 'debit' 
          ? openingBal.opening_balance 
          : -openingBal.opening_balance;
        return {
          opening: openingBal.opening_balance,
          openingType: openingBal.balance_type,
          debit: 0,
          credit: 0,
          balance: openingValue,
        };
      }
      return { opening: 0, openingType: 'debit', debit: 0, credit: 0, balance: 0 };
    }

    const totals = supplierBalances.reduce(
      (acc, b) => ({
        opening: acc.opening + b.opening_balance,
        debit: acc.debit + b.total_debit,
        credit: acc.credit + b.total_credit,
        balance: acc.balance + b.balance,
      }),
      { opening: 0, debit: 0, credit: 0, balance: 0 }
    );

    return { ...totals, openingType: supplierBalances[0].opening_balance_type || 'debit' };
  }, [balances, openingBalances]);

  const getBalanceStatus = (balance: number) => {
    if (balance > 10000) return 'High Due';
    if (balance > 0) return 'Due';
    if (balance < -1000) return 'Advance';
    return 'Settled';
  };

  // Filter and sort suppliers
  const filteredSuppliers = useMemo(() => {
    let filtered = suppliers.filter((supplier) => {
      const matchesSearch =
        supplier.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        supplier.contact_person?.toLowerCase().includes(filters.search.toLowerCase()) ||
        supplier.phone?.toLowerCase().includes(filters.search.toLowerCase());

      if (filters.status === 'all') return matchesSearch;

      const balanceData = getSupplierBalanceData(supplier.id);
      const status = getBalanceStatus(balanceData.balance);

      if (filters.status === 'high-due') return matchesSearch && status === 'High Due';
      if (filters.status === 'due') return matchesSearch && (status === 'Due' || status === 'High Due');
      if (filters.status === 'advance') return matchesSearch && status === 'Advance';
      if (filters.status === 'settled') return matchesSearch && status === 'Settled';

      return matchesSearch;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'balance-high':
          return getSupplierBalanceData(b.id).balance - getSupplierBalanceData(a.id).balance;
        case 'balance-low':
          return getSupplierBalanceData(a.id).balance - getSupplierBalanceData(b.id).balance;
        default:
          return 0;
      }
    });

    return filtered;
  }, [suppliers, filters, getSupplierBalanceData]);

  // Calculate summary stats
  const summaryData = useMemo(() => {
    return suppliers.reduce(
      (acc, supplier) => {
        const balanceData = getSupplierBalanceData(supplier.id);
        return {
          totalSuppliers: acc.totalSuppliers + 1,
          totalOutstanding: acc.totalOutstanding + Math.max(0, balanceData.balance),
          totalAdvances: acc.totalAdvances + Math.max(0, -balanceData.balance),
          suppliersWithDues: acc.suppliersWithDues + (balanceData.balance > 0 ? 1 : 0),
        };
      },
      { totalSuppliers: 0, totalOutstanding: 0, totalAdvances: 0, suppliersWithDues: 0 }
    );
  }, [suppliers, getSupplierBalanceData]);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4">
        {/* Sticky header block - merged Header + Stats + Search */}
        <div className="sticky top-0 z-20 bg-background border-b px-3 pb-2">
          <SupplierHeader isMobile />
          <SupplierStatsBar data={summaryData} isMobile />
          <SupplierFilters
            filters={filters}
            onChange={setFilters}
            stores={stores}
            storesLoading={storesLoading}
            isMobile
          />
        </div>

        {/* Single scroll container - supplier list */}
        <div className="flex-1 overflow-y-auto px-2 pt-2 pb-24">
          <SupplierList
            suppliers={filteredSuppliers}
            selectedId={selectedSupplierId}
            onSelect={setSelectedSupplierId}
            getBalanceData={getSupplierBalanceData}
            isLoading={isLoading}
            isMobile
          />
        </div>

        {/* Detail Bottom Sheet */}
        <Drawer open={!!selectedSupplierId} onOpenChange={(open) => !open && setSelectedSupplierId(null)}>
          <DrawerContent className="max-h-[85vh] h-[85vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-base">{selectedSupplier?.name || 'Supplier'}</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-auto px-4 pb-6">
              {selectedSupplierId && (
                <SupplierDetailPanel
                  supplierId={selectedSupplierId}
                  storeId={filters.store !== 'all' ? filters.store : undefined}
                  onClose={() => setSelectedSupplierId(null)}
                  isMobile
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>

        {/* FAB for adding supplier */}
        <MobileFloatingActionButton onClick={() => setAddDialogOpen(true)} />

        {/* Add Supplier Sheet */}
        <Drawer open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle>Add Supplier</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-auto">
              <SupplierForm
                onSuccess={() => setAddDialogOpen(false)}
                onClose={() => setAddDialogOpen(false)}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))]">
      <SupplierHeader isMobile={false} />
      <SupplierStatsBar data={summaryData} isMobile={false} />
      <SupplierFilters
        filters={filters}
        onChange={setFilters}
        stores={stores}
        storesLoading={storesLoading}
        isMobile={false}
      />

      {/* Master/Detail Layout */}
      <div className="flex-1 flex gap-3 overflow-hidden min-h-0">
        {/* Supplier List - narrower width, dims when ledger is focus */}
        {!ledgerExpanded && (
          <div 
            className={cn(
              'w-[260px] lg:w-[280px] shrink-0 transition-opacity duration-200',
              selectedSupplierId ? 'opacity-85' : 'opacity-100'
            )}
          >
            <SupplierList
              suppliers={filteredSuppliers}
              selectedId={selectedSupplierId}
              onSelect={setSelectedSupplierId}
              getBalanceData={getSupplierBalanceData}
              isLoading={isLoading}
              isMobile={false}
            />
          </div>
        )}

        {/* Detail Panel - expands to fill space */}
        <div className={cn(
          'flex-1 border rounded-lg overflow-hidden flex flex-col',
          ledgerExpanded && 'w-full'
        )}>
          {selectedSupplierId ? (
            <SupplierDetailPanel
              supplierId={selectedSupplierId}
              storeId={filters.store !== 'all' ? filters.store : undefined}
              onClose={() => setSelectedSupplierId(null)}
              isMobile={false}
              isExpanded={ledgerExpanded}
              onToggleExpand={() => setLedgerExpanded(!ledgerExpanded)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="text-muted-foreground">
                <p className="text-lg font-medium">Select a supplier</p>
                <p className="text-sm mt-1">Choose a supplier from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
