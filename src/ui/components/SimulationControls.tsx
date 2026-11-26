import { FastForward, Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import { useParadox } from '@/state/store';
import { Button } from './Button';
import { Slider } from './Slider';

export function SimulationControls() {
  const engine = useParadox((state) => state.engine);
  const isPlaying = useParadox((state) => state.isPlaying);
  const speed = useParadox((state) => state.speed);
  const play = useParadox((state) => state.play);
  const pause = useParadox((state) => state.pause);
  const step = useParadox((state) => state.stepForward);
  const runBatch = useParadox((state) => state.runBatch);
  const reset = useParadox((state) => state.reset);
  const setSpeed = useParadox((state) => state.setSpeed);
  const config = engine?.scenario.configuration;
  const state = engine?.activeBranch.currentState;

  return (
    <div className="space-y-4 p-3">
      <div className="grid grid-cols-4 gap-1.5">
        <Button onClick={isPlaying ? pause : play} disabled={!engine} variant={isPlaying ? 'outline' : 'accent'} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}{isPlaying ? 'Pause' : 'Play'}
        </Button>
        <Button onClick={step} disabled={!engine} aria-label="Step"><StepForward size={14} />Step</Button>
        <Button onClick={() => runBatch(10)} disabled={!engine} aria-label="Fast forward"><FastForward size={14} />+10</Button>
        <Button onClick={reset} disabled={!engine} aria-label="Reset"><RotateCcw size={14} />Reset</Button>
      </div>
      <Slider label="Simulation speed" value={speed} min={0.25} max={8} step={0.25} onChange={setSpeed} unit="×" />
      <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-muted">
        <div className="border border-line/60 px-2 py-1.5">TIME <span className="ml-2 text-chalk">{state?.time.toFixed(1) ?? '—'}</span></div>
        <div className="border border-line/60 px-2 py-1.5">STEP <span className="ml-2 text-chalk">{state?.step ?? 0}/{config?.maxSteps ?? 0}</span></div>
        <div className="border border-line/60 px-2 py-1.5">MODE <span className="ml-2 text-chalk">{config?.mode ?? '—'}</span></div>
        <div className="border border-line/60 px-2 py-1.5">SEED <span className="ml-2 text-chalk">{state?.seed ?? '—'}</span></div>
      </div>
    </div>
  );
}
