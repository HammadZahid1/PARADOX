import type { ReactNode } from 'react';

export function SectionHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line/60 pb-4">
      <div>
        {eyebrow && <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan">{eyebrow}</p>}
        <h1 className="mt-1 text-xl font-light tracking-tight text-chalk">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
