import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, ChevronDown, Database } from 'lucide-react';
import type { ChatMessage as ChatMessageType, AssistantEvidence } from '@/hooks/useAssistantChat';

interface ChatMessageProps {
  message: ChatMessageType;
}

const formatValue = (v: unknown): string => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return v.toLocaleString('en-IN');
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'object') {
    if (Array.isArray(v)) return `${v.length} listed`;
    return Object.entries(v as Record<string, unknown>)
      .filter(([k]) => !/^(scope|store_id|as_of)$/.test(k))
      .slice(0, 4)
      .map(([k, val]) => `${k}: ${formatValue(val)}`)
      .join(', ');
  }
  return String(v);
};

const summarizeResult = (result?: unknown): string[] => {
  if (!result || typeof result !== 'object') return [];
  return Object.entries(result as Record<string, unknown>)
    .filter(([k]) => !/^(scope|store_id|store_name|as_of|customers|suppliers|top_customers|age_buckets|aging_buckets|by_bucket|reorder|dead_stock)$/.test(k))
    .slice(0, 8)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${formatValue(v)}`);
};

const summarizeArgs = (args?: unknown): string => {
  if (!args || typeof args !== 'object') return '';
  const entries = Object.entries(args as Record<string, unknown>);
  if (!entries.length) return '';
  return entries.map(([k, v]) => `${k.replace(/_date$/, '').replace(/_/g, ' ')} ${String(v)}`).join(' · ');
};

function EvidencePanel({ evidence }: { evidence: AssistantEvidence[] }) {
  const [open, setOpen] = useState(false);
  if (!evidence.length) return null;

  return (
    <div className="mt-2 pt-1.5 border-t border-border/20 text-[9px] text-muted-foreground font-sans">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Database className="w-2.5 h-2.5" />
        <span>Based on {evidence.length} checked figure{evidence.length === 1 ? '' : 's'}</span>
        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1">
          {evidence.map((e, i) => {
            const facts = summarizeResult(e.result);
            return (
              <li key={`${e.tool}-${i}`} className="bg-background/60 rounded-md px-2 py-1.5 border border-border/40">
                <div className="font-semibold text-foreground/80">{e.label || e.tool}</div>
                {summarizeArgs(e.args) && (
                  <div className="text-muted-foreground/80">for {summarizeArgs(e.args)}</div>
                )}
                {e.error ? (
                  <div className="text-destructive">Could not read: {e.error}</div>
                ) : facts.length > 0 ? (
                  <div>{facts.join(' · ')}</div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div
        className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm'
        }`}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {message.agents_consulted && message.agents_consulted.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 pt-1.5 border-t border-border/20 text-[9px] text-muted-foreground font-sans">
                <span className="font-semibold select-none">Sources:</span>
                {message.agents_consulted.map((source, i) => (
                  <span key={`${source}-${i}`} className="bg-background px-1.5 py-0.5 rounded border border-border/55 text-[8px] font-bold text-foreground/80">
                    {source}
                  </span>
                ))}
              </div>
            )}
            {!isUser && message.evidence && <EvidencePanel evidence={message.evidence} />}
          </div>
        )}
      </div>
    </div>
  );
}
