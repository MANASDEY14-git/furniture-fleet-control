import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, Target, AlertCircle, BarChart3, Database } from 'lucide-react';
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

  const meta = (forecast as any).meta;

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
  const avgConfidence = forecast.predictions.length > 0
    ? forecast.predictions.reduce((sum, pred) => sum + pred.confidence, 0) / forecast.predictions.length
    : 0;

  const confidenceColor = meta?.confidence === 'HIGH' ? 'text-green-400' : meta?.confidence === 'MEDIUM' ? 'text-yellow-400' : 'text-red-400';
  const qualityColor = meta?.dataQuality === 'GOOD' ? 'bg-green-500/20 text-green-400' : meta?.dataQuality === 'LIMITED' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400';

  return (
    <div className="space-y-6">
      <Card className="neon-border bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Sales Forecast
            </CardTitle>
            <div className="flex items-center gap-2">
              {meta && (
                <Badge variant="outline" className={qualityColor}>
                  <Database className="w-3 h-3 mr-1" />
                  {meta.monthsUsed} months data
                </Badge>
              )}
              {meta && (
                <Badge variant="outline" className="bg-slate-700/50 text-slate-300">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  {meta.method || 'Statistical'}
                </Badge>
              )}
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
                <TrendingUp className={`w-4 h-4 ${confidenceColor}`} />
                <span className="text-sm text-gray-300">Confidence</span>
              </div>
              <p className={`text-2xl font-bold ${confidenceColor}`}>
                {meta?.confidence || `${avgConfidence.toFixed(0)}%`}
              </p>
              {meta?.fallbackUsed && (
                <p className="text-xs text-yellow-400 mt-1">⚠ Limited data — using fallback</p>
              )}
            </div>
          </div>

          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value: any, name: string) => [formatCurrency(Number(value)), name]}
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
              <h4 className="text-lg font-semibold text-cyan-400 mb-3">Insights</h4>
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
