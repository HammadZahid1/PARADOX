export interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  hint?: string;
  className?: string;
}

export function ProgressBar({ label, value, max = 100, hint, className = '' }: ProgressBarProps) {
  const upper = Number.isFinite(max) && max > 0 ? max : 100;
  const raw = Number.isFinite(value) ? value : 0;
  const current = Math.min(upper, Math.max(0, raw));
  const percent = (current / upper) * 100;

  return (
    <div className={`min-w-0 ${className}`}>
      <div className="mb-1 flex items-baseline justify-between gap-2 font-mono text-[10px]">
        <span className="text-muted">{label}</span>
        <span className="text-cyan">{Math.round(current)}/{upper}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={upper}
        aria-valuenow={current}
        aria-valuetext={`${Math.round(percent)}%`}
        className="h-1.5 w-full border border-line/70 bg-white/5"
      >
        <div className="h-full bg-cyan transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      {hint && <p className="mt-1 truncate text-[10px] text-muted">{hint}</p>}
    </div>
  );
}
