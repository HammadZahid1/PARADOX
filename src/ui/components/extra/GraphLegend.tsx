export type RelationSign = 'positive' | 'negative';
export type RelationStrength = 'weak' | 'medium' | 'strong';

export interface GraphLegendItem {
  label: string;
  sign: RelationSign;
  strength: RelationStrength;
}

const strokes: Record<RelationSign, string> = { positive: '#3ddbd9', negative: '#e25656' };
const strokeWidths: Record<RelationStrength, number> = { weak: 1, medium: 1.5, strong: 2.5 };
const signs: Record<RelationSign, string> = { positive: '+', negative: '−' };

export function GraphLegend({ items, label = 'Causal relations', className = '' }: { items: readonly GraphLegendItem[]; label?: string; className?: string }) {
  return (
    <ul aria-label={label} className={`flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-chalk/80 ${className}`}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <svg width={24} height={8} viewBox="0 0 24 8" aria-hidden="true" className="shrink-0">
            <line x1={1} y1={4} x2={23} y2={4} stroke={strokes[item.sign]} strokeWidth={strokeWidths[item.strength]} />
          </svg>
          <span>{item.label}</span>
          <span className="text-muted">{signs[item.sign]} {item.strength}</span>
        </li>
      ))}
    </ul>
  );
}
