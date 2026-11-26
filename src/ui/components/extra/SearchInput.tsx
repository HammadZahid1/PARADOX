import { useId } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ label, value, onChange, placeholder = 'Search…', className = '' }: SearchInputProps) {
  const id = useId();
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</label>
      <div className="flex items-center gap-1 border border-line/70 bg-carbon/60 px-2">
        <Search size={13} className="shrink-0 text-muted" aria-hidden="true" />
        <input
          id={id}
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 min-w-0 flex-1 bg-transparent font-mono text-xs text-chalk outline-none placeholder:text-muted/60"
        />
        {value.length > 0 && (
          <button type="button" aria-label={`Clear ${label}`} onClick={() => onChange('')} className="text-muted hover:text-cyan">
            <X size={13} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
