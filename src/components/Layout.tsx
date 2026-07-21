import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-[#f6f8fb] to-[#eef2f7]">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 bg-white shadow-sm px-4">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-accent" />
            
            <div className="flex-1" />
            
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
          </header>

          {/* Main content */}
          <main className="flex-1 p-3 sm:p-4 lg:p-8">
            <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 lg:p-8 min-h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
