import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/engine/core/state';
import type { WorldState } from '@/engine/types';
import { stateChecksum } from './checksum';
import { createIdleDetector, IdleDetector, isIdle } from './idle';

const currentState = (value: number): WorldState => ({
  ...createInitialState({ definitions: [], seed: 1 }),
  variables: { population: value },
});

describe('idle detection', () => {
  it('requires a full patience window of identical fingerprints', () => {
    expect(isIdle(['a', 'a'], 3)).toBe(false);
    expect(isIdle(['a', 'a', 'a'], 3)).toBe(true);
    expect(isIdle(['b', 'a', 'a'], 3)).toBe(false);
    expect(isIdle(['a'], 1)).toBe(true);
  });

  it('tracks only the most recent fingerprints', () => {
    const detector = createIdleDetector(2);
    expect(detector.observe('a')).toBe(false);
    expect(detector.observe('a')).toBe(true);
    expect(detector.observe('b')).toBe(false);
    expect(detector.fingerprints).toEqual(['a', 'b']);
    expect(detector.observe('b')).toBe(true);
    expect(detector.length).toBe(2);
    expect(detector.idle).toBe(true);
    expect(detector.reset().idle).toBe(false);
  });

  it('observes real world states through their checksums', () => {
    const detector: IdleDetector = new IdleDetector(2);
    const state = currentState(10);
    expect(detector.observeState(state)).toBe(false);
    expect(detector.observeState({ ...state })).toBe(true);
    expect(detector.fingerprints[0]).toBe(String(stateChecksum(state)));
    expect(detector.observeState(currentState(11))).toBe(false);
  });

  it('falls back to a patience of one for invalid values', () => {
    expect(isIdle([], Number.NaN)).toBe(false);
    expect(isIdle(['x'], -3)).toBe(true);
    expect(new IdleDetector(0).patience).toBe(1);
  });
});
