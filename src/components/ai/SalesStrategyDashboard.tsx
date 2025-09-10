import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Target, TrendingUp, Tag, AlertCircle, DollarSign, Percent } from 'lucide-react';
import { useSalesStrategy } from '@/hooks/useAIInsights';
import { formatCurrency } from '@/utils/currencyUtils';

interface SalesStrategyDashboardProps {
  storeId: string;
}

export default function SalesStrategyDashboard({ storeId }: SalesStrategyDashboardProps) {
  const [filter, setFilter] = useState<'ALL' | 'clearance' | 'premium_pricing' | 'bundle' | 'cost_optimization'>('ALL');
  const { data: strategies, isLoading, error } = useSalesStrategy(storeId);

  if (isLoading) {
    return (
      <Card className="neon-border bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Sales Strategy Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-slate-700 rounded animate-pulse" />
            <div className="h-32 bg-slate-700 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !strategies) {
    return (
      <Card className="neon-border bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Sales Strategy Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-400">Failed to load sales strategies</p>
        </CardContent>
      </Card>
    );
  }

  const filteredStrategies = filter === 'ALL' 
    ? strategies.strategies 
    : strategies.strategies.filter(strategy => strategy.strategy_type === filter);

  const getStrategyColor = (type: string) => {
    switch (type) {
      case 'clearance': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'premium_pricing': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'bundle': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'cost_optimization': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStrategyIcon = (type: string) => {
    switch (type) {
      case 'clearance': return <Tag className="w-4 h-4" />;
      case 'premium_pricing': return <TrendingUp className="w-4 h-4" />;
      case 'bundle': return <Target className="w-4 h-4" />;
      case 'cost_optimization': return <DollarSign className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'HIGH': return 'text-red-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'LOW': return 'text-green-400';
      default: return 'text-blue-400';
    }
  };

  const formatStrategyType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card className="neon-border bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Sales Strategy Recommendations
          </CardTitle>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="neon-border bg-slate-800/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">Total Recommendations</span>
            </div>
            <p className="text-xl font-bold text-blue-400">{strategies.summary.total_recommendations}</p>
          </div>
          
          <div className="neon-border bg-slate-800/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">Potential Revenue Increase</span>
            </div>
            <p className="text-xl font-bold text-green-400">
              {formatCurrency(strategies.summary.potential_revenue_increase)}
            </p>
          </div>
          
          <div className="neon-border bg-slate-800/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="w-4 h-4 text-red-400" />
              <span className="text-sm text-gray-300">Slow Moving Items</span>
            </div>
            <p className="text-xl font-bold text-red-400">{strategies.summary.slow_moving_items}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['ALL', 'clearance', 'premium_pricing', 'bundle', 'cost_optimization'].map((strategyType) => (
            <Button
              key={strategyType}
              variant={filter === strategyType ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(strategyType as any)}
              className={filter === strategyType ? "bg-cyan-500 text-slate-900" : "neon-border text-blue-100"}
            >
              {strategyType === 'ALL' ? 'ALL' : formatStrategyType(strategyType)}
            </Button>
          ))}
        </div>

        {/* Strategies Table */}
        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 bg-slate-800/50">
                <TableHead className="text-cyan-400">Item</TableHead>
                <TableHead className="text-cyan-400">Strategy</TableHead>
                <TableHead className="text-cyan-400">Current Price</TableHead>
                <TableHead className="text-cyan-400">Recommended Price</TableHead>
                <TableHead className="text-cyan-400">Discount</TableHead>
                <TableHead className="text-cyan-400">Est. Impact</TableHead>
                <TableHead className="text-cyan-400">Urgency</TableHead>
                <TableHead className="text-cyan-400">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStrategies.slice(0, 10).map((strategy) => (
                <TableRow key={strategy.item_id} className="border-slate-700 hover:bg-slate-800/30">
                  <TableCell>
                    <div>
                      <p className="font-medium text-blue-100">{strategy.item_name}</p>
                      <p className="text-sm text-gray-400">{strategy.reason}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`neon-border ${getStrategyColor(strategy.strategy_type)}`}>
                      <div className="flex items-center gap-1">
                        {getStrategyIcon(strategy.strategy_type)}
                        {formatStrategyType(strategy.strategy_type)}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-blue-100">{formatCurrency(strategy.current_price)}</TableCell>
                  <TableCell className="text-blue-100">{formatCurrency(strategy.recommended_price)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      <span className={strategy.discount_percentage > 0 ? "text-red-400" : "text-green-400"}>
                        {strategy.discount_percentage > 0 ? '+' : ''}{strategy.discount_percentage}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-green-400">{formatCurrency(strategy.estimated_impact)}</TableCell>
                  <TableCell>
                    <span className={getUrgencyColor(strategy.urgency)}>
                      {strategy.urgency}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="neon-border text-cyan-300 hover:bg-cyan-900/20"
                    >
                      Apply
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredStrategies.length === 0 && (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400">No strategies found for the selected filter</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}