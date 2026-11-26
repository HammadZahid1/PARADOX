import { useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';

function serialize(value: unknown): string {
  try {
    const json = JSON.stringify(value, null, 2);
    return json === undefined ? String(value) : json;
  } catch {
    return String(value);
  }
}

function summarize(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} items`;
  if (value !== null && typeof value === 'object') return `${Object.keys(value).length} keys`;
  return String(value);
}

export function JsonViewer({ value, label = 'JSON', defaultExpanded = false, className = '' }: { value: unknown; label?: string; defaultExpanded?: boolean; className?: string }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const regionId = useId();

  return (
    <div className={`border border-line/60 bg-graphite/40 ${className}`}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left font-mono text-[10px] text-muted hover:text-chalk"
      >
        <ChevronRight size={12} aria-hidden="true" className={`shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        <span>{label}</span>
        <span className="text-muted/70">{summarize(value)}</span>
      </button>
      <pre id={regionId} hidden={!expanded} className="max-h-64 overflow-auto border-t border-line/60 px-2 py-2 font-mono text-[10px] leading-relaxed text-chalk/80">
        {serialize(value)}
      </pre>
    </div>
  );
}
