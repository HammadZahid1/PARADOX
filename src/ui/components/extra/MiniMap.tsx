export interface MiniMapPoint {
  x: number;
  y: number;
}

export interface MiniMapViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function MiniMap({ points, viewport, width = 160, height = 100, label = 'Minimap', className = '' }: { points: readonly MiniMapPoint[]; viewport: MiniMapViewport; width?: number; height?: number; label?: string; className?: string }) {
  return (
    <svg
      role="img"
      aria-label={`${label}, ${points.length} points`}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={`border border-line/60 bg-carbon/60 ${className}`}
    >
      <rect
        x={clamp01(viewport.x) * width}
        y={clamp01(viewport.y) * height}
        width={clamp01(viewport.width) * width}
        height={clamp01(viewport.height) * height}
        fill="rgba(61, 219, 217, 0.08)"
        stroke="#3ddbd9"
        strokeWidth={1}
      />
      {points.map((point, index) => (
        <circle key={index} cx={clamp01(point.x) * width} cy={clamp01(point.y) * height} r={2} fill="#8b7cf6" />
      ))}
    </svg>
  );
}
