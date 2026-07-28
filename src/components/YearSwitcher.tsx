import { Calendar, Lock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { Badge } from '@/components/ui/badge';

export function YearSwitcher() {
  const { years, selectedYear, setSelectedYearId, isLoading } = useFinancialYear();

  if (isLoading || !selectedYear) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <Select value={selectedYear.id} onValueChange={setSelectedYearId}>
        <SelectTrigger className="h-8 w-[160px] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y.id} value={y.id}>
              <div className="flex items-center gap-2">
                <span>{y.label}</span>
                {y.is_closed && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                    <Lock className="w-2.5 h-2.5 mr-0.5" /> Closed
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
