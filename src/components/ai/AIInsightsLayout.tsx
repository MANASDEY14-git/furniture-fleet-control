import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Brain, RefreshCw, TrendingUp, Package, Target, Lightbulb } from 'lucide-react';
import SalesForecastDashboard from './SalesForecastDashboard';
import RestockingAdvisor from './RestockingAdvisor';
import SalesStrategyDashboard from './SalesStrategyDashboard';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="neon-border bg-slate-900/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="w-8 h-8 text-cyan-400" />
                <div>
                  <CardTitle className="text-2xl text-cyan-400">AI Business Intelligence</CardTitle>
                  <p className="text-blue-200">Powered insights to supercharge your business decisions</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="neon-border bg-green-500/20 text-green-300 border-green-500/30">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    AI Active
                  </div>
                </Badge>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshInsights.isPending || !selectedStore}
                  className="neon-border bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
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
          <Card className="neon-border bg-slate-900/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <span className="text-blue-200 font-medium">Store:</span>
                <div className="flex gap-2">
                  {stores.map((store) => (
                    <Button
                      key={store.id}
                      variant={selectedStore === store.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedStore(store.id)}
                      className={selectedStore === store.id ? "bg-cyan-500 text-slate-900" : "neon-border text-blue-100"}
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
            <TabsList className="grid w-full grid-cols-3 neon-border bg-slate-800/50">
              <TabsTrigger value="forecast" className="flex items-center gap-2 text-blue-100 data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-900">
                <TrendingUp className="w-4 h-4" />
                Sales Forecast
              </TabsTrigger>
              <TabsTrigger value="restock" className="flex items-center gap-2 text-blue-100 data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-900">
                <Package className="w-4 h-4" />
                Smart Restocking
              </TabsTrigger>
              <TabsTrigger value="strategy" className="flex items-center gap-2 text-blue-100 data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-900">
                <Target className="w-4 h-4" />
                Sales Strategy
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
          </Tabs>
        )}

        {/* Quick Tips */}
        <Card className="neon-border bg-gradient-to-r from-purple-900/30 to-blue-900/30">
          <CardHeader>
            <CardTitle className="text-purple-400 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              AI Tips & Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-slate-800/30 border border-purple-500/30">
                <h4 className="font-semibold text-purple-300 mb-2">Sales Forecasting</h4>
                <p className="text-blue-100 text-sm">Use AI predictions to plan inventory purchases and identify seasonal trends for better cash flow management.</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/30 border border-blue-500/30">
                <h4 className="font-semibold text-blue-300 mb-2">Smart Restocking</h4>
                <p className="text-blue-100 text-sm">Focus on critical and high-priority items first. The AI considers sales velocity and profit margins to optimize your inventory investment.</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/30 border border-green-500/30">
                <h4 className="font-semibold text-green-300 mb-2">Sales Strategy</h4>
                <p className="text-blue-100 text-sm">Implement recommended pricing strategies gradually. Test clearance promotions on slow-moving items to improve cash flow.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}