import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, DollarSign, FileText,
  Settings, Calendar, Users, BookOpen, LogOut, Building2,
  TrendingUp, ChevronDown, ChevronRight, Layers, Activity, Tag,
  CreditCard, Store, Check
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreContext } from '@/contexts/StoreContext';
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
      { name: 'Payments',        href: '/payments',          icon: CreditCard   },
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
  { name: 'Inventory',             href: '/inventory',             icon: Package    },
  { name: 'Materials',             href: '/materials',             icon: Package    },
  { name: 'Material Purchases',    href: '/material-purchases',    icon: Tag        },
  { name: 'Stock Ledger',          href: '/stock-ledger',          icon: BookOpen   },
  { name: 'Material Stock Ledger', href: '/material-stock-ledger', icon: Activity   },
  { name: 'BOM Management',        href: '/bom-management',        icon: Layers     },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const [opsOpen, setOpsOpen] = useState(false);

  // Store context
  const {
    activeStoreId,
    activeStore,
    accessibleStores,
    canViewAllStores,
    setActiveStore,
  } = useStoreContext();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  // Is any operations item currently active?
  const opsActive = operationsItems.some(i => location.pathname === i.href);

  // Label shown on the store-switcher button
  const activeStoreLabel =
    activeStoreId === 'all' ? 'All Stores' : (activeStore?.name ?? 'Select Store');

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/50 p-3 space-y-2">
        {/* Brand */}
        {!isCollapsed && (
          <div className="flex flex-col gap-0.5 px-1">
            <span className="text-lg font-bold text-primary leading-tight">Furniture ERP</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Retail Management</span>
          </div>
        )}

        {/* ── Store Switcher ─────────────────────────────────── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`
                w-full justify-between gap-1 border-border/60 bg-accent/40
                hover:bg-accent hover:border-border text-xs font-medium
                transition-all duration-150
                ${isCollapsed ? 'px-2 justify-center' : 'px-3'}
              `}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Store className="h-3.5 w-3.5 shrink-0 text-primary" />
                {!isCollapsed && (
                  <span className="truncate">{activeStoreLabel}</span>
                )}
              </div>
              {!isCollapsed && <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            sideOffset={6}
            className="w-52 border-border/60 bg-popover shadow-lg"
          >
            <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider pb-1">
              Switch Store
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* "All Stores" — only for admin / manager */}
            {canViewAllStores && (
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => setActiveStore('all')}
              >
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">All Stores</span>
                {activeStoreId === 'all' && (
                  <Check className="h-3.5 w-3.5 text-primary" />
                )}
              </DropdownMenuItem>
            )}

            {/* Individual stores */}
            {accessibleStores.map(store => (
              <DropdownMenuItem
                key={store.id}
                className="gap-2 cursor-pointer"
                onClick={() => setActiveStore(store.id)}
              >
                <Store className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm">{store.name}</div>
                  {store.location && (
                    <div className="truncate text-[10px] text-muted-foreground">{store.location}</div>
                  )}
                </div>
                {activeStoreId === store.id && (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        {/* Render Overview Group first */}
        {navigationGroups.slice(0, 1).map(group => (
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

        {/* Operations — right under Overview / Dashboard */}
        {!isCollapsed && (
          <SidebarGroup>
            <Collapsible open={opsOpen || opsActive} onOpenChange={setOpsOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between px-2 py-1 text-muted-foreground/60 text-xs uppercase tracking-wider hover:text-muted-foreground transition-colors">
                  <span>Operations</span>
                  {(opsOpen || opsActive)
                    ? <ChevronDown className="h-3 w-3" />
                    : <ChevronRight className="h-3 w-3" />}
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

        {/* Render Remaining Navigation Groups (Sales, Purchasing, Finance & Reports) */}
        {navigationGroups.slice(1).map(group => (
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

        {/* Collapsed: show ops items flat with tooltips */}
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
