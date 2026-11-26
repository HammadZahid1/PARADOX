import type { WorldState } from '@/engine/types';
import { stateChecksum } from './checksum';

function normalizePatience(patience: number): number {
  return Number.isFinite(patience) && patience > 0 ? Math.max(1, Math.floor(patience)) : 1;
}

/**
 * Idle when the last `patience` fingerprints are identical. The default window
 * is three observations, so a single transient change resets the detector.
 */
export function isIdle(fingerprints: readonly string[], patience = 3): boolean {
  const window = normalizePatience(patience);
  if (fingerprints.length < window) return false;
  const first = fingerprints[fingerprints.length - window];
  return first !== undefined && fingerprints.slice(-window).every((item) => item === first);
}

export class IdleDetector {
  readonly patience: number;
  private readonly recent: string[] = [];

  constructor(patience = 3) {
    this.patience = normalizePatience(patience);
  }

  get length(): number {
    return this.recent.length;
  }

  get fingerprints(): readonly string[] {
    return [...this.recent];
  }

  get idle(): boolean {
    return isIdle(this.recent, this.patience);
  }

  /** Add a fingerprint and return whether the detector is now idle. */
  observe(fingerprint: string): boolean {
    this.recent.push(fingerprint);
    if (this.recent.length > this.patience) this.recent.shift();
    return this.idle;
  }

  observeState(state: WorldState): boolean {
    return this.observe(String(stateChecksum(state)));
  }

  reset(): this {
    this.recent.length = 0;
    return this;
  }
}

export function createIdleDetector(patience = 3): IdleDetector {
  return new IdleDetector(patience);
}
