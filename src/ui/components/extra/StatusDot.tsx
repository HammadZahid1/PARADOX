export type StatusKind = 'idle' | 'active' | 'success' | 'warning' | 'error';

const dotTones: Record<StatusKind, string> = {
  idle: 'bg-muted',
  active: 'bg-cyan',
  success: 'bg-emerald-400',
  warning: 'bg-amber',
  error: 'bg-danger',
};

export function StatusDot({ status, label, className = '' }: { status: StatusKind; label?: string; className?: string }) {
  const text = label ?? status;
  return (
    <span role="status" aria-label={text} className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted ${className}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotTones[status]}`} />
      <span>{text}</span>
    </span>
  );
}
