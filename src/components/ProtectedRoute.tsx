import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireStoreAccess?: boolean;
}

export function ProtectedRoute({ children, requireStoreAccess = true }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: roleData, isLoading: roleLoading } = useCurrentUserRole();

  // Still loading auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSkeleton type="cards" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Still loading role data
  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSkeleton type="cards" />
      </div>
    );
  }

  // Check if user needs store access but doesn't have it
  if (requireStoreAccess && roleData && !roleData.hasStoreAccess) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
}
