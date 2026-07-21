import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type DeliveryTab = 'today' | 'upcoming' | 'overdue' | 'delivered';

interface DeliveryTabsProps {
  activeTab: DeliveryTab;
  onTabChange: (tab: DeliveryTab) => void;
  counts: {
    today: number;
    upcoming: number;
    overdue: number;
    delivered: number;
  };
}

export default function DeliveryTabs({ activeTab, onTabChange, counts }: DeliveryTabsProps) {
  const tabs: { value: DeliveryTab; label: string; color: string }[] = [
    { value: 'today', label: 'Today', color: 'bg-yellow-500' },
    { value: 'upcoming', label: 'Upcoming', color: 'bg-green-500' },
    { value: 'overdue', label: 'Overdue', color: 'bg-red-500' },
    { value: 'delivered', label: 'Delivered', color: 'bg-blue-500' },
  ];

  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as DeliveryTab)}>
      <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-muted/50">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "flex items-center gap-1.5 py-2 px-2 text-xs sm:text-sm data-[state=active]:shadow-md transition-all",
              "data-[state=active]:bg-background"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full hidden sm:block", tab.color)} />
            <span className="truncate">{tab.label}</span>
            <Badge 
              variant="secondary" 
              className={cn(
                "ml-auto h-5 min-w-5 px-1.5 text-[10px]",
                activeTab === tab.value && tab.color,
                activeTab === tab.value && "text-white"
              )}
            >
              {counts[tab.value]}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
