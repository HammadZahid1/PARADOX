import type { ReactNode } from 'react';

export function Kbd({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={`inline-flex min-w-[1.5rem] items-center justify-center border border-line/80 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted ${className}`}>
      {children}
    </kbd>
  );
}
