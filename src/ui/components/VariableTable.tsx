import { useMemo, useState } from 'react';
import { formatValue } from '@/utils/format';
import { useParadox } from '@/state/store';
import { Sparkline } from './Sparkline';

export function VariableTable() {
  const engine = useParadox((state) => state.engine);
  useParadox((state) => state.revision);
  const [query, setQuery] = useState('');
  const definitions = engine?.definitions ?? [];
  const state = engine?.activeBranch.currentState;
  const filtered = useMemo(() => definitions.filter((definition) => `${definition.key} ${definition.name}`.toLowerCase().includes(query.toLowerCase())), [definitions, query]);

  if (!state) return <p className="p-4 text-xs text-muted">No active world state.</p>;
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line/60 p-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter variables…" aria-label="Filter variables" className="h-7 w-full border border-line/70 bg-void/60 px-2 font-mono text-[11px] text-chalk outline-none focus:border-cyan/60" />
      </div>
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 bg-graphite/95 font-mono text-[9px] uppercase tracking-wider text-muted">
          <tr><th className="px-3 py-2">Variable</th><th className="px-2 py-2">Value</th><th className="px-2 py-2">Δ</th><th className="hidden px-2 py-2 xl:table-cell">Trend</th></tr>
        </thead>
        <tbody>
          {filtered.map((definition) => {
            const value = state.variables[definition.id];
            const history = engine?.activeBranch.timeline.entries
              .map((entry) => engine.getStateAt(engine.activeBranchId, entry.step)?.variables[definition.id])
              .filter((item): item is number => typeof item === 'number') ?? [];
            const delta = typeof value === 'number' && definition.type === 'number' ? value - Number(definition.initial) : 0;
            return (
              <tr key={definition.id} className="border-t border-line/40 text-xs hover:bg-white/[0.02]">
                <td className="px-3 py-2">
                  <span className="text-chalk/90">{definition.name}</span>
                  <span className="ml-2 font-mono text-[9px] text-muted">{definition.key}</span>
                  {definition.unit && <span className="ml-1 font-mono text-[9px] text-cyan/70">{definition.unit}</span>}
                </td>
                <td className="px-2 py-2 font-mono text-cyan">{formatValue(value, definition.unit)}</td>
                <td className={`px-2 py-2 font-mono text-[10px] ${delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-danger' : 'text-muted'}`}>{delta.toFixed(2)}</td>
                <td className="hidden px-2 py-2 xl:table-cell"><Sparkline values={history.length > 1 ? history : [Number(definition.initial), Number(value)]} height={22} width={80} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
