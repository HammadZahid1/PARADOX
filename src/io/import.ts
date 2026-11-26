import type { Scenario, TimelineSnapshot, Workspace } from '@/engine/types';
import { isPlainObject } from '@/utils/clone';
import {
  combine,
  failure,
  parseImportEnvelope,
  success,
  validateEnvelope,
  validateScenario,
  validateScenarioList,
  type ImportEnvelope,
  type ValidationResult,
} from '@/engine/validation';

export type ImportPayload =
  | { format: 'paradox-scenario'; scenario: Scenario }
  | { format: 'paradox-workspace'; workspace: Workspace; scenarios: Scenario[] }
  | { format: 'paradox-snapshot'; snapshot: TimelineSnapshot };

export interface ImportPlan {
  envelope: ImportEnvelope;
  payload: ImportPayload;
  issues: ValidationResult['issues'];
}

function isScenario(value: unknown): value is Scenario {
  return isPlainObject(value) && typeof value['id'] === 'string' && Array.isArray(value['variables']);
}

function isWorkspace(value: unknown): value is Workspace {
  return isPlainObject(value) && typeof value['id'] === 'string' && isPlainObject(value['settings']);
}

function isSnapshot(value: unknown): value is TimelineSnapshot {
  return isPlainObject(value) && typeof value['id'] === 'string' && isPlainObject(value['state']);
}

function validateSnapshot(snapshot: TimelineSnapshot): ValidationResult {
  return combine(
    typeof snapshot.name === 'string' && snapshot.name.trim().length > 0 ? success() : failure('payload.name', 'Snapshot name is required'),
    typeof snapshot.branchId === 'string' ? success() : failure('payload.branchId', 'Snapshot branch is required'),
    Number.isFinite(snapshot.step) ? success() : failure('payload.step', 'Snapshot step must be finite'),
  );
}

/** Parse and validate an exported PARADOX file before any data enters the store. */
export function createImportPlan(text: string): ImportPlan | null {
  const envelope = parseImportEnvelope(text);
  if (!envelope) return null;
  const envelopeResult = validateEnvelope(envelope);
  if (!envelopeResult.valid) return { envelope, payload: null as never, issues: envelopeResult.issues };

  if (envelope.format === 'paradox-scenario') {
    if (!isScenario(envelope.payload)) {
      return { envelope, payload: null as never, issues: [failure('payload', 'Expected a scenario object').issues[0]!] };
    }
    const result = validateScenario(envelope.payload);
    return result.valid
      ? { envelope, payload: { format: 'paradox-scenario', scenario: envelope.payload }, issues: [] }
      : { envelope, payload: null as never, issues: result.issues };
  }

  if (envelope.format === 'paradox-workspace') {
    if (!isPlainObject(envelope.payload) || !isWorkspace(envelope.payload['workspace']) || !Array.isArray(envelope.payload['scenarios'])) {
      return { envelope, payload: null as never, issues: [failure('payload', 'Expected a workspace with scenarios').issues[0]!] };
    }
    const workspace = envelope.payload['workspace'] as Workspace;
    const scenarios = envelope.payload['scenarios'] as Scenario[];
    const result = validateScenarioList(scenarios);
    return result.valid
      ? { envelope, payload: { format: 'paradox-workspace', workspace, scenarios }, issues: [] }
      : { envelope, payload: null as never, issues: result.issues };
  }

  if (!isSnapshot(envelope.payload)) {
    return { envelope, payload: null as never, issues: [failure('payload', 'Expected a snapshot object').issues[0]!] };
  }
  const result = validateSnapshot(envelope.payload);
  return result.valid
    ? { envelope, payload: { format: 'paradox-snapshot', snapshot: envelope.payload }, issues: [] }
    : { envelope, payload: null as never, issues: result.issues };
}

export function importScenario(text: string): Scenario | null {
  const plan = createImportPlan(text);
  return plan && plan.payload?.format === 'paradox-scenario' ? plan.payload.scenario : null;
}

export function importWorkspace(text: string): { workspace: Workspace; scenarios: Scenario[] } | null {
  const plan = createImportPlan(text);
  return plan && plan.payload?.format === 'paradox-workspace'
    ? { workspace: plan.payload.workspace, scenarios: plan.payload.scenarios }
    : null;
}
