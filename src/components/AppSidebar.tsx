import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, DollarSign, FileText, Settings, Calendar, CreditCard, Users, BookOpen, LogOut, Layers, Activity, Tag, Building2 } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const navigationGroups = [{
  label: 'Overview',
  items: [{
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard
  }]
}, {
  label: 'Sales & Orders',
  items: [{
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
  }]
}, {
  label: 'Inventory & Stock',
  items: [{
    name: 'Inventory',
    href: '/inventory',
    icon: Package
  }, {
    name: 'Materials',
    href: '/materials',
    icon: Package
  }, {
    name: 'Material Stock Ledger',
    href: '/material-stock-ledger',
    icon: Activity
  }, {
    name: 'BOM Management',
    href: '/bom-management',
    icon: Layers
  }, {
    name: 'Stock Ledger',
    href: '/stock-ledger',
    icon: BookOpen
  }]
}, {
  label: 'Purchases & Suppliers',
  items: [{
    name: 'Purchases',
    href: '/purchases',
    icon: ShoppingCart
  }, {
    name: 'Material Purchases',
    href: '/material-purchases',
    icon: Tag
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
  }]
}, {
  label: 'Finance',
  items: [{
    name: 'Bank Book',
    href: '/bank-book',
    icon: Building2
  }]
}, {
  label: 'System',
  items: [{
    name: 'Reports',
    href: '/reports',
    icon: FileText
  }, {
    name: 'Settings',
    href: '/settings',
    icon: Settings
  }]
}];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleSignOut = async () => {
    await signOut();
  };

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/50 p-4">
        {!isCollapsed && <span className="text-lg font-bold text-primary">Furniture ERP</span>}
      </SidebarHeader>
      
      <SidebarContent className="bg-sidebar">
        {navigationGroups.map(group => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-muted-foreground/60 text-xs uppercase tracking-wider">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => {
                  const isActive = location.pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive} 
                        tooltip={item.name} 
                        className={`
                          transition-all duration-150
                          ${isActive 
                            ? 'bg-primary/10 text-primary font-medium' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'}
                        `}
                      >
                        <Link to={item.href} onClick={handleNavClick}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        {!isCollapsed && user?.email && <p className="text-xs text-muted-foreground truncate mb-2">{user.email}</p>}
        <Button 
          variant="ghost" 
          size={isCollapsed ? "icon" : "sm"} 
          onClick={handleSignOut} 
          className="w-full text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
