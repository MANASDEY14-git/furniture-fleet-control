import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Package, Clock, DollarSign, TrendingDown } from 'lucide-react';
import { useRestockRecommendations } from '@/hooks/useAIInsights';
import { formatCurrency } from '@/utils/currencyUtils';

interface RestockingAdvisorProps {
  storeId: string;
}

export default function RestockingAdvisor({ storeId }: RestockingAdvisorProps) {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');
  const { data: recommendations, isLoading, error } = useRestockRecommendations(storeId);

  if (isLoading) {
    return (
      <Card className="neon-border bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Smart Restocking Advisor
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

  if (error || !recommendations) {
    return (
      <Card className="neon-border bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Smart Restocking Advisor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-400">Failed to load restocking recommendations</p>
        </CardContent>
      </Card>
    );
  }

  const filteredRecommendations = filter === 'ALL' 
    ? recommendations.recommendations 
    : recommendations.recommendations.filter(rec => rec.priority === filter);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'HIGH': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-green-500/20 text-green-300 border-green-500/30';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return <AlertTriangle className="w-4 h-4" />;
      case 'HIGH': return <Clock className="w-4 h-4" />;
      case 'MEDIUM': return <TrendingDown className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <Card className="neon-border bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Smart Restocking Advisor
          </CardTitle>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="neon-border bg-slate-800/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-gray-300">Critical</span>
            </div>
            <p className="text-xl font-bold text-red-400">{recommendations.summary.critical_items}</p>
          </div>
          
          <div className="neon-border bg-slate-800/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-gray-300">High Priority</span>
            </div>
            <p className="text-xl font-bold text-orange-400">{recommendations.summary.high_priority}</p>
          </div>
          
          <div className="neon-border bg-slate-800/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">Total Items</span>
            </div>
            <p className="text-xl font-bold text-blue-400">{recommendations.summary.total_items}</p>
          </div>
          
          <div className="neon-border bg-slate-800/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">Est. Investment</span>
            </div>
            <p className="text-xl font-bold text-green-400">
              {formatCurrency(filteredRecommendations.reduce((sum, rec) => sum + rec.estimated_cost, 0))}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((priority) => (
            <Button
              key={priority}
              variant={filter === priority ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(priority as any)}
              className={filter === priority ? "bg-cyan-500 text-slate-900" : "neon-border text-blue-100"}
            >
              {priority}
            </Button>
          ))}
        </div>

        {/* Recommendations Table */}
        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 bg-slate-800/50">
                <TableHead className="text-cyan-400">Item</TableHead>
                <TableHead className="text-cyan-400">Priority</TableHead>
                <TableHead className="text-cyan-400">Current Stock</TableHead>
                <TableHead className="text-cyan-400">Days Left</TableHead>
                <TableHead className="text-cyan-400">Recommended Qty</TableHead>
                <TableHead className="text-cyan-400">Est. Cost</TableHead>
                <TableHead className="text-cyan-400">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecommendations.slice(0, 10).map((rec) => (
                <TableRow key={rec.item_id} className="border-slate-700 hover:bg-slate-800/30">
                  <TableCell>
                    <div>
                      <p className="font-medium text-blue-100">{rec.item_name}</p>
                      <p className="text-sm text-gray-400">{rec.reason}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`neon-border ${getPriorityColor(rec.priority)}`}>
                      <div className="flex items-center gap-1">
                        {getPriorityIcon(rec.priority)}
                        {rec.priority}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-blue-100">{rec.current_stock}</TableCell>
                  <TableCell>
                    <span className={rec.days_until_stockout <= 7 ? "text-red-400" : "text-blue-100"}>
                      {rec.days_until_stockout > 999 ? "∞" : rec.days_until_stockout}
                    </span>
                  </TableCell>
                  <TableCell className="text-blue-100">{rec.recommended_quantity}</TableCell>
                  <TableCell className="text-green-400">{formatCurrency(rec.estimated_cost)}</TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="neon-border text-cyan-300 hover:bg-cyan-900/20"
                    >
                      {rec.action.replace('_', ' ')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredRecommendations.length === 0 && (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400">No recommendations found for the selected filter</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}