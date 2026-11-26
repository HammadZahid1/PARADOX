import { describe, expect, it } from 'vitest';
import type { HistoryEntry, Scenario } from '@/engine/types';
import { ParadoxRepository } from './repository';
import { MemoryStorageAdapter } from './storage';

const scenario: Scenario = {
  id: 's1',
  name: 'Economy',
  description: '',
  domain: 'economics',
  worldId: 'w1',
  variables: [{ id: 'v1', key: 'growth', name: 'Growth', type: 'number', initial: 1 }],
  parameters: {},
  rules: [],
  events: [],
  configuration: {
    stepDuration: 1,
    maxSteps: 10,
    seed: 7,
    mode: 'deterministic',
    propagationLimit: 8,
    autoSnapshotSteps: 5,
    strictValidation: true,
  },
  objectives: [],
  tags: [],
  preset: false,
  createdAt: 0,
  updatedAt: 0,
  version: 1,
};

function historyEntry(id: string, timestamp: number): HistoryEntry {
  return { id, kind: 'step', summary: 'Advanced', step: 1, time: 1, timestamp, branchId: 'b1' };
}

describe('ParadoxRepository', () => {
  it('validates scenarios and stores cloned records', async () => {
    const repository = new ParadoxRepository(new MemoryStorageAdapter('repo:'));

    expect((await repository.saveScenario(scenario)).valid).toBe(true);
    expect(await repository.getScenarios()).toEqual([scenario]);

    scenario.name = 'Mutated after save';
    expect((await repository.getScenarios())[0]?.name).toBe('Economy');

    const invalid = { ...scenario, configuration: { ...scenario.configuration, maxSteps: 0 } };
    const result = await repository.saveScenario(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.path).toBe('configuration.maxSteps');
    expect(await repository.getScenarios()).toHaveLength(1);
  });

  it('orders history deterministically and round-trips metadata', async () => {
    const repository = new ParadoxRepository(new MemoryStorageAdapter('repo:'));

    await repository.appendHistory(historyEntry('later', 20));
    await repository.appendHistory(historyEntry('earlier', 10));

    expect((await repository.getHistory('b1')).map((entry) => entry.id)).toEqual(['earlier', 'later']);
    expect(await repository.getHistory('other')).toEqual([]);

    expect((await repository.setMeta('last-open', { scenarioId: 's1' })).valid).toBe(true);
    expect(await repository.getMeta<{ scenarioId: string }>('last-open')).toEqual({ scenarioId: 's1' });
    expect(await repository.getMeta('missing')).toBeNull();
  });
});
