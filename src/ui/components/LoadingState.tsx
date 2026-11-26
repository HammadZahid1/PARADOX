export function LoadingState({ label = 'Loading view' }: { label?: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted" role="status" aria-live="polite">
      <span className="h-2 w-2 animate-pulse bg-cyan shadow-glow" />
      {label}
    </div>
  );
}
