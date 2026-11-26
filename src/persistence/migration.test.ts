import { describe, expect, it } from 'vitest';
import { currentSchemaVersion, DEFAULT_MIGRATION_CONFIGURATION, migratePayload } from './migration';

type Payload = Record<string, unknown>;

describe('payload migration', () => {
  it('adds tags, configuration and the current version to v1 payloads', () => {
    const source: Payload = { id: 'scenario-1', version: 1 };
    const migrated = migratePayload(source, 1) as Payload;

    expect(migrated).toEqual({
      id: 'scenario-1',
      version: currentSchemaVersion,
      tags: [],
      configuration: DEFAULT_MIGRATION_CONFIGURATION,
    });
    expect(source).toEqual({ id: 'scenario-1', version: 1 });
  });

  it('preserves existing tags and fills missing configuration fields', () => {
    const migrated = migratePayload({ tags: ['economy'], configuration: { maxSteps: 12 }, version: 2 }, 2) as Payload;

    expect(migrated.tags).toEqual(['economy']);
    expect(migrated.configuration).toEqual({ ...DEFAULT_MIGRATION_CONFIGURATION, maxSteps: 12 });
    expect(migrated.version).toBe(3);
  });

  it('is idempotent for current payloads without mutating them', () => {
    const current: Payload = {
      id: 'world-1',
      tags: ['kept'],
      version: currentSchemaVersion,
      configuration: { ...DEFAULT_MIGRATION_CONFIGURATION, mode: 'probabilistic' },
    };

    const migrated = migratePayload(current, currentSchemaVersion) as Payload;
    expect(migrated).toEqual(current);
    expect(migrated).not.toBe(current);
  });

  it('passes through non-object payloads and rejects unsupported versions', () => {
    expect(migratePayload('plain text', 1)).toBe('plain text');
    expect(migratePayload(null, 3)).toBeNull();
    expect(() => migratePayload({}, 0)).toThrow(RangeError);
    expect(() => migratePayload({}, currentSchemaVersion + 1)).toThrow(/Unsupported PARADOX schema version/);
  });
});
