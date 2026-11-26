export interface HistogramBin { binStart: number; binEnd: number; count: number }

export function Histogram({ bins, height = 180, color = '#3b82f6' }: { bins: readonly HistogramBin[]; height?: number; color?: string }) {
  if (bins.length === 0) return <div className="flex h-full items-center justify-center text-xs text-muted">No distribution data</div>;
  const max = Math.max(...bins.map((bin) => bin.count), 1);
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-end gap-px" role="img" aria-label="Outcome distribution histogram">
        {bins.map((bin, index) => (
          <div key={index} className="group relative flex-1" title={`${bin.binStart.toFixed(2)}–${bin.binEnd.toFixed(2)}: ${bin.count}`}>
            <div className="w-full transition-all group-hover:brightness-125" style={{ height: `${Math.max(1, (bin.count / max) * (height - 24))}px`, background: color, opacity: 0.65 + (bin.count / max) * 0.35 }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between pt-1 font-mono text-[9px] text-muted">
        <span>{bins[0]?.binStart.toFixed(2)}</span>
        <span>{bins.at(-1)?.binEnd.toFixed(2)}</span>
      </div>
    </div>
  );
}
