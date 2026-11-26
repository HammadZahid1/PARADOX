import type { ReactNode } from 'react';

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap border border-line bg-void px-2 py-1 font-mono text-[10px] text-chalk opacity-0 shadow-panel transition-opacity group-hover/tt:opacity-100 group-focus-within/tt:opacity-100">
        {label}
      </span>
    </span>
  );
}
