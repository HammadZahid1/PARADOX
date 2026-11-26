import { describe, expect, it } from 'vitest';
import { SeededRandom } from './rng';

describe('seeded random generator', () => {
  it('reproduces identical streams from identical seeds', () => {
    const a = new SeededRandom(42);
    const b = new SeededRandom(42);
    const first = Array.from({ length: 100 }, () => a.next());
    const second = Array.from({ length: 100 }, () => b.next());
    expect(first).toEqual(second);
  });

  it('produces different streams for different seeds', () => {
    const a = Array.from({ length: 10 }, (_, i) => new SeededRandom(1).next() + i);
    const b = Array.from({ length: 10 }, (_, i) => new SeededRandom(2).next() + i);
    expect(a).not.toEqual(b);
  });

  it('supports integer ranges, chance and state save/restore', () => {
    const rng = new SeededRandom(7);
    expect(rng.int(3, 3)).toBe(3);
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
    const state = rng.getState();
    const stream = Array.from({ length: 5 }, () => rng.next());
    rng.int(0, 100);
    rng.setState(state);
    expect(Array.from({ length: 5 }, () => rng.next())).toEqual(stream);
  });

  it('creates independent labelled forks', () => {
    const parent = new SeededRandom(99);
    const eventStream = Array.from({ length: 5 }, () => parent.fork('events').next());
    expect(new Set(eventStream).size).toBe(1);
    expect(parent.fork('events').next()).not.toBe(parent.fork('causal').next());
  });
});
