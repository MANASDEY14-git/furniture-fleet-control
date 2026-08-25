import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { YearSwitcher } from '@/components/YearSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { ReadOnlyYearBanner } from '@/components/ReadOnlyYearBanner';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-[#f6f8fb] to-[#eef2f7] dark:from-slate-950 dark:to-slate-900">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-2 bg-background shadow-sm px-4">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-accent" />
            
            <div className="flex-1" />

            <YearSwitcher />

            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-9 w-9 rounded-lg"
              asChild
            >
              <Link to="/settings?tab=help" title="Help Guide">
                <HelpCircle className="h-5 w-5" />
              </Link>
            </Button>

            <ThemeToggle />

            <span className="text-sm text-muted-foreground hidden sm:block ml-2">
              {user?.email}
            </span>
          </header>

          {/* Main content */}
          <main className="flex-1 p-3 sm:p-4 lg:p-8">
            <div className="bg-card text-card-foreground rounded-2xl shadow-md p-4 sm:p-6 lg:p-8 min-h-full">
              <ReadOnlyYearBanner />
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
