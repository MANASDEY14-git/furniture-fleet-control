import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Package, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useItems } from '@/hooks/useItems';
import { useMaterials } from '@/hooks/useMaterials';

export function BOMCostAnalytics() {
  const { data: items = [] } = useItems();
  const { data: materials = [] } = useMaterials();

  // Calculate analytics data
  const analytics = useMemo(() => {
    const itemsWithCosts = items.map(item => {
      // For demo purposes, calculating estimated material cost
      const estimatedMaterialCost = Math.random() * 100 + 20; // Mock calculation
      const sellingPrice = item.selling_price || 0;
      const margin = sellingPrice > 0 ? ((sellingPrice - estimatedMaterialCost) / sellingPrice) * 100 : 0;
      
      return {
        ...item,
        estimatedMaterialCost,
        margin,
        profitability: sellingPrice - estimatedMaterialCost
      };
    });

    const totalMaterialValue = materials.reduce((sum, material) => 
      sum + (material.cost_price * material.quantity_available), 0
    );

    const averageMargin = itemsWithCosts.reduce((sum, item) => sum + item.margin, 0) / itemsWithCosts.length;

    const costDistribution = itemsWithCosts.map(item => ({
      name: item.name,
      materialCost: item.estimatedMaterialCost,
      sellingPrice: item.selling_price || 0,
      margin: item.margin
    }));

    const materialCategories = materials.reduce((acc, material) => {
      const category = material.unit || 'Others';
      if (!acc[category]) {
        acc[category] = { name: category, value: 0, count: 0 };
      }
      acc[category].value += material.cost_price * material.quantity_available;
      acc[category].count += 1;
      return acc;
    }, {} as Record<string, { name: string; value: number; count: number }>);

    return {
      itemsWithCosts,
      totalMaterialValue,
      averageMargin,
      costDistribution: costDistribution.slice(0, 10), // Top 10 items
      materialCategories: Object.values(materialCategories)
    };
  }, [items, materials]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Total Material Value</p>
                <p className="text-2xl font-bold text-cyan-300">
                  ${analytics.totalMaterialValue.toFixed(0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Avg. Profit Margin</p>
                <p className="text-2xl font-bold text-cyan-300">
                  {analytics.averageMargin.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Material Types</p>
                <p className="text-2xl font-bold text-cyan-300">
                  {analytics.materialCategories.length}
                </p>
              </div>
              <Package className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Low Margin Items</p>
                <p className="text-2xl font-bold text-cyan-300">
                  {analytics.itemsWithCosts.filter(item => item.margin < 20).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Distribution Chart */}
        <Card className="bg-slate-800/50 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-300">Cost vs Selling Price Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.costDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: number, name: string) => [
                    `$${value.toFixed(2)}`,
                    name === 'materialCost' ? 'Material Cost' : 'Selling Price'
                  ]}
                />
                <Bar dataKey="materialCost" fill="#EF4444" name="Material Cost" />
                <Bar dataKey="sellingPrice" fill="#10B981" name="Selling Price" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Material Categories Pie Chart */}
        <Card className="bg-slate-800/50 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-300">Material Inventory by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.materialCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.materialCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Profitability Analysis */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-300">Profitability Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* High Margin Items */}
            <div>
              <h4 className="text-green-300 font-semibold mb-3">High Margin Items (&gt;40%)</h4>
              <div className="space-y-2">
                {analytics.itemsWithCosts
                  .filter(item => item.margin > 40)
                  .slice(0, 5)
                  .map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-slate-700/30 rounded">
                      <span className="text-blue-200 text-sm">{item.name}</span>
                      <Badge variant="secondary" className="bg-green-600/20 text-green-300">
                        {item.margin.toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>

            {/* Medium Margin Items */}
            <div>
              <h4 className="text-yellow-300 font-semibold mb-3">Medium Margin Items (20-40%)</h4>
              <div className="space-y-2">
                {analytics.itemsWithCosts
                  .filter(item => item.margin >= 20 && item.margin <= 40)
                  .slice(0, 5)
                  .map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-slate-700/30 rounded">
                      <span className="text-blue-200 text-sm">{item.name}</span>
                      <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300">
                        {item.margin.toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>

            {/* Low Margin Items */}
            <div>
              <h4 className="text-red-300 font-semibold mb-3">Low Margin Items (&lt;20%)</h4>
              <div className="space-y-2">
                {analytics.itemsWithCosts
                  .filter(item => item.margin < 20)
                  .slice(0, 5)
                  .map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-slate-700/30 rounded">
                      <span className="text-blue-200 text-sm">{item.name}</span>
                      <Badge variant="destructive" className="bg-red-600/20 text-red-300">
                        {item.margin.toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}