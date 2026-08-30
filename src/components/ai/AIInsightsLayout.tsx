import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Brain, RefreshCw, TrendingUp, Package, Target, Lightbulb } from 'lucide-react';
import SalesForecastDashboard from './SalesForecastDashboard';
import RestockingAdvisor from './RestockingAdvisor';
import SalesStrategyDashboard from './SalesStrategyDashboard';
import OperationalInsightsDashboard from './OperationalInsightsDashboard';
import { useRefreshAIInsights } from '@/hooks/useAIInsights';
import { useStores } from '@/hooks/useStores';

export default function AIInsightsLayout() {
  const [selectedStore, setSelectedStore] = useState<string>('');
  const { data: stores } = useStores();
  const refreshInsights = useRefreshAIInsights();

  // Auto-select first store if none selected
  if (!selectedStore && stores?.length) {
    setSelectedStore(stores[0].id);
  }

  const handleRefresh = () => {
    if (selectedStore) {
      refreshInsights.mutate(selectedStore);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6">
      {/* Header */}
      <Card className="simple-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl">AI Business Intelligence</CardTitle>
                <p className="text-sm text-muted-foreground">Powered insights to supercharge your business decisions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  AI Active
                </div>
              </Badge>
              <Button
                onClick={handleRefresh}
                disabled={refreshInsights.isPending || !selectedStore}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshInsights.isPending ? 'animate-spin' : ''}`} />
                Refresh Insights
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Store Selector */}
      {stores && stores.length > 1 && (
        <Card className="simple-card">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Store:</span>
              <div className="flex flex-wrap gap-2">
                {stores.map((store) => (
                  <Button
                    key={store.id}
                    variant={selectedStore === store.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStore(store.id)}
                  >
                    {store.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights Tabs */}
      {selectedStore && (
        <Tabs defaultValue="forecast" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-muted/50 p-1">
            <TabsTrigger value="forecast" className="flex items-center gap-2 text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4" />
              Sales Forecast
            </TabsTrigger>
            <TabsTrigger value="restock" className="flex items-center gap-2 text-xs sm:text-sm">
              <Package className="w-4 h-4" />
              Smart Restocking
            </TabsTrigger>
            <TabsTrigger value="strategy" className="flex items-center gap-2 text-xs sm:text-sm">
              <Target className="w-4 h-4" />
              Sales Strategy
            </TabsTrigger>
            <TabsTrigger value="operational" className="flex items-center gap-2 text-xs sm:text-sm">
              <Brain className="w-4 h-4" />
              Operational Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="space-y-6">
            <SalesForecastDashboard storeId={selectedStore} />
          </TabsContent>

          <TabsContent value="restock" className="space-y-6">
            <RestockingAdvisor storeId={selectedStore} />
          </TabsContent>

          <TabsContent value="strategy" className="space-y-6">
            <SalesStrategyDashboard storeId={selectedStore} />
          </TabsContent>

          <TabsContent value="operational" className="space-y-6">
            <OperationalInsightsDashboard storeId={selectedStore} />
          </TabsContent>
        </Tabs>
      )}

      {/* Quick Tips */}
      <Card className="simple-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            AI Tips & Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <h4 className="font-semibold text-foreground mb-2 text-sm">Sales Forecasting</h4>
              <p className="text-muted-foreground text-sm">Use AI predictions to plan inventory purchases and identify seasonal trends for better cash flow management.</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <h4 className="font-semibold text-foreground mb-2 text-sm">Smart Restocking</h4>
              <p className="text-muted-foreground text-sm">Focus on critical and high-priority items first. The AI considers sales velocity and profit margins to optimize your inventory investment.</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <h4 className="font-semibold text-foreground mb-2 text-sm">Sales Strategy</h4>
              <p className="text-muted-foreground text-sm">Implement recommended pricing strategies gradually. Test clearance promotions on slow-moving items to improve cash flow.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
