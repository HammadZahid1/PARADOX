import type { EntityId, SimulationEvent } from '@/engine/types';

export type StepInputKind = 'seed' | 'inject' | 'adjust';

export interface SeedInput {
  kind: 'seed';
  step: number;
  seed: number;
}

export interface InjectInput {
  kind: 'inject';
  step: number;
  eventId: EntityId;
  event: SimulationEvent;
  probabilityOverride?: number;
}

export interface AdjustInput {
  kind: 'adjust';
  step: number;
  key: string;
  value: number;
  source?: string;
}

export type StepInput = SeedInput | InjectInput | AdjustInput;
export type StepInputLog = readonly StepInput[];

export function createInputLog(inputs: StepInputLog = []): StepInputLog {
  return [...inputs];
}

/** Append an input without mutating the source log. */
export function add(log: StepInputLog, input: StepInput): StepInputLog {
  return [...log, input];
}

export function atStep(log: StepInputLog, step: number): StepInputLog {
  return log.filter((input) => input.step === step);
}

export function filterByKind<K extends StepInputKind>(log: StepInputLog, kind: K): Array<Extract<StepInput, { kind: K }>> {
  return log.filter((input): input is Extract<StepInput, { kind: K }> => input.kind === kind);
}

export function encodeJSON(log: StepInputLog): string {
  return JSON.stringify(log);
}

/** Decode a JSON log, rejecting entries with an unknown kind or malformed fields. */
export function decodeJSON(json: string): StepInputLog {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error('Step input log must be an array');
  return parsed.map((entry, index) => parseInput(entry, index));
}

function parseInput(entry: unknown, index: number): StepInput {
  if (!isRecord(entry)) throw new Error(`Step input ${index} must be an object`);
  const step = requireInteger(entry.step, `inputs[${index}].step`);
  if (entry.kind === 'seed') {
    return { kind: 'seed', step, seed: requireFinite(entry.seed, `inputs[${index}].seed`) };
  }
  if (entry.kind === 'inject') {
    if (!isRecord(entry.event)) throw new Error(`inputs[${index}].event must be an object`);
    const event = entry.event as unknown as SimulationEvent;
    if (typeof event.id !== 'string' || typeof event.name !== 'string') {
      throw new Error(`inputs[${index}].event is not a simulation event`);
    }
    const input: InjectInput = {
      kind: 'inject',
      step,
      eventId: typeof entry.eventId === 'string' ? entry.eventId : event.id,
      event,
    };
    if (entry.probabilityOverride !== undefined) {
      input.probabilityOverride = requireFinite(entry.probabilityOverride, `inputs[${index}].probabilityOverride`);
    }
    return input;
  }
  if (entry.kind === 'adjust') {
    const input: AdjustInput = {
      kind: 'adjust',
      step,
      key: requireString(entry.key, `inputs[${index}].key`),
      value: requireFinite(entry.value, `inputs[${index}].value`),
    };
    if (entry.source !== undefined) input.source = requireString(entry.source, `inputs[${index}].source`);
    return input;
  }
  throw new Error(`Step input ${index} has unknown kind: ${String(entry.kind)}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireFinite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${path} must be a finite number`);
  return value;
}

function requireInteger(value: unknown, path: string): number {
  const number = requireFinite(value, path);
  if (!Number.isInteger(number)) throw new Error(`${path} must be an integer`);
  return number;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new Error(`${path} must be a string`);
  return value;
}
