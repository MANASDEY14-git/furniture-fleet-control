import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import { useAccessibleStores, AccessibleStore } from '@/hooks/useAccessibleStores';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoreContextType {
  /** The currently active store ID, or 'all' for the combined view */
  activeStoreId: string;
  /** Full store object for the active store (null when 'all') */
  activeStore: AccessibleStore | null;
  /** All stores the current user can access */
  accessibleStores: AccessibleStore[];
  /** True if the user is allowed to view the "All Stores" combined view */
  canViewAllStores: boolean;
  /** Whether accessible stores are still loading */
  isLoading: boolean;
  /** Switch the active store */
  setActiveStore: (storeId: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function useStoreContext(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStoreContext must be used inside <StoreProvider>');
  return ctx;
}

// ─── Helper: localStorage key ────────────────────────────────────────────────

function storageKey(userId: string) {
  return `active_store_${userId}`;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: roleData } = useCurrentUserRole();
  const { data: accessibleStores = [], isLoading } = useAccessibleStores();

  const canViewAllStores = !!(roleData?.isAdmin || roleData?.isManager);

  const [activeStoreId, setActiveStoreIdState] = useState<string>('all');

  // ── Resolve initial store once stores are loaded ──────────────────────────
  useEffect(() => {
    if (isLoading || !user?.id || accessibleStores.length === 0) return;

    const saved = localStorage.getItem(storageKey(user.id));

    if (saved) {
      // Validate saved value is still accessible
      const isValid =
        (saved === 'all' && canViewAllStores) ||
        accessibleStores.some((s) => s.id === saved);

      if (isValid) {
        setActiveStoreIdState(saved);
        return;
      }
    }

    // Default: admins/managers → 'all', others → first accessible store
    if (canViewAllStores) {
      setActiveStoreIdState('all');
    } else {
      setActiveStoreIdState(accessibleStores[0]?.id ?? 'all');
    }
  }, [isLoading, user?.id, accessibleStores, canViewAllStores]);

  // ── Setter that also persists to localStorage ─────────────────────────────
  const setActiveStore = useCallback(
    (storeId: string) => {
      setActiveStoreIdState(storeId);
      if (user?.id) {
        localStorage.setItem(storageKey(user.id), storeId);
      }
    },
    [user?.id],
  );

  // ── Active store object ───────────────────────────────────────────────────
  const activeStore = useMemo(
    () =>
      activeStoreId === 'all'
        ? null
        : (accessibleStores.find((s) => s.id === activeStoreId) ?? null),
    [activeStoreId, accessibleStores],
  );

  const value: StoreContextType = {
    activeStoreId,
    activeStore,
    accessibleStores,
    canViewAllStores,
    isLoading,
    setActiveStore,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
