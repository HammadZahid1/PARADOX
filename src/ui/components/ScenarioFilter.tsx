import { Filter, Search } from 'lucide-react';

export interface ScenarioFilterProps {
  query: string;
  domain: string;
  domains: readonly string[];
  resultCount: number;
  totalCount: number;
  onQueryChange: (value: string) => void;
  onDomainChange: (value: string) => void;
}

export function ScenarioFilter({
  query,
  domain,
  domains,
  resultCount,
  totalCount,
  onQueryChange,
  onDomainChange,
}: ScenarioFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line/40 pb-3 text-xs">
      <label className="relative min-w-[12rem] flex-1">
        <span className="sr-only">Filter scenarios</span>
        <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Filter by name, id or tag"
          className="w-full rounded border border-line/60 bg-graphite/60 py-1.5 pl-7 pr-2 text-chalk placeholder:text-muted focus:border-cyan focus:outline-none"
        />
      </label>
      <label className="flex items-center gap-1.5">
        <span className="sr-only">Filter by domain</span>
        <Filter size={13} className="text-muted" />
        <select
          value={domain}
          onChange={(event) => onDomainChange(event.target.value)}
          className="rounded border border-line/60 bg-graphite/60 px-2 py-1.5 text-chalk focus:border-cyan focus:outline-none"
        >
          <option value="all">All domains</option>
          {domains.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>
      <output className="font-mono text-[10px] text-muted" aria-live="polite">
        {resultCount}/{totalCount} scenarios
      </output>
    </div>
  );
}
