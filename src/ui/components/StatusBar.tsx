import { useParadox } from '@/state/store';

export function StatusBar() {
  const engine = useParadox((state) => state.engine);
  const revision = useParadox((state) => state.revision);
  const branch = engine?.activeBranch;
  const variables = Object.keys(branch?.currentState.variables ?? {}).length;
  const events = branch?.currentState.eventHistory.length ?? 0;
  return (
    <footer className="flex h-7 shrink-0 items-center justify-between gap-4 border-t border-line/70 bg-graphite/80 px-3 font-mono text-[10px] text-muted">
      <div className="flex gap-4">
        <span>BRANCH <span className="text-cyan">{branch?.name ?? '—'}</span></span>
        <span className="hidden sm:inline">VARIABLES <span className="text-chalk/80">{variables}</span></span>
        <span className="hidden md:inline">EVENTS <span className="text-chalk/80">{events}</span></span>
        <span className="hidden lg:inline">REV <span className="text-chalk/80">{revision}</span></span>
      </div>
      <div className="flex gap-3">
        <span className="hidden md:inline">SEED <span className="text-chalk/80">{engine?.activeBranch.seed ?? '—'}</span></span>
        <span className="text-emerald-300/80">ENGINE ONLINE</span>
      </div>
    </footer>
  );
}
