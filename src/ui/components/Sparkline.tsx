import { line, curveMonotoneX } from 'd3-shape';

export function Sparkline({ values, color = '#3ddbd9', height = 32, width = 120 }: { values: readonly number[]; color?: string; height?: number; width?: number }) {
  if (values.length < 2) return <svg width={width} height={height} aria-label="No trajectory data" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => [index / (values.length - 1) * width, height - ((value - min) / span) * (height - 4) - 2] as [number, number]);
  const path = line<[number, number]>().x((point) => point[0]).y((point) => point[1]).curve(curveMonotoneX)(points) ?? '';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Trend from ${values[0]?.toFixed(2)} to ${values.at(-1)?.toFixed(2)}`}>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
      <circle cx={points.at(-1)?.[0]} cy={points.at(-1)?.[1]} r={2} fill={color} />
    </svg>
  );
}
