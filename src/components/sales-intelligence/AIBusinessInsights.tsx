import React from 'react';
import { Sparkles, AlertTriangle, CheckCircle2, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AIBusinessInsight } from '@/hooks/useSalesIntelligence';

interface AIBusinessInsightsProps {
  insights?: AIBusinessInsight[];
}

export function AIBusinessInsights({ insights = [] }: AIBusinessInsightsProps) {
  if (!insights || insights.length === 0) return null;

  const getStyleForType = (type: AIBusinessInsight['type']) => {
    switch (type) {
      case 'highlight':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100',
          icon: <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />,
          badgeBg: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40',
        };
      case 'warning':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-100',
          icon: <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />,
          badgeBg: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40',
        };
      case 'success':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100',
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
          badgeBg: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
        };
      case 'synergy':
        return {
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-100',
          icon: <Users className="h-4 w-4 text-purple-500 shrink-0" />,
          badgeBg: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40',
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-500/10 border-border/60 text-blue-900 dark:text-blue-100',
          icon: <TrendingUp className="h-4 w-4 text-blue-500 shrink-0" />,
          badgeBg: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40',
        };
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight uppercase text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" /> AI Business Insights & Operational Summaries
        </h2>
        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
          Real-time Executive Diagnostics
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((insight) => {
          const style = getStyleForType(insight.type);
          return (
            <Card
              key={insight.id}
              className={`border transition-all duration-200 hover:shadow-md ${style.bg}`}
            >
              <CardContent className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {style.icon}
                    <span className="font-bold text-xs leading-tight">{insight.title}</span>
                  </div>

                  {insight.metricBadge && (
                    <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 whitespace-nowrap ${style.badgeBg}`}>
                      {insight.metricBadge}
                    </Badge>
                  )}
                </div>

                <p className="text-xs leading-relaxed opacity-90 text-foreground/90 font-normal">
                  {insight.description}
                </p>

                {insight.salespersonName && (
                  <div className="pt-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <span>Target:</span>
                    <span className="font-semibold text-foreground">{insight.salespersonName}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
