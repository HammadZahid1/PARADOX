import { Command, Download, Menu, Pause, Play, RotateCcw, SkipForward, Upload } from 'lucide-react';
import { useParadox } from '@/state/store';
import { Button } from './Button';
import { Tooltip } from './Tooltip';

export function TopBar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const engine = useParadox((state) => state.engine);
  const isPlaying = useParadox((state) => state.isPlaying);
  const view = useParadox((state) => state.view);
  const play = useParadox((state) => state.play);
  const pause = useParadox((state) => state.pause);
  const stepForward = useParadox((state) => state.stepForward);
  const reset = useParadox((state) => state.reset);
  const setCommandOpen = useParadox((state) => state.setCommandOpen);
  const openModal = useParadox((state) => state.openModal);
  const setSearchOpen = useParadox((state) => state.setSearchOpen);
  const step = engine?.activeBranch.currentState.step ?? 0;
  const status = engine?.activeBranch.status ?? 'idle';

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line/70 bg-graphite/80 px-3">
      <div className="flex min-w-0 items-center gap-3">
        <Button onClick={onToggleSidebar} aria-label="Toggle navigation"><Menu size={15} /></Button>
        <div className="hidden min-w-0 sm:block">
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{engine?.scenario.domain ?? 'no scenario'}</p>
          <p className="truncate text-xs text-chalk">{engine?.scenario.name ?? 'PARADOX laboratory'}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted md:inline">{view}</span>
        <span className="border border-line px-2 py-1 font-mono text-[10px] text-cyan">STEP {String(step).padStart(3, '0')}</span>
        <span className="hidden font-mono text-[10px] uppercase text-muted lg:inline">{status}</span>
        <Tooltip label="Search workspace"><Button onClick={() => setSearchOpen(true)} aria-label="Search workspace"><span className="font-mono text-xs">/</span></Button></Tooltip>
        <Tooltip label="Import local data"><Button onClick={() => openModal({ kind: 'import' })} aria-label="Import local data"><Upload size={14} /></Button></Tooltip>
        <Tooltip label="Export local data"><Button onClick={() => openModal({ kind: 'export' })} aria-label="Export local data"><Download size={14} /></Button></Tooltip>
        <Tooltip label="Step forward"><Button onClick={stepForward} disabled={!engine} aria-label="Step forward"><SkipForward size={14} /></Button></Tooltip>
        <Tooltip label={isPlaying ? 'Pause' : 'Play'}>
          <Button onClick={isPlaying ? pause : play} disabled={!engine} variant="solid" aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}>
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </Button>
        </Tooltip>
        <Tooltip label="Reset"><Button onClick={reset} disabled={!engine} aria-label="Reset simulation"><RotateCcw size={14} /></Button></Tooltip>
        <Button onClick={() => setCommandOpen(true)} aria-label="Open command palette"><Command size={14} /><span className="hidden lg:inline">Ctrl K</span></Button>
      </div>
    </header>
  );
}
