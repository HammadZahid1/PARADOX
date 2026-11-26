import type { ReactNode } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  content: ReactNode;
  badge?: string | number;
}

export function Tabs<T extends string>({ items, value, onChange }: { items: readonly TabItem<T>[]; value: T; onChange: (id: T) => void }) {
  const active = items.find((item) => item.id === value) ?? items[0];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" className="flex shrink-0 gap-0 border-b border-line/70">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === value}
            onClick={() => onChange(item.id)}
            className={`border-b-2 px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${item.id === value ? 'border-cyan text-cyan' : 'border-transparent text-muted hover:text-chalk'}`}
          >
            {item.label}{item.badge !== undefined && <span className="ml-1.5 text-[9px] opacity-60">{item.badge}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-auto">{active?.content}</div>
    </div>
  );
}
