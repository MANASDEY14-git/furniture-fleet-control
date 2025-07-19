import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, DollarSign, FileText, Settings, Menu, X, Calendar, CreditCard, Users, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
const navigation = [{
  name: 'Dashboard',
  href: '/',
  icon: LayoutDashboard
}, {
  name: 'Sales',
  href: '/sales',
  icon: ShoppingCart
}, {
  name: 'Delivery Calendar',
  href: '/delivery-calendar',
  icon: Calendar
}, {
  name: 'Enhanced Payments',
  href: '/enhanced-payments',
  icon: CreditCard
}, {
  name: 'Inventory',
  href: '/inventory',
  icon: Package
}, {
  name: 'Materials',
  href: '/materials',
  icon: Package
}, {
  name: 'Purchases',
  href: '/purchases',
  icon: ShoppingCart
}, {
  name: 'Payments',
  href: '/payments',
  icon: DollarSign
}, {
  name: 'Suppliers',
  href: '/suppliers',
  icon: Users
}, {
  name: 'Supplier Ledger',
  href: '/supplier-ledger',
  icon: BookOpen
}, {
  name: 'Stock Ledger',
  href: '/stock-ledger',
  icon: BookOpen
}, {
  name: 'Reports',
  href: '/reports',
  icon: FileText
}, {
  name: 'Settings',
  href: '/settings',
  icon: Settings
}];
export default function Layout({
  children
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-slate-800 border-r border-blue-500/30">
          <div className="flex h-16 shrink-0 items-center justify-between px-6">
            <span className="text-xl font-bold glow-text">Furniture ERP</span>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="text-blue-200 hover:text-blue-100">
              <X className="h-6 w-6" />
            </Button>
          </div>
          <nav className="flex flex-1 flex-col px-6 pb-4">
            <ul className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul className="-mx-2 space-y-1">
                  {navigation.map(item => {
                  const isActive = location.pathname === item.href;
                  return <li key={item.name}>
                        <Link to={item.href} onClick={() => setSidebarOpen(false)} className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200 ${isActive ? 'bg-blue-600/30 text-cyan-300 shadow-lg shadow-blue-500/20' : 'text-blue-200 hover:text-cyan-300 hover:bg-blue-800/30'}`}>
                          <item.icon className="h-6 w-6 shrink-0" />
                          {item.name}
                        </Link>
                      </li>;
                })}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-800/90 backdrop-blur-xl border-r border-blue-500/30 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <span className="text-xl font-bold glow-text text-slate-950">Furniture ERP</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul className="-mx-2 space-y-1">
                  {navigation.map(item => {
                  const isActive = location.pathname === item.href;
                  return <li key={item.name}>
                        <Link to={item.href} className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200 ${isActive ? 'bg-blue-600/30 text-cyan-300 shadow-lg shadow-blue-500/20 glow-text' : 'text-blue-200 hover:text-cyan-300 hover:bg-blue-800/30'}`}>
                          <item.icon className="h-6 w-6 shrink-0" />
                          {item.name}
                        </Link>
                      </li>;
                })}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-blue-500/30 bg-slate-800/90 backdrop-blur-xl px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="text-blue-200 hover:text-blue-100 lg:hidden">
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-blue-500/30" />
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>;
}