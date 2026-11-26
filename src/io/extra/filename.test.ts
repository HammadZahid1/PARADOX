import { describe, expect, it } from 'vitest';
import { applyCollisionSuffix, sanitizeScenarioFilename } from './filename';

describe('scenario export filenames', () => {
  it('sanitizes separators, quotes and control characters', () => {
    expect(sanitizeScenarioFilename('My Scenario: "Beta" / 2026')).toBe('my-scenario-beta-2026.json');
    expect(sanitizeScenarioFilename('..\\..\\secret?')).toBe('secret.json');
    expect(sanitizeScenarioFilename('tab\tname')).toBe('tab-name.json');
  });

  it('preserves unicode letters and digits', () => {
    expect(sanitizeScenarioFilename('Étude Ω-2')).toBe('etude-ω-2.json');
  });

  it('uses fallbacks for empty and reserved names', () => {
    expect(sanitizeScenarioFilename('')).toBe('scenario.json');
    expect(sanitizeScenarioFilename('***')).toBe('scenario.json');
    expect(sanitizeScenarioFilename('CON')).toBe('_con.json');
    expect(sanitizeScenarioFilename('LPT1')).toBe('_lpt1.json');
    expect(sanitizeScenarioFilename('', { fallback: 'Fallback Name' })).toBe('fallback-name.json');
  });

  it('normalizes extensions and truncates long titles', () => {
    expect(sanitizeScenarioFilename('Alpha', { extension: '.CSV' })).toBe('alpha.csv');
    expect(sanitizeScenarioFilename('Alpha', { extension: '??' })).toBe('alpha.json');
    const filename = sanitizeScenarioFilename('a'.repeat(200), { maxLength: 12 });
    expect(filename).toBe(`${'a'.repeat(12)}.json`);
  });

  it('adds collision suffixes before the extension', () => {
    expect(applyCollisionSuffix('alpha.json', 2)).toBe('alpha-2.json');
    expect(applyCollisionSuffix('alpha', 3)).toBe('alpha-3');
    expect(() => applyCollisionSuffix('alpha.json', 0)).toThrow(/positive integer/);
  });
});
