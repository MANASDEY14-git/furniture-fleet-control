import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface TabOption {
  id: string;
  label: string;
  component: React.ComponentType<any>;
}

interface HubPageProps {
  title: string;
  description?: string;
  tabs: TabOption[];
  defaultTab?: string;
  rightActions?: React.ReactNode;
  extraProps?: Record<string, any>;
}

export function HubPage({
  title,
  description,
  tabs,
  defaultTab,
  rightActions,
  extraProps = {},
}: HubPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const currentTab = searchParams.get('tab') || defaultTab || tabs[0]?.id;
  
  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };
  
  const activeTab = tabs.find((t) => t.id === currentTab) || tabs[0];
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {rightActions && (
          <div className="flex flex-wrap items-center gap-2">
            {rightActions}
          </div>
        )}
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="flex overflow-x-auto whitespace-nowrap pb-px -mb-px gap-6 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab?.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "py-3 text-sm font-medium border-b-2 transition-all px-1 focus:outline-none",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="mt-4">
        {activeTab && (
          <React.Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading...</div>}>
            <activeTab.component hideHeader={true} {...extraProps} />
          </React.Suspense>
        )}
      </div>
    </div>
  );
}
