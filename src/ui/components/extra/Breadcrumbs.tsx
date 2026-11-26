import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, label = 'Breadcrumb', className = '' }: { items: readonly BreadcrumbItem[]; label?: string; className?: string }) {
  return (
    <nav aria-label={label} className={`flex min-w-0 items-center ${className}`}>
      <ol className="flex min-w-0 items-center gap-1 font-mono text-[10px]">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight size={12} className="shrink-0 text-muted/60" aria-hidden="true" />}
              {item.href && !isCurrent ? (
                <a href={item.href} className="text-muted hover:text-cyan">{item.label}</a>
              ) : (
                <span aria-current={isCurrent ? 'page' : undefined} className={isCurrent ? 'text-chalk' : 'text-muted'}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
