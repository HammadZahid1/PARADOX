import { describe, expect, it } from 'vitest';
import {
  clearRecentCommands,
  createRecentCommands,
  normalizeCommandId,
  recentBoost,
  recentCommandIndex,
  recentCommandsList,
  recordCommand,
  type RecentCommandState,
} from './recentCommands';

describe('recent commands', () => {
  it('promotes repeats to a stable LRU order', () => {
    let state = createRecentCommands();
    state = recordCommand(state, 'new-scenario');
    state = recordCommand(state, 'close-view');
    state = recordCommand(state, 'run-simulation');
    state = recordCommand(state, 'New Scenario');
    expect(recentCommandsList(state)).toEqual(['new-scenario', 'run-simulation', 'close-view']);
    expect(state.clock).toBe(4);
  });

  it('evicts oldest ids at the configured bound', () => {
    let state = createRecentCommands();
    for (const id of ['a', 'b', 'c']) state = recordCommand(state, id, 2);
    expect(recentCommandsList(state)).toEqual(['c', 'b']);
    expect(recordCommand(state, 'c', 0).ids).toEqual([]);
  });

  it('returns stable ranking boosts without wall-clock data', () => {
    let state = createRecentCommands();
    for (const id of ['a', 'b', 'c']) state = recordCommand(state, id);
    expect(recentBoost(state, 'c')).toBe(0.05);
    expect(recentBoost(state, 'b')).toBeCloseTo(0.04375, 5);
    expect(recentBoost(state, 'a')).toBeCloseTo(0.0375, 5);
    expect(recentBoost(state, 'missing')).toBe(0);
    expect(recentBoost(state, 'a')).toBe(recentBoost(state, 'a'));
  });

  it('normalizes ids and sanitizes malformed state', () => {
    expect(normalizeCommandId('  New   Scenario ')).toBe('new-scenario');
    expect(recordCommand('bad' as unknown as RecentCommandState, null).ids).toEqual([]);
    const malformed = { ids: [' A ', 'a', 42, ''], clock: -5 } as unknown as RecentCommandState;
    expect(recentCommandsList(malformed)).toEqual(['a']);
    expect(recordCommand(malformed, 'B').ids).toEqual(['b', 'a']);
    expect(recentCommandIndex(malformed, 'A')).toBe(0);
  });

  it('does not mutate prior state', () => {
    const original = createRecentCommands();
    const next = recordCommand(original, 'step');
    expect(original.ids).toEqual([]);
    expect(next.ids).toEqual(['step']);
    expect(clearRecentCommands()).toEqual(createRecentCommands());
  });
});
