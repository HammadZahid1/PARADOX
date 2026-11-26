import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export interface CollapsibleProps {
  title: string;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function Collapsible({ title, children, open, defaultOpen = false, onOpenChange, className = '' }: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  const regionId = useId();

  const toggle = (): void => {
    const next = !isOpen;
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div className={`border border-line/60 bg-graphite/40 ${className}`}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={regionId}
        onClick={toggle}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left font-mono text-[11px] text-chalk/80 hover:text-cyan"
      >
        <ChevronRight size={13} aria-hidden="true" className={`shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        {title}
      </button>
      <div id={regionId} role="region" aria-label={title} hidden={!isOpen} className="border-t border-line/60 px-2 py-2 text-xs text-muted">
        {children}
      </div>
    </div>
  );
}
