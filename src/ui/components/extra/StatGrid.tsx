import type { ReactNode } from 'react';

export interface StatItem {
  label: string;
  value: ReactNode;
  hint?: string;
}

const columnClasses: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export function StatGrid({ items, columns = 3, className = '' }: { items: readonly StatItem[]; columns?: 2 | 3 | 4; className?: string }) {
  return (
    <dl className={`grid gap-2 ${columnClasses[columns]} ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="border border-line/60 bg-graphite/50 px-3 py-2">
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{item.label}</dt>
          <dd className="mt-1 font-mono text-lg text-chalk">
            {item.value}
            {item.hint && <span className="mt-0.5 block text-[10px] text-muted">{item.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
