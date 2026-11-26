import { SeededRandom } from '@/engine/random/rng';
import { hashString } from '@/utils/id';

/** Named stream seeds depend only on the master seed and name, never registration order. */
export function deriveStreamSeed(masterSeed: number, name: string): number {
  const seed = Number.isFinite(masterSeed) ? Math.trunc(masterSeed) : 0;
  return hashString(`${seed >>> 0}:${name}`);
}

export class NamedStreams {
  readonly masterSeed: number;
  private readonly declared = new Set<string>();

  constructor(masterSeed: number, names: readonly string[] = []) {
    this.masterSeed = Number.isFinite(masterSeed) ? Math.trunc(masterSeed) : 0;
    for (const name of names) this.declared.add(name);
  }

  /** Sorted for stable enumeration regardless of insertion order. */
  get names(): readonly string[] {
    return [...this.declared].sort((left, right) => left.localeCompare(right));
  }

  has(name: string): boolean {
    return this.declared.has(name);
  }

  register(name: string): SeededRandom {
    this.declared.add(name);
    return this.create(name);
  }

  /** A fresh generator per call, so consumers cannot disturb each other. */
  create(name: string): SeededRandom {
    return new SeededRandom(deriveStreamSeed(this.masterSeed, name));
  }
}

export function createStreams(masterSeed: number, names: readonly string[] = []): NamedStreams {
  return new NamedStreams(masterSeed, names);
}
