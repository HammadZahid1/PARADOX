import type { ReactNode } from 'react';

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="mb-1 h-8 w-8 border border-line/80 bg-[radial-gradient(circle,rgba(61,219,217,0.2),transparent_70%)]" />
      <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-chalk">{title}</h3>
      <p className="max-w-sm text-xs leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
