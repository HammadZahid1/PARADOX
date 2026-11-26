import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useParadox } from '@/state/store';
import { buildSearchIndex, searchDocuments, type SearchHit } from '@/search';
import type { ViewId } from '@/state/types';

function openHit(hit: SearchHit): void {
  const state = useParadox.getState();
  const { document } = hit;
  switch (document.kind) {
    case 'scenario':
      state.loadScenario(document.refId ?? document.scenarioId ?? '');
      state.setView('scenarios');
      break;
    case 'variable':
      state.setSelection({ variableKey: document.refId });
      state.setView('world');
      break;
    case 'event':
      state.setSelection({ eventId: document.refId });
      state.setView('events');
      break;
    case 'branch':
      state.setSelection({ branchId: document.refId });
      state.setView('explorer');
      break;
    case 'rule':
      state.setSelection({ nodeId: document.refId });
      state.setView('lab');
      break;
    default:
      state.setView(document.viewId as ViewId ?? 'lab');
  }
  state.setSearchOpen(false);
}

export function SearchDialog() {
  const open = useParadox((state) => state.searchOpen);
  const setOpen = useParadox((state) => state.setSearchOpen);
  const scenarios = useParadox((state) => state.scenarios);
  const engine = useParadox((state) => state.engine);
  const revision = useParadox((state) => state.revision);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const documents = useMemo(() => buildSearchIndex(scenarios, engine), [scenarios, engine, revision]);
  const hits = useMemo(() => searchDocuments(documents, query, 40), [documents, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      window.setTimeout(() => input.current?.focus(), 20);
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[94] flex items-start justify-center bg-void/80 pt-[10vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-label="Search workspace" className="w-full max-w-2xl border border-line bg-graphite shadow-panel">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={16} className="text-muted" />
          <input
            ref={input}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') { event.preventDefault(); setActive((value) => Math.min(hits.length - 1, value + 1)); }
              if (event.key === 'ArrowUp') { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); }
              if (event.key === 'Enter') { const hit = hits[active]; if (hit) openHit(hit); }
            }}
            placeholder="Search scenarios, variables, events, realities…"
            aria-label="Search workspace"
            className="h-12 flex-1 bg-transparent font-mono text-sm text-chalk outline-none placeholder:text-muted/60"
          />
          <button type="button" onClick={() => setOpen(false)} aria-label="Close search" className="text-muted hover:text-chalk"><X size={16} /></button>
        </div>
        <ul className="max-h-[55vh] overflow-auto py-1">
          {hits.map((hit, index) => (
            <li key={hit.document.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => openHit(hit)}
                className={`flex w-full items-center justify-between gap-4 px-4 py-2 text-left ${index === active ? 'bg-cyan/10' : 'hover:bg-white/5'}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-mono text-xs text-chalk">{hit.document.title}</span>
                  <span className="block truncate text-[10px] text-muted">{hit.document.subtitle}</span>
                </span>
                <span className="shrink-0 border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan/80">{hit.document.kind}</span>
              </button>
            </li>
          ))}
          {query.trim().length > 0 && hits.length === 0 && <li className="px-4 py-8 text-center font-mono text-xs text-muted">No matches in local data</li>}
          {query.trim().length === 0 && <li className="px-4 py-8 text-center font-mono text-xs text-muted">Type to search the local workspace index</li>}
        </ul>
      </div>
    </div>
  );
}
