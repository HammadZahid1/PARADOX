import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { buildCommands } from '@/ui/commands';
import { useParadox } from '@/state/store';

export function CommandPalette() {
  const open = useParadox((state) => state.commandOpen);
  const setOpen = useParadox((state) => state.setCommandOpen);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const commands = useMemo(() => buildCommands(), [open]);
  const results = useMemo(() => commands.filter((command) => `${command.label} ${command.group}`.toLowerCase().includes(query.toLowerCase())), [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      window.setTimeout(() => input.current?.focus(), 20);
    }
  }, [open]);

  if (!open) return null;
  const run = (index: number): void => {
    const command = results[index];
    if (!command) return;
    command.run();
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center bg-void/80 pt-[12vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="w-full max-w-xl border border-line bg-graphite shadow-panel">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={16} className="text-muted" />
          <input
            ref={input}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') { event.preventDefault(); setActive((value) => Math.min(results.length - 1, value + 1)); }
              if (event.key === 'ArrowUp') { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); }
              if (event.key === 'Enter') run(active);
              if (event.key === 'Escape') setOpen(false);
            }}
            placeholder="Search commands…"
            aria-label="Search commands"
            className="h-12 flex-1 bg-transparent font-mono text-sm text-chalk outline-none placeholder:text-muted/60"
          />
          <kbd className="border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">ESC</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-auto py-1">
          {results.map((command, index) => (
            <li key={command.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => run(index)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left font-mono text-xs ${index === active ? 'bg-cyan/10 text-cyan' : 'text-chalk/80 hover:bg-white/5'}`}
              >
                <span>{command.label}</span>
                <span className="text-[10px] text-muted">{command.group}{command.shortcut ? ` · ${command.shortcut}` : ''}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-4 py-6 text-center font-mono text-xs text-muted">No matching commands</li>}
        </ul>
      </div>
    </div>
  );
}
