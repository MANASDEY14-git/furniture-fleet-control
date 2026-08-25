import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { StoreProvider } from '@/contexts/StoreContext';
import { FinancialYearProvider } from '@/contexts/FinancialYearContext';
import Auth from '@/pages/Auth';
import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import Onboarding from '@/pages/Onboarding';
import PendingApproval from '@/pages/PendingApproval';
import SalesIntelligence from '@/pages/SalesIntelligence';
import EnhancedPayments from '@/pages/EnhancedPayments';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import Customers from '@/pages/Customers';
import CustomerProfile from '@/pages/CustomerProfile';
import NotFound from '@/pages/NotFound';
import CommandCenter from '@/pages/CommandCenter';
import { AssistantBubble } from '@/components/ai-assistant/AssistantBubble';
import MaterialsHub from '@/pages/hubs/MaterialsHub';
import InventoryHub from '@/pages/hubs/InventoryHub';
import PurchasingHub from '@/pages/hubs/PurchasingHub';
import WorkHub from '@/pages/hubs/WorkHub';
import SalesHub from '@/pages/hubs/SalesHub';
import FinanceHub from '@/pages/hubs/FinanceHub';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute - ERP needs fresh data
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/pending-approval" element={
              <ProtectedRoute requireStoreAccess={false}>
                <PendingApproval />
              </ProtectedRoute>
            } />
            <Route path="/onboarding" element={
              <ProtectedRoute requireStoreAccess={false}>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/*" element={
              <ProtectedRoute>
                <StoreProvider>
                  <FinancialYearProvider>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      
                      {/* Hubs */}
                      <Route path="/sales" element={<SalesHub />} />
                      <Route path="/work" element={<WorkHub />} />
                      <Route path="/inventory" element={<InventoryHub />} />
                      <Route path="/purchasing" element={<PurchasingHub />} />
                      <Route path="/materials" element={<MaterialsHub />} />
                      <Route path="/finance" element={<FinanceHub />} />

                      {/* Standalone pages */}
                      <Route path="/sales-intelligence" element={<SalesIntelligence />} />
                      <Route path="/enhanced-payments" element={<EnhancedPayments />} />
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/customers/:id" element={<CustomerProfile />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/command-center" element={<CommandCenter />} />

                      {/* Old Redirects */}
                      <Route path="/material-purchases" element={<Navigate to="/materials?tab=purchases" replace />} />
                      <Route path="/material-stock-ledger" element={<Navigate to="/materials?tab=ledger" replace />} />
                      <Route path="/bom-management" element={<Navigate to="/materials?tab=bom" replace />} />
                      <Route path="/inventory-intelligence" element={<Navigate to="/inventory?tab=intelligence" replace />} />
                      <Route path="/stock-ledger" element={<Navigate to="/inventory?tab=ledger" replace />} />
                      <Route path="/purchases" element={<Navigate to="/purchasing?tab=purchases" replace />} />
                      <Route path="/reorder" element={<Navigate to="/purchasing?tab=reorder" replace />} />
                      <Route path="/suppliers" element={<Navigate to="/purchasing?tab=suppliers" replace />} />
                      <Route path="/supplier-ledger" element={<Navigate to="/purchasing?tab=ledger" replace />} />
                      <Route path="/daily-worklist" element={<Navigate to="/work?tab=followups" replace />} />
                      <Route path="/collections" element={<Navigate to="/work?tab=collections" replace />} />
                      <Route path="/dispatch-board" element={<Navigate to="/work?tab=dispatch" replace />} />
                      <Route path="/delivery-calendar" element={<Navigate to="/work?tab=delivery" replace />} />
                      <Route path="/payments" element={<Navigate to="/finance?tab=payments" replace />} />
                      <Route path="/bank-book" element={<Navigate to="/finance?tab=bank-book" replace />} />
                      <Route path="/help" element={<Navigate to="/settings?tab=help" replace />} />

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                  </FinancialYearProvider>
                </StoreProvider>
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster />
          <AssistantBubble />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
