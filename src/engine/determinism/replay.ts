import type { SimulationEvent, WorldState } from '@/engine/types';
import { hashString } from '@/utils/id';
import type { StepInput, StepInputLog } from './inputs';

export interface ReplayRecording {
  readonly seed: number;
  readonly maxSteps: number;
  readonly inputs: StepInputLog;
}

/** Pure handlers invoked by playback; each must return a new state. */
export interface ReplayHandlers {
  step(state: WorldState, seed: number, step: number): WorldState;
  inject(state: WorldState, event: SimulationEvent, probabilityOverride: number | undefined, seed: number): WorldState;
  adjust(state: WorldState, key: string, value: number, source: string | undefined, seed: number): WorldState;
}

export interface ReplayFrame {
  readonly step: number;
  readonly seed: number;
  readonly state: WorldState;
  readonly inputs: StepInputLog;
}

export interface ReplayResult {
  readonly state: WorldState;
  readonly frames: readonly ReplayFrame[];
}

/** Capture inputs in step order without mutating the caller's log. */
export function recordReplay(seed: number, inputs: StepInputLog = [], maxSteps?: number): ReplayRecording {
  for (const input of inputs) {
    if (!Number.isInteger(input.step) || input.step < 1) throw new Error('Replay inputs must use positive integer steps');
  }
  const sorted = [...inputs].sort((left, right) => left.step - right.step);
  const lastStep = sorted.reduce((max, input) => Math.max(max, input.step), 0);
  const requested = maxSteps === undefined ? lastStep : Math.floor(maxSteps);
  return {
    seed: normalizeSeed(seed),
    maxSteps: Math.max(0, requested, lastStep),
    inputs: sorted,
  };
}

/** Reproducible per-step seed derived from the active master seed. */
export function stepSeed(masterSeed: number, step: number): number {
  return hashString(`${normalizeSeed(masterSeed)}:${step}`);
}

/**
 * Replay a recording deterministically. Seed inputs change the master seed for the
 * current step; injections and adjustments are applied before the step itself.
 */
export function playback(recording: ReplayRecording, initialState: WorldState, handlers: ReplayHandlers): ReplayResult {
  const byStep = new Map<number, StepInput[]>();
  for (const input of recording.inputs) {
    const bucket = byStep.get(input.step) ?? [];
    bucket.push(input);
    byStep.set(input.step, bucket);
  }

  let masterSeed = recording.seed;
  let state = initialState;
  const frames: ReplayFrame[] = [];
  for (let step = 1; step <= recording.maxSteps; step += 1) {
    const inputs = byStep.get(step) ?? [];
    for (const input of inputs) {
      if (input.kind === 'seed') masterSeed = normalizeSeed(input.seed);
    }
    const seed = stepSeed(masterSeed, step);
    for (const input of inputs) {
      if (input.kind === 'inject') {
        state = handlers.inject(state, input.event, input.probabilityOverride, seed);
      } else if (input.kind === 'adjust') {
        state = handlers.adjust(state, input.key, input.value, input.source, seed);
      }
    }
    state = handlers.step(state, seed, step);
    frames.push({ step, seed, state, inputs: [...inputs] });
  }
  return { state, frames };
}

function normalizeSeed(seed: number): number {
  return (Number.isFinite(seed) ? Math.trunc(seed) : 0) >>> 0;
}
