import { Lock } from 'lucide-react';
import { useFinancialYear } from '@/contexts/FinancialYearContext';

export function ReadOnlyYearBanner() {
  const { isViewingPast, selectedYear, activeYear, setSelectedYearId } = useFinancialYear();
  if (!isViewingPast || !selectedYear) return null;

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4" />
        <span>
          Viewing <b>{selectedYear.label}</b>
          {selectedYear.is_closed ? ' — closed, read-only' : ' — past year, read-only'}
        </span>
      </div>
      {activeYear && (
        <button
          onClick={() => setSelectedYearId(activeYear.id)}
          className="text-xs font-medium underline hover:text-amber-950"
        >
          Return to {activeYear.label}
        </button>
      )}
    </div>
  );
}
