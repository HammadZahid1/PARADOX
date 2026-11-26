import { describe, expect, it } from 'vitest';
import type { SimulationEvent } from '@/engine/types';
import {
  add,
  atStep,
  createInputLog,
  decodeJSON,
  encodeJSON,
  filterByKind,
  type AdjustInput,
  type InjectInput,
  type SeedInput,
} from './inputs';

const event: SimulationEvent = {
  id: 'e1',
  name: 'Discovery',
  type: 'scheduled',
  trigger: { kind: 'scheduled', atStep: 2 },
  probability: 1,
  conditions: [],
  effects: [{ kind: 'increase', variableKey: 'population', amount: 10 }],
  dependencies: [],
  priority: 1,
  severity: 'notice',
  enabled: true,
};

const seedInput: SeedInput = { kind: 'seed', step: 1, seed: 42 };
const injectInput: InjectInput = { kind: 'inject', step: 2, eventId: event.id, event, probabilityOverride: 0.5 };
const adjustInput: AdjustInput = { kind: 'adjust', step: 2, key: 'population', value: 120, source: 'user' };

describe('typed step input log', () => {
  it('adds inputs without mutating the original log', () => {
    const original = createInputLog([seedInput]);
    const extended = add(original, injectInput);
    expect(original).toHaveLength(1);
    expect(extended).toHaveLength(2);
    expect(extended[1]).toEqual(injectInput);
  });

  it('queries by step and kind with narrowed types', () => {
    const log = createInputLog([seedInput, injectInput, adjustInput]);
    expect(atStep(log, 2)).toHaveLength(2);
    expect(atStep(log, 7)).toEqual([]);
    expect(filterByKind(log, 'inject')).toEqual([injectInput]);
    expect(filterByKind(log, 'adjust')[0]?.key).toBe('population');
    expect(filterByKind(log, 'seed')[0]?.seed).toBe(42);
  });

  it('round-trips JSON including optional fields', () => {
    const log = createInputLog([seedInput, injectInput, adjustInput]);
    expect(decodeJSON(encodeJSON(log))).toEqual([seedInput, injectInput, adjustInput]);
  });

  it('defaults injection eventId to the decoded event id', () => {
    const json = JSON.stringify([{ kind: 'inject', step: 1, event }]);
    expect(decodeJSON(json)[0]).toMatchObject({ kind: 'inject', eventId: event.id });
  });

  it('rejects malformed logs', () => {
    expect(() => decodeJSON('{}')).toThrow(/array/);
    expect(() => decodeJSON('[{"kind":"bogus","step":1}]')).toThrow(/unknown kind/);
    expect(() => decodeJSON('[{"kind":"adjust","step":1.5,"key":"x","value":1}]')).toThrow(/integer/);
    expect(() => decodeJSON('[{"kind":"inject","step":1,"event":{}}]')).toThrow(/simulation event/);
  });
});
