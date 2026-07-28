import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FinancialYear {
  id: string;
  label: string;
  start_date: string; // ISO date
  end_date: string; // ISO date
  is_active: boolean;
  is_closed: boolean;
  closed_at: string | null;
}

interface FinancialYearContextValue {
  years: FinancialYear[];
  activeYear: FinancialYear | null;
  selectedYear: FinancialYear | null;
  setSelectedYearId: (id: string) => void;
  isViewingPast: boolean;
  isLoading: boolean;
}

const FinancialYearContext = createContext<FinancialYearContextValue | undefined>(undefined);

const STORAGE_KEY = 'erp.selectedFinancialYearId';

export function FinancialYearProvider({ children }: { children: ReactNode }) {
  const { data: years = [], isLoading } = useQuery({
    queryKey: ['financial-years'],
    queryFn: async (): Promise<FinancialYear[]> => {
      const { data, error } = await supabase
        .from('financial_years')
        .select('id,label,start_date,end_date,is_active,is_closed,closed_at')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as FinancialYear[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const activeYear = useMemo(
    () => years.find((y) => y.is_active && !y.is_closed) || years[0] || null,
    [years]
  );

  const [selectedYearId, setSelectedYearIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  // Default selection to active year once loaded
  useEffect(() => {
    if (!selectedYearId && activeYear) {
      setSelectedYearIdState(activeYear.id);
    }
  }, [selectedYearId, activeYear]);

  // If stored ID is no longer valid, fall back to active
  useEffect(() => {
    if (
      selectedYearId &&
      years.length > 0 &&
      !years.some((y) => y.id === selectedYearId) &&
      activeYear
    ) {
      setSelectedYearIdState(activeYear.id);
    }
  }, [selectedYearId, years, activeYear]);

  const setSelectedYearId = (id: string) => {
    setSelectedYearIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  };

  const selectedYear = useMemo(
    () => years.find((y) => y.id === selectedYearId) || activeYear,
    [years, selectedYearId, activeYear]
  );

  const isViewingPast = !!selectedYear && !!activeYear && selectedYear.id !== activeYear.id;

  const value: FinancialYearContextValue = {
    years,
    activeYear,
    selectedYear,
    setSelectedYearId,
    isViewingPast,
    isLoading,
  };

  return <FinancialYearContext.Provider value={value}>{children}</FinancialYearContext.Provider>;
}

export function useFinancialYear() {
  const ctx = useContext(FinancialYearContext);
  if (!ctx) throw new Error('useFinancialYear must be used within FinancialYearProvider');
  return ctx;
}

/** Guard for mutation-heavy screens. Returns { readOnly } — true when the user is viewing a past/closed year. */
export function useYearGuard() {
  const { isViewingPast, selectedYear } = useFinancialYear();
  return {
    readOnly: isViewingPast || !!selectedYear?.is_closed,
    selectedYear,
  };
}

/** Convenience: date bounds of the currently selected year, or null. */
export function useSelectedYearRange() {
  const { selectedYear } = useFinancialYear();
  if (!selectedYear) return null;
  return { start: selectedYear.start_date, end: selectedYear.end_date, id: selectedYear.id };
}
