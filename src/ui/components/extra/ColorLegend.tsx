export interface ColorLegendItem {
  label: string;
  color: string;
}

export function ColorLegend({ items, className = '' }: { items: readonly ColorLegendItem[]; className?: string }) {
  return (
    <ul aria-label="Color legend" className={`flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted ${className}`}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 border border-white/10" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
