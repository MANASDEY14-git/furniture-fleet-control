import { CalendarCheck, Lock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFinancialYear } from '@/contexts/FinancialYearContext';

interface FinancialYearsCardProps {
  isAdmin?: boolean;
}

export default function FinancialYearsCard({ isAdmin }: FinancialYearsCardProps) {
  const { years, activeYear, isLoading } = useFinancialYear();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const rollover = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('close_and_rollover_financial_year');
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['financial-years'] });
      const rolled = data?.rolled_over ?? [];
      toast({
        title: rolled.length > 0 ? 'Year closed & rolled over' : 'Nothing to close',
        description:
          rolled.length > 0
            ? `Closed ${rolled.length} year(s). Opening balances carried forward.`
            : 'No overdue financial years found.',
      });
    },
    onError: (e: any) => {
      toast({ title: 'Rollover failed', description: e.message, variant: 'destructive' });
    },
  });

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Card className="futuristic-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-cyan-400" />
          <CardTitle className="text-cyan-300 glow-text">Financial Years</CardTitle>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => rollover.mutate()}
            disabled={rollover.isPending}
          >
            {rollover.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Run year-end close
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Every year runs from April 15 to April 14 of the next year. Closing snapshots stock,
          customer, supplier and bank balances so past years remain immutable.
        </p>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((y) => (
                <TableRow key={y.id}>
                  <TableCell className="font-medium">{y.label}</TableCell>
                  <TableCell>{fmt(y.start_date)}</TableCell>
                  <TableCell>{fmt(y.end_date)}</TableCell>
                  <TableCell>
                    {y.is_closed ? (
                      <Badge variant="secondary">
                        <Lock className="w-3 h-3 mr-1" /> Closed
                      </Badge>
                    ) : activeYear?.id === y.id ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
