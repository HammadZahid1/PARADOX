/** Forward-only payload migrations. Each step is explicit and non-mutating. */

import type { SimulationConfiguration } from '@/engine/types';
import { deepClone, isPlainObject } from '@/utils/clone';

export const currentSchemaVersion = 3;
export const CURRENT_SCHEMA_VERSION = currentSchemaVersion;

export const DEFAULT_MIGRATION_CONFIGURATION: SimulationConfiguration = {
  stepDuration: 1,
  maxSteps: 100,
  seed: 0,
  mode: 'deterministic',
  propagationLimit: 100,
  autoSnapshotSteps: 0,
  strictValidation: true,
};

type MutablePayload = Record<string, unknown>;

function ensureTags(payload: MutablePayload): void {
  if (!Array.isArray(payload.tags)) payload.tags = [];
}

function finiteNumber(value: unknown, fallback: number, minimum: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum ? value : fallback;
}

function migrateConfiguration(value: unknown): SimulationConfiguration {
  const fallback = deepClone(DEFAULT_MIGRATION_CONFIGURATION);
  if (!isPlainObject(value)) return fallback;
  return {
    stepDuration: finiteNumber(value.stepDuration, fallback.stepDuration, Number.MIN_VALUE),
    maxSteps: finiteNumber(value.maxSteps, fallback.maxSteps, 1),
    seed: finiteNumber(value.seed, fallback.seed, Number.NEGATIVE_INFINITY),
    mode: value.mode === 'deterministic' || value.mode === 'probabilistic' ? value.mode : fallback.mode,
    propagationLimit: finiteNumber(value.propagationLimit, fallback.propagationLimit, 0),
    autoSnapshotSteps: finiteNumber(value.autoSnapshotSteps, fallback.autoSnapshotSteps, 0),
    strictValidation: typeof value.strictValidation === 'boolean' ? value.strictValidation : fallback.strictValidation,
  };
}

/** v1 → v2: introduce the `tags` collection used by every saved entity. */
function migrateV1ToV2(payload: MutablePayload): MutablePayload {
  const next = deepClone(payload) as MutablePayload;
  ensureTags(next);
  next.version = 2;
  return next;
}

/** v2 → v3: introduce simulation defaults under `configuration`. */
function migrateV2ToV3(payload: MutablePayload): MutablePayload {
  const next = deepClone(payload) as MutablePayload;
  ensureTags(next);
  next.configuration = migrateConfiguration(next.configuration);
  next.version = currentSchemaVersion;
  return next;
}

/**
 * Migrates any plain-object payload to the current schema version.
 * Non-object payloads are returned cloned and unsupported versions throw.
 */
export function migratePayload(payload: unknown, fromVersion: number): unknown {
  if (!Number.isInteger(fromVersion) || fromVersion < 1 || fromVersion > currentSchemaVersion) {
    throw new RangeError(`Unsupported PARADOX schema version: ${fromVersion}`);
  }
  if (!isPlainObject(payload)) return deepClone(payload);
  const migrated = fromVersion === 1 ? migrateV1ToV2(payload) : deepClone(payload) as MutablePayload;
  return migrateV2ToV3(migrated);
}
