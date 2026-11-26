import { describe, expect, it } from 'vitest';
import { appendHistory, createHistoryEntry, filterHistory, historySummary } from './history';

describe('simulation history', () => {
  it('creates and appends typed entries', () => {
    const entry = createHistoryEntry('event', 'Event fired', 'b1', 2, 4, 'detail', 'warning');
    const history = appendHistory([], entry);
    expect(history).toHaveLength(1);
    expect(history[0]?.severity).toBe('warning');
  });

  it('filters by kind, branch, step and query', () => {
    const history = [
      createHistoryEntry('event', 'Market shock', 'b1', 2, 2),
      createHistoryEntry('step', 'Transition', 'b2', 3, 3),
    ];
    expect(filterHistory(history, { kind: 'event' })).toHaveLength(1);
    expect(filterHistory(history, { branchId: 'b2' })).toHaveLength(1);
    expect(filterHistory(history, { sinceStep: 3 })).toHaveLength(1);
    expect(filterHistory(history, { query: 'shock' })).toHaveLength(1);
  });

  it('summarizes entry kinds', () => {
    const history = [createHistoryEntry('event', 'a', 'b', 0, 0), createHistoryEntry('event', 'b', 'b', 1, 1)];
    expect(historySummary(history).event).toBe(2);
  });
});
