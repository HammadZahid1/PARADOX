import { useMemo, useState } from 'react';
import { useParadox } from '@/state/store';
import type { ConsoleKind } from '@/engine/simulation/types';

const KINDS: Array<ConsoleKind | 'all'> = ['all', 'event', 'causal', 'variable', 'branch', 'control', 'snapshot'];

export function EventConsole() {
  const engine = useParadox((state) => state.engine);
  useParadox((state) => state.revision);
  const [filter, setFilter] = useState<ConsoleKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const logs = useMemo(() => engine?.getConsole({ kind: filter === 'all' ? undefined : filter, query }) ?? [], [engine, filter, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap gap-1 border-b border-line/60 p-2">
        {KINDS.map((kind) => (
          <button key={kind} type="button" onClick={() => setFilter(kind)} className={`border px-1.5 py-0.5 font-mono text-[9px] uppercase ${filter === kind ? 'border-cyan/50 text-cyan' : 'border-line/70 text-muted hover:text-chalk'}`}>{kind}</button>
        ))}
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search console…" aria-label="Search console" className="ml-auto h-6 w-36 border border-line/70 bg-void/60 px-2 font-mono text-[10px] outline-none focus:border-cyan/60" />
      </div>
      <div className="flex-1 overflow-auto px-2 py-1 font-mono text-[10px] leading-relaxed">
        {logs.length === 0 && <p className="py-4 text-center text-muted">No console activity</p>}
        {logs.map((entry) => (
          <div key={entry.id} className="flex gap-2 border-b border-line/30 py-1">
            <span className="shrink-0 text-muted/70">[{String(entry.step).padStart(3, '0')}]</span>
            <span className={`w-16 shrink-0 uppercase ${entry.severity === 'critical' ? 'text-danger' : entry.severity === 'warning' ? 'text-amber' : 'text-cyan/70'}`}>{entry.kind}</span>
            <span className="text-chalk/70">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
