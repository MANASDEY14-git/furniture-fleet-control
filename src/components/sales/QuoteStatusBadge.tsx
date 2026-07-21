import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

const statusConfig: Record<QuoteStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border' },
  sent: { label: 'Sent', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  accepted: { label: 'Accepted', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function QuoteStatusBadge({ status }: { status?: string }) {
  const config = statusConfig[(status as QuoteStatus) || 'draft'] || statusConfig.draft;
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}
