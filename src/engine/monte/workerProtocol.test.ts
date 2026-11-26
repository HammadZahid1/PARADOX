import { describe, expect, it } from 'vitest';
import type { MonteCarloRequest, MonteCarloResult } from '@/engine/types';
import { createInitialState } from '@/engine/core/state';
import { computeDistributionStatistics } from './statistics';
import {
  isMonteWorkerMessage,
  type MonteWorkerMessage,
  type MonteWorkerProgress,
  type MonteWorkerRequest,
  type MonteWorkerResponse,
} from './workerProtocol';

const request: MonteCarloRequest = {
  scenarioId: 'scenario-1',
  runs: 2,
  baseSeed: 11,
  maxSteps: 4,
  variableKey: 'population',
};

function result(): MonteCarloResult {
  const state = createInitialState({ definitions: [], seed: 1 });
  return {
    request,
    statistics: computeDistributionStatistics([1, 2]),
    values: [1, 2],
    runs: [{
      seed: 1,
      finalState: state,
      timeline: { id: 'tl', branchId: 'b', entries: [], snapshots: [], events: [] },
    }],
    elapsedMs: 1,
    cancelled: false,
  };
}

describe('isMonteWorkerMessage', () => {
  it('accepts and narrows request, progress, result and error messages', () => {
    const messages: MonteWorkerMessage[] = [
      { type: 'monte:run', requestId: 'r1', request },
      { type: 'monte:progress', requestId: 'r1', completed: 1, total: 2, runIndex: 0, seed: 9, value: 3, cancelled: false },
      { type: 'monte:result', requestId: 'r1', result: result() },
      { type: 'monte:error', requestId: 'r1', error: 'boom' },
    ];
    for (const message of messages) expect(isMonteWorkerMessage(message)).toBe(true);

    const requestMessage = messages[0] as MonteWorkerRequest;
    const progressMessage = messages[1] as MonteWorkerProgress;
    const responseMessages = messages.slice(2) as MonteWorkerResponse[];
    expect(requestMessage.request.variableKey).toBe('population');
    expect(progressMessage.completed).toBe(1);
    expect(responseMessages.map((message) => message.type)).toEqual(['monte:result', 'monte:error']);
  });

  it('rejects unknown types, missing ids and malformed payloads', () => {
    const invalid: unknown[] = [
      { type: 'monte:unknown', requestId: 'r1' },
      { type: 'monte:run', request: { ...request, runs: -1 } },
      { type: 'monte:run', requestId: 'r1', request: { ...request, variableKey: 5 } },
      { type: 'monte:progress', requestId: 'r1', completed: 1, total: 2, runIndex: 0, seed: 9, value: 3, cancelled: 'no' },
      { type: 'monte:result', requestId: 'r1', result: { ...result(), statistics: { count: 2 } } },
      { type: 'monte:error', requestId: 'r1', error: 42 },
    ];
    for (const message of invalid) expect(isMonteWorkerMessage(message)).toBe(false);
  });

  it('rejects primitives, arrays and null', () => {
    for (const value of [null, undefined, 7, 'monte:run', [], [request]]) {
      expect(isMonteWorkerMessage(value)).toBe(false);
    }
  });
});
