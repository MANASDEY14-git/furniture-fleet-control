
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Auth from '@/pages/Auth';
import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import Onboarding from '@/pages/Onboarding';
import Sales from '@/pages/Sales';
import DeliveryCalendar from '@/pages/DeliveryCalendar';
import EnhancedPayments from '@/pages/EnhancedPayments';
import Inventory from '@/pages/Inventory';
import Purchases from '@/pages/Purchases';
import Payments from '@/pages/Payments';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import Suppliers from '@/pages/Suppliers';
import SupplierLedger from '@/pages/SupplierLedger';
import Materials from '@/pages/Materials';
import MaterialPurchases from '@/pages/MaterialPurchases';
import StockLedger from '@/pages/StockLedger';
import NotFound from '@/pages/NotFound';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
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
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/delivery-calendar" element={<DeliveryCalendar />} />
                    <Route path="/enhanced-payments" element={<EnhancedPayments />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/purchases" element={<Purchases />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/suppliers" element={<Suppliers />} />
                    <Route path="/supplier-ledger" element={<SupplierLedger />} />
                    <Route path="/materials" element={<Materials />} />
                    <Route path="/material-purchases" element={<MaterialPurchases />} />
                    <Route path="/stock-ledger" element={<StockLedger />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
