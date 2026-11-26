import { describe, expect, it } from 'vitest';
import {
  clearQueryHistory,
  createQueryHistory,
  listQueryHistory,
  normalizeHistoryQuery,
  queryHistoryRank,
  recordQuery,
  type QueryHistoryState,
} from './queryHistory';

describe('query history', () => {
  it('normalizes and deduplicates queries with most-recent-first order', () => {
    let history = createQueryHistory();
    history = recordQuery(history, '  CLIMATE   Model ');
    history = recordQuery(history, 'climate model');
    history = recordQuery(history, 'ÉNERGIE');
    expect(listQueryHistory(history)).toEqual(['énergie', 'climate model']);
    expect(queryHistoryRank(history, 'ÉNERGIE')).toBe(2);
    expect(queryHistoryRank(history, 'missing')).toBe(0);
  });

  it('enforces the configured bound', () => {
    let history = createQueryHistory();
    for (const query of ['a', 'b', 'c']) history = recordQuery(history, query, 2);
    expect(listQueryHistory(history)).toEqual(['c', 'b']);
    expect(recordQuery(history, 'd', 0).entries).toEqual(['c', 'b']);
  });

  it('ignores malformed history state and queries', () => {
    expect(normalizeHistoryQuery(42)).toBe('');
    expect(recordQuery('bad' as unknown as QueryHistoryState, null).entries).toEqual([]);
    const malformed = { entries: [' A ', 'a', 42, ''] } as unknown as QueryHistoryState;
    expect(listQueryHistory(malformed)).toEqual(['a']);
    expect(recordQuery(malformed, ' B ').entries).toEqual(['b', 'a']);
  });

  it('returns defensive copies and clears to an empty state', () => {
    const history = recordQuery(createQueryHistory(), 'climate');
    const copy = listQueryHistory(history);
    copy.push('mutated');
    expect(listQueryHistory(history)).toEqual(['climate']);
    expect(clearQueryHistory()).toEqual(createQueryHistory());
  });
});
