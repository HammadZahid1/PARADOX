import { useMemo, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { line, curveMonotoneX } from 'd3-shape';

export interface Series { key: string; color: string; points: Array<{ x: number; y: number }> }

export function LineChart({ series, height = 220, label = 'Variable trajectories' }: { series: readonly Series[]; height?: number; label?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 720;
  const plot = useMemo(() => {
    const all = series.flatMap((item) => item.points);
    if (all.length === 0) return null;
    const x = scaleLinear().domain([Math.min(...all.map((point) => point.x)), Math.max(...all.map((point) => point.x)) || 1]).range([36, width - 12]);
    const y = scaleLinear().domain([Math.min(...all.map((point) => point.y)), Math.max(...all.map((point) => point.y)) || 1]).range([height - 24, 12]);
    return { x, y };
  }, [series, height]);

  if (!plot) return <div className="flex h-full items-center justify-center text-xs text-muted">No data available</div>;
  const steps = series[0]?.points.map((point) => point.x) ?? [];
  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = 12 + fraction * (height - 36);
          return <line key={fraction} x1={36} x2={width - 12} y1={y} y2={y} stroke="#252d38" strokeWidth={0.5} />;
        })}
        {series.map((item) => {
          const path = line<{ x: number; y: number }>().x((point) => plot.x(point.x)).y((point) => plot.y(point.y)).curve(curveMonotoneX)(item.points) ?? '';
          return <path key={item.key} d={path} fill="none" stroke={item.color} strokeWidth={1.6} />;
        })}
        {hover !== null && (
          <g>
            <line x1={plot.x(hover)} x2={plot.x(hover)} y1={12} y2={height - 24} stroke="#7d8896" strokeDasharray="3 3" strokeWidth={0.7} />
            {series.map((item) => {
              const point = item.points.find((candidate) => candidate.x === hover);
              return point ? <circle key={item.key} cx={plot.x(point.x)} cy={plot.y(point.y)} r={3} fill={item.color} /> : null;
            })}
          </g>
        )}
        {steps.map((step, index) => (
          <rect key={step} x={plot.x(step) - 5} y={0} width={10} height={height} fill="transparent" onMouseEnter={() => setHover(step)} data-index={index} />
        ))}
        <text x={36} y={height - 6} fill="#7d8896" fontSize={9}>{steps[0] ?? 0}</text>
        <text x={width - 12} y={height - 6} textAnchor="end" fill="#7d8896" fontSize={9}>{steps.at(-1) ?? 0}</text>
      </svg>
      <div className="flex flex-wrap gap-3 px-3 pb-2">
        {series.map((item) => <span key={item.key} className="flex items-center gap-1.5 font-mono text-[10px] text-muted"><i className="h-1.5 w-4" style={{ background: item.color }} />{item.key}</span>)}
      </div>
      {hover !== null && <div className="px-3 font-mono text-[10px] text-cyan">Step {hover}</div>}
    </div>
  );
}
