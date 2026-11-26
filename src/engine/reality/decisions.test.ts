import { describe, expect, it } from 'vitest';
import type { VariableDefinition } from '@/engine/types';
import { SeededRandom } from '@/engine/random/rng';
import { createInitialState } from '@/engine/core/state';
import { createReality } from './branch';
import { branchFromDecision, createDecision, createDecisionAlternative, selectAlternative } from './decisions';

const definitions: VariableDefinition[] = [{ id: 'v1', key: 'funds', name: 'Funds', type: 'number', initial: 100 }];
const parent = createReality({ name: 'Prime', state: createInitialState({ definitions, seed: 1 }), seed: 1 });

describe('decision lab', () => {
  it('creates weighted alternatives and uses forced selection', () => {
    const alternatives = [
      createDecisionAlternative('Invest', 0.6, [{ kind: 'increase', variableKey: 'funds', amount: 10 }]),
      createDecisionAlternative('Hold', 0.4, []),
    ];
    expect(selectAlternative(alternatives, new SeededRandom(1), alternatives[1]!.id)?.name).toBe('Hold');
    expect(selectAlternative(alternatives, new SeededRandom(1))?.name).toBeTruthy();
  });

  it('branches from a selected decision and applies effects', () => {
    const alternatives = [createDecisionAlternative('Invest', 1, [{ kind: 'increase', variableKey: 'funds', amount: 10 }])];
    const result = branchFromDecision(parent, 'Policy', alternatives, new SeededRandom(1), definitions, alternatives[0]!.id, 'test');
    expect(result.branch.parentId).toBe(parent.id);
    expect(result.branch.decisions).toHaveLength(1);
    expect(result.branch.currentState.variables.v1).toBe(110);
    expect(parent.currentState.variables.v1).toBe(100);
  });

  it('rejects empty decisions', () => {
    expect(() => branchFromDecision(parent, 'Empty', [], new SeededRandom(1), definitions)).toThrow();
  });

  it('records decisions with simulation context', () => {
    const alternatives = [createDecisionAlternative('A', 1, [])];
    const decision = createDecision('D', parent.currentState, alternatives, alternatives[0]!.id);
    expect(decision.step).toBe(parent.currentState.step);
  });
});
