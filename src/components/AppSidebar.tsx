import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, DollarSign, FileText,
  Settings, Calendar, Users, BookOpen, LogOut, Building2,
  TrendingUp, ChevronDown, ChevronRight, Layers, Activity, Tag, CreditCard
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ─────────────────────────────────────────────
// Retail-optimised navigation (4 groups)
// ─────────────────────────────────────────────
const navigationGroups = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Sales',
    items: [
      { name: 'Sales Orders',    href: '/sales',             icon: ShoppingCart },
      { name: 'Customers',       href: '/customers',         icon: Users        },
      { name: 'Delivery',        href: '/delivery-calendar', icon: Calendar     },
      { name: 'Payments',        href: '/enhanced-payments', icon: CreditCard   },
    ],
  },
  {
    label: 'Purchasing',
    items: [
      { name: 'Purchase Orders', href: '/purchases',         icon: TrendingUp   },
      { name: 'Suppliers',       href: '/suppliers',         icon: Users        },
      { name: 'Supplier Ledger', href: '/supplier-ledger',   icon: BookOpen     },
    ],
  },
  {
    label: 'Finance & Reports',
    items: [
      { name: 'Bank Book', href: '/bank-book', icon: Building2 },
      { name: 'Reports',   href: '/reports',   icon: FileText  },
      { name: 'Settings',  href: '/settings',  icon: Settings  },
    ],
  },
];

// Secondary "Operations" links tucked in a collapsible — power users only
const operationsItems = [
  { name: 'Inventory',            href: '/inventory',             icon: Package   },
  { name: 'Materials',            href: '/materials',             icon: Package   },
  { name: 'Material Purchases',   href: '/material-purchases',    icon: Tag       },
  { name: 'Stock Ledger',         href: '/stock-ledger',          icon: BookOpen  },
  { name: 'Material Stock Ledger',href: '/material-stock-ledger', icon: Activity  },
  { name: 'BOM Management',       href: '/bom-management',        icon: Layers    },
  { name: 'Vendor Payments',      href: '/payments',              icon: DollarSign},
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const [opsOpen, setOpsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  // Is any operations item currently active? If so, keep section visible.
  const opsActive = operationsItems.some(i => location.pathname === i.href);

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/50 p-4">
        {!isCollapsed && (
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-bold text-primary leading-tight">Furniture ERP</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Retail Management</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        {/* Main navigation groups */}
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

        {/* Operations — collapsible group for power users */}
        {!isCollapsed && (
          <SidebarGroup>
            <Collapsible open={opsOpen || opsActive} onOpenChange={setOpsOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className="flex w-full items-center justify-between px-2 py-1 text-muted-foreground/60 text-xs uppercase tracking-wider hover:text-muted-foreground transition-colors"
                >
                  <span>Operations</span>
                  {(opsOpen || opsActive) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {operationsItems.map(item => {
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
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Show ops items flat when sidebar is icon-only (collapsed) */}
        {isCollapsed && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {operationsItems.map(item => {
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
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        {!isCollapsed && user?.email && (
          <p className="text-xs text-muted-foreground truncate mb-2">{user.email}</p>
        )}
        <Button
          variant="ghost"
          size={isCollapsed ? 'icon' : 'sm'}
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
