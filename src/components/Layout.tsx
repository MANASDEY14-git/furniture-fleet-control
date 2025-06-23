
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Package, 
  ShoppingCart, 
  CreditCard, 
  DollarSign, 
  BarChart3, 
  Menu, 
  X,
  Settings 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Define the type for navigation items
interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface LayoutProps {
  children: React.ReactNode;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Sales', href: '/sales', icon: ShoppingCart },
  { name: 'Purchases', href: '/purchases', icon: CreditCard },
  { name: 'Payments', href: '/payments', icon: DollarSign },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex">
      {/* Sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow futuristic-card m-4 mr-0 rounded-r-none border-r-0">
          <div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-blue-500/30">
            <h1 className="text-xl font-bold glow-text">⚡ FutureAdmin</h1>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300',
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 text-cyan-300 border border-blue-400/50 shadow-lg'
                      : 'text-blue-100 hover:bg-blue-800/30 hover:text-cyan-300 hover:shadow-md'
                  )}
                >
                  <item.icon className={cn("w-5 h-5 mr-3", isActive && "text-cyan-300")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-64 max-w-xs futuristic-card m-4 rounded-r-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-blue-500/30">
              <h1 className="text-xl font-bold glow-text">⚡ FutureAdmin</h1>
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="text-blue-300 hover:text-cyan-300">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 text-cyan-300 border border-blue-400/50'
                        : 'text-blue-100 hover:bg-blue-800/30 hover:text-cyan-300'
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 lg:ml-64">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-3 futuristic-card m-4 mb-0 lg:hidden">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="text-blue-300">
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold glow-text">⚡ FutureAdmin</h1>
          <div className="w-10" />
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
