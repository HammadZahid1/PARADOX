import { useEffect } from 'react';
import { useParadox } from '@/state/store';

/** Drives the simulation clock while play mode is active. */
export function usePlayback(): void {
  const isPlaying = useParadox((state) => state.isPlaying);
  const speed = useParadox((state) => state.speed);
  const tick = useParadox((state) => state.tick);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const interval = window.setInterval(tick, Math.max(80, Math.round(900 / speed)));
    return () => window.clearInterval(interval);
  }, [isPlaying, speed, tick]);
}
