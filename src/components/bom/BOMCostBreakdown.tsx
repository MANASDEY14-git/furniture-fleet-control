import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BOMCostCalculation } from '@/types/bom';

interface BOMCostBreakdownProps {
  costCalculation: BOMCostCalculation;
  className?: string;
}

export function BOMCostBreakdown({ costCalculation, className = '' }: BOMCostBreakdownProps) {
  const { componentCosts, totalEstimatedCost } = costCalculation;
  
  // Group costs by type for pie chart
  const costByType = componentCosts.reduce((acc, cost) => {
    const type = cost.componentName?.includes('Labor') ? 'Labor' : 
                 cost.componentName?.includes('Service') ? 'Service' : 'Materials';
    acc[type] = (acc[type] || 0) + cost.totalCost;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(costByType).map(([type, cost]) => ({
    name: type,
    value: cost,
    percentage: ((cost / totalEstimatedCost) * 100).toFixed(1)
  }));

  const COLORS = {
    Materials: '#3b82f6',
    Labor: '#10b981',
    Service: '#f59e0b'
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-300 flex items-center justify-between">
            Cost Breakdown
            <Badge variant="outline" className="text-lg font-bold text-green-300">
              ₹{totalEstimatedCost.toFixed(2)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Cost']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Cost Summary */}
            <div className="space-y-3">
              <h4 className="text-blue-200 font-semibold">Cost Summary</h4>
              {Object.entries(costByType).map(([type, cost]) => (
                <div key={type} className="flex justify-between items-center p-2 bg-slate-700/30 rounded">
                  <span className="text-blue-200">{type}</span>
                  <div className="text-right">
                    <div className="text-green-300 font-semibold">₹{cost.toFixed(2)}</div>
                    <div className="text-xs text-gray-400">
                      {((cost / totalEstimatedCost) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Component Costs */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-300">Component Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {componentCosts.map((cost, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-slate-700/30 rounded border border-blue-500/20">
                <div>
                  <div className="text-blue-200 font-medium">{cost.componentName || 'Component'}</div>
                  <div className="text-sm text-gray-400">{cost.materialName}</div>
                  <div className="text-xs text-gray-500">
                    {cost.quantity} units × ₹{cost.unitCost.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-300 font-semibold">₹{cost.totalCost.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">
                    {((cost.totalCost / totalEstimatedCost) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}