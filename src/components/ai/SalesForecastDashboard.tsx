import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar, Target, AlertCircle } from 'lucide-react';
import { useSalesForecast } from '@/hooks/useAIInsights';
import { formatCurrency } from '@/utils/currencyUtils';

interface SalesForecastDashboardProps {
  storeId: string;
}

export default function SalesForecastDashboard({ storeId }: SalesForecastDashboardProps) {
  const [timeframe, setTimeframe] = useState('6');
  const { data: forecast, isLoading, error } = useSalesForecast(storeId, timeframe);

  if (isLoading) {
    return (
      <Card className="neon-border bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Sales Forecast
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

  if (error || !forecast) {
    return (
      <Card className="neon-border bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Sales Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-400">Failed to load sales forecast</p>
        </CardContent>
      </Card>
    );
  }

  // Combine historical and predicted data for chart
  const chartData = [
    ...forecast.historical.slice(-12).map(item => ({
      month: item.month,
      actual: item.total,
      type: 'historical'
    })),
    ...forecast.predictions.map(pred => ({
      month: pred.month,
      predicted: pred.predicted_amount,
      confidence: pred.confidence,
      type: 'predicted'
    }))
  ];

  const totalPredicted = forecast.predictions.reduce((sum, pred) => sum + pred.predicted_amount, 0);
  const avgConfidence = forecast.predictions.reduce((sum, pred) => sum + pred.confidence, 0) / forecast.predictions.length;

  return (
    <div className="space-y-6">
      <Card className="neon-border bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Sales Forecast
            </CardTitle>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-32 neon-border bg-slate-800/50 text-blue-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="neon-border bg-slate-800/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">Predicted Revenue</span>
              </div>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(totalPredicted)}</p>
            </div>
            
            <div className="neon-border bg-slate-800/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">Timeframe</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">{timeframe} Months</p>
            </div>
            
            <div className="neon-border bg-slate-800/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">Avg Confidence</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">{avgConfidence.toFixed(1)}%</p>
            </div>
          </div>

          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(Number(value)), name]}
                  labelStyle={{ color: '#111827' }}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#06B6D4" 
                  strokeWidth={2}
                  name="Historical Sales"
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Predicted Sales"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {forecast.insights.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-cyan-400 mb-3">AI Insights</h4>
              <div className="space-y-2">
                {forecast.insights.map((insight, index) => (
                  <div key={index} className="neon-border bg-slate-800/30 p-3 rounded-lg">
                    <p className="text-blue-100">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}