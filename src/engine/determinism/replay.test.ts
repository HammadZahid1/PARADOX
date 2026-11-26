import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/engine/core/state';
import type { SimulationEvent, WorldState } from '@/engine/types';
import { stateChecksum } from './checksum';
import type { StepInput } from './inputs';
import { playback, recordReplay, stepSeed, type ReplayHandlers } from './replay';

const event: SimulationEvent = {
  id: 'e1',
  name: 'Shock',
  type: 'manual',
  trigger: { kind: 'manual' },
  probability: 1,
  conditions: [],
  effects: [{ kind: 'increase', variableKey: 'population', amount: 5 }],
  dependencies: [],
  priority: 1,
  severity: 'notice',
  enabled: true,
};

const initial = (): WorldState => createInitialState({ definitions: [], seed: 7, parameters: { population: 100 } });

const handlers: ReplayHandlers = {
  step: (state, seed, step) => ({
    ...state,
    step,
    time: state.time + 1,
    variables: { ...state.variables },
    metrics: { ...state.metrics, ticks: (state.metrics.ticks ?? 0) + 1, stepSeed: seed, lastStep: step },
  }),
  inject: (state, injected, probabilityOverride, seed) => ({
    ...state,
    variables: { ...state.variables, injected: probabilityOverride ?? injected.probability, injectSeed: seed },
    metrics: { ...state.metrics, events: (state.metrics.events ?? 0) + 1 },
  }),
  adjust: (state, key, value, source, seed) => ({
    ...state,
    variables: { ...state.variables, [key]: value, adjustSource: source ?? 'unknown', adjustSeed: seed },
    metrics: { ...state.metrics, adjusts: (state.metrics.adjusts ?? 0) + 1 },
  }),
};

describe('deterministic input replay', () => {
  it('records inputs in step order without mutating the caller log', () => {
    const inputs: StepInput[] = [
      { kind: 'inject', step: 2, eventId: event.id, event, probabilityOverride: 0.5 },
      { kind: 'adjust', step: 1, key: 'population', value: 120 },
    ];
    const recording = recordReplay(7, inputs, 3);
    expect(recording.inputs.map((input) => input.step)).toEqual([1, 2]);
    expect(recording.maxSteps).toBe(3);
    expect(inputs[0]?.step).toBe(2);
  });

  it('applies adjustments and injections before the step and exposes frames', () => {
    const inputs: StepInput[] = [
      { kind: 'adjust', step: 1, key: 'population', value: 120, source: 'user' },
      { kind: 'inject', step: 2, eventId: event.id, event, probabilityOverride: 0.5 },
    ];
    const result = playback(recordReplay(7, inputs), initial(), handlers);
    expect(result.frames).toHaveLength(2);
    expect(result.frames[0]?.state.variables.population).toBe(120);
    expect(result.frames[0]?.state.variables.adjustSource).toBe('user');
    expect(result.frames[1]?.state.variables.injected).toBe(0.5);
    expect(result.state.metrics).toMatchObject({ ticks: 2, adjusts: 1, events: 1 });
  });

  it('derives unique step seeds and lets seed inputs override the master seed', () => {
    const inputs: StepInput[] = [{ kind: 'seed', step: 2, seed: 99 }];
    const result = playback(recordReplay(7, inputs, 3), initial(), handlers);
    expect(result.frames[0]?.seed).toBe(stepSeed(7, 1));
    expect(result.frames[1]?.seed).toBe(stepSeed(99, 2));
    expect(result.frames[2]?.seed).toBe(stepSeed(99, 3));
    expect(new Set(result.frames.map((frame) => frame.seed)).size).toBe(3);
  });

  it('is pure: repeated playback matches and leaves states unchanged', () => {
    const inputs: StepInput[] = [{ kind: 'adjust', step: 1, key: 'population', value: 130 }];
    const recording = recordReplay(7, inputs);
    const source = initial();
    const first = playback(recording, source, handlers);
    const second = playback(recording, source, handlers);
    expect(stateChecksum(first.state)).toBe(stateChecksum(second.state));
    expect(first.frames.map((frame) => frame.seed)).toEqual(second.frames.map((frame) => frame.seed));
    expect(source.step).toBe(0);
    expect(recording.inputs).toHaveLength(1);
  });
});
