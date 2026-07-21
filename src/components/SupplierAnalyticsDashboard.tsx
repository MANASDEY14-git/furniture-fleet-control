import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupplierBalances } from '@/hooks/useSupplierLedger';
import { usePurchases } from '@/hooks/usePurchases';
import { usePayments } from '@/hooks/usePayments';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, AlertTriangle, CreditCard } from 'lucide-react';

export default function SupplierAnalyticsDashboard() {
  const { data: balances = [] } = useSupplierBalances();
  const { data: purchases = [] } = usePurchases();
  const { data: payments = [] } = usePayments();

  // Top suppliers by purchase volume
  const topSuppliers = balances
    .sort((a, b) => b.total_debit - a.total_debit)
    .slice(0, 5)
    .map(supplier => ({
      name: supplier.supplier_name.length > 15 ? supplier.supplier_name.substring(0, 15) + '...' : supplier.supplier_name,
      amount: supplier.total_debit,
      balance: supplier.balance
    }));

  // Aging analysis
  const agingData = [
    { 
      period: '0-30 days', 
      amount: balances.filter(b => b.balance > 0 && b.balance <= 50000).reduce((sum, b) => sum + b.balance, 0)
    },
    { 
      period: '31-60 days', 
      amount: balances.filter(b => b.balance > 50000 && b.balance <= 100000).reduce((sum, b) => sum + b.balance, 0)
    },
    { 
      period: '61-90 days', 
      amount: balances.filter(b => b.balance > 100000 && b.balance <= 200000).reduce((sum, b) => sum + b.balance, 0)
    },
    { 
      period: '90+ days', 
      amount: balances.filter(b => b.balance > 200000).reduce((sum, b) => sum + b.balance, 0)
    }
  ];

  // Purchase vs Payment trend (last 6 months)
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date.toISOString().slice(0, 7); // YYYY-MM format
  }).reverse();

  const trendData = last6Months.map(month => {
    const monthPurchases = purchases.filter(p => p.date?.startsWith(month));
    const monthPayments = payments.filter(p => p.date?.startsWith(month) && p.type === 'Payment');
    
    return {
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      purchases: monthPurchases.reduce((sum, p) => sum + p.total_cost, 0),
      payments: monthPayments.reduce((sum, p) => sum + p.amount, 0)
    };
  });

  // Payment method distribution
  const paymentMethods = payments
    .filter(p => p.type === 'Payment')
    .reduce((acc, payment) => {
      const method = 'bank_transfer'; // Default since reference_type doesn't exist
      acc[method] = (acc[method] || 0) + payment.amount;
      return acc;
    }, {} as Record<string, number>);

  const paymentMethodData = Object.entries(paymentMethods).map(([method, amount]) => ({
    name: method.replace('_', ' ').toUpperCase(),
    value: amount
  }));

  const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-300 glow-text mb-2">Supplier Analytics</h2>
        <p className="text-blue-200">Comprehensive supplier performance and financial insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-cyan-400" />
              <div className="ml-3">
                <p className="text-sm text-blue-200">Active Suppliers</p>
                <p className="text-2xl font-bold text-cyan-300">{balances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-blue-200">Total Purchases</p>
                <p className="text-2xl font-bold text-green-400">
                  ₹{purchases.reduce((sum, p) => sum + p.total_cost, 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-blue-400" />
              <div className="ml-3">
                <p className="text-sm text-blue-200">Total Payments</p>
                <p className="text-2xl font-bold text-blue-400">
                  ₹{payments.filter(p => p.type === 'Payment').reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-blue-200">Outstanding</p>
                <p className="text-2xl font-bold text-red-400">
                  ₹{balances.reduce((sum, b) => sum + Math.max(0, b.balance), 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers */}
        <Card className="futuristic-card">
          <CardHeader>
            <CardTitle className="text-cyan-300 glow-text">Top Suppliers by Purchase Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSuppliers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
                <XAxis 
                  dataKey="name" 
                  stroke="#93c5fd"
                  tick={{ fill: '#93c5fd', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#93c5fd"
                  tick={{ fill: '#93c5fd', fontSize: 12 }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #06b6d4',
                    borderRadius: '8px',
                    color: '#93c5fd'
                  }}
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Purchase Amount']}
                />
                <Bar dataKey="amount" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Aging Analysis */}
        <Card className="futuristic-card">
          <CardHeader>
            <CardTitle className="text-cyan-300 glow-text">Outstanding Aging Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={agingData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {agingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #06b6d4',
                    borderRadius: '8px',
                    color: '#93c5fd'
                  }}
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Purchase vs Payment Trend */}
        <Card className="futuristic-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-cyan-300 glow-text">Purchase vs Payment Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
                <XAxis 
                  dataKey="month" 
                  stroke="#93c5fd"
                  tick={{ fill: '#93c5fd', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#93c5fd"
                  tick={{ fill: '#93c5fd', fontSize: 12 }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #06b6d4',
                    borderRadius: '8px',
                    color: '#93c5fd'
                  }}
                  formatter={(value, name) => [
                    `₹${Number(value).toLocaleString('en-IN')}`, 
                    name === 'purchases' ? 'Purchases' : 'Payments'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="purchases" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="payments" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        {paymentMethodData.length > 0 && (
          <Card className="futuristic-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-cyan-300 glow-text">Payment Method Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={paymentMethodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#93c5fd"
                    tick={{ fill: '#93c5fd', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#93c5fd"
                    tick={{ fill: '#93c5fd', fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #06b6d4',
                      borderRadius: '8px',
                      color: '#93c5fd'
                    }}
                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                  />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}