export interface TimelineRulerProps {
  steps: number;
  labels?: readonly string[];
  width?: number;
  height?: number;
  label?: string;
  className?: string;
}

export function TimelineRuler({ steps, labels, width = 240, height = 28, label = 'Timeline', className = '' }: TimelineRulerProps) {
  const count = Number.isFinite(steps) ? Math.max(0, Math.floor(steps)) : 0;
  const padding = 6;
  const usableWidth = Math.max(0, width - padding * 2);
  const baselineY = height - 10;
  const tickX = (step: number): number => padding + (count === 0 ? 0 : (step / count) * usableWidth);

  return (
    <svg
      role="img"
      aria-label={`${label}, ${count} steps`}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={`overflow-visible ${className}`}
    >
      <line x1={padding} y1={baselineY} x2={width - padding} y2={baselineY} stroke="#252d38" strokeWidth={1} />
      {Array.from({ length: count + 1 }, (_, step) => (
        <g key={step}>
          <line x1={tickX(step)} y1={baselineY - 4} x2={tickX(step)} y2={baselineY + 4} stroke="#7d8896" strokeWidth={1} />
          <text x={tickX(step)} y={height - 1} textAnchor="middle" fill="#7d8896" fontSize={8} fontFamily="monospace">
            {labels?.[step] ?? String(step)}
          </text>
        </g>
      ))}
    </svg>
  );
}
