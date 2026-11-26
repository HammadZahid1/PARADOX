import { formatDelta } from '@/utils/format';

export function MetricCard({ label, value, unit, delta, hint }: { label: string; value: string | number; unit?: string; delta?: number; hint?: string }) {
  return (
    <div className="border border-line/60 bg-graphite/50 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-lg text-chalk">{value}{unit ? <span className="ml-1 text-xs text-muted">{unit}</span> : null}</span>
        {delta !== undefined && <span className={`font-mono text-[11px] ${delta >= 0 ? 'text-emerald-300' : 'text-danger'}`}>{formatDelta(delta)}</span>}
      </div>
      {hint && <p className="mt-0.5 truncate text-[10px] text-muted">{hint}</p>}
    </div>
  );
}
