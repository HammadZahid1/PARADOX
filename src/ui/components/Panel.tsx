import type { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  borderless?: boolean;
}

export function Panel({ title, subtitle, actions, children, className = '', bodyClassName = '', borderless = false }: PanelProps) {
  return (
    <section className={`flex min-h-0 flex-col ${borderless ? '' : 'border border-line/70 bg-carbon/60'} ${className}`} aria-label={title}>
      {(title || actions) && (
        <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-line/70 px-3">
          <div className="min-w-0">
            {title && <h2 className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-chalk/90">{title}</h2>}
            {subtitle && <p className="truncate text-[10px] text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className={`min-h-0 flex-1 overflow-auto ${bodyClassName}`}>{children}</div>
    </section>
  );
}
