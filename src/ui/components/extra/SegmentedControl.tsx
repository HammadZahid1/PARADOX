import type { ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function SegmentedControl<T extends string>({ options, value, onChange, label, className = '' }: { options: readonly SegmentedOption<T>[]; value: T; onChange: (value: T) => void; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={`inline-flex border border-line/70 bg-graphite/50 p-0.5 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] transition-colors ${option.value === value ? 'bg-cyan/15 text-cyan' : 'text-muted hover:text-chalk'}`}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
