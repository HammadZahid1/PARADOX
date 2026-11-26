import { describe, expect, it } from 'vitest';
import {
  collectDeepUnknownFieldWarnings,
  collectUnknownFieldWarnings,
  createAllowedKeySet,
  type ImportFieldSchema,
} from './importWarnings';

const allowed = createAllowedKeySet(['id', 'name', 'variables']);

describe('import unknown-field warnings', () => {
  it('collects top-level unknown keys in sorted order', () => {
    const warnings = collectUnknownFieldWarnings(
      { name: 'Alpha', zeta: 1, id: 'a', alpha: 2 },
      allowed,
    );
    expect(warnings.map((warning) => warning.key)).toEqual(['alpha', 'zeta']);
    expect(warnings[0]).toEqual({
      path: 'alpha',
      key: 'alpha',
      message: "Unknown field 'alpha' at root",
    });
  });

  it('uses dotted paths and ignores non-objects', () => {
    const warnings = collectUnknownFieldWarnings({ extra: 1 }, allowed, 'scenario');
    expect(warnings[0]?.path).toBe('scenario.extra');
    expect(collectUnknownFieldWarnings('not an object', allowed)).toEqual([]);
  });

  it('recurses through schema children and arrays', () => {
    const schema: ImportFieldSchema = {
      keys: createAllowedKeySet(['id', 'variables']),
      children: {
        variables: {
          keys: createAllowedKeySet(['key', 'initial']),
        },
      },
    };
    const value = {
      id: 'a',
      surprise: true,
      variables: [
        { key: 'x', initial: 1, bogus: true },
        { key: 'y', extra: 2 },
      ],
    };
    const warnings = collectDeepUnknownFieldWarnings(value, schema, 'scenario');
    expect(warnings.map((warning) => warning.path)).toEqual([
      'scenario.surprise',
      'scenario.variables[0].bogus',
      'scenario.variables[1].extra',
    ]);
  });

  it('does not traverse unknown fields or non-object children', () => {
    const schema: ImportFieldSchema = {
      keys: createAllowedKeySet(['id']),
      children: { id: { keys: createAllowedKeySet(['value']) } },
    };
    expect(
      collectDeepUnknownFieldWarnings({ unknown: { nested: 1 } }, schema),
    ).toHaveLength(1);
    expect(collectDeepUnknownFieldWarnings({ id: 'string' }, schema)).toEqual([]);
  });
});
