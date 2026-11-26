import { describe, expect, it } from 'vitest';
import {
  SHARE_LINK_PREFIX,
  decodeScenarioSummary,
  encodeScenarioSummary,
  isValidShareLink,
  validateScenarioSummary,
  type ScenarioSummary,
} from './shareLink';

const summary: ScenarioSummary = {
  id: 'scenario_1',
  name: 'Alternate Europe Ω',
  seed: 12345,
  steps: 250,
  variables: ['population', 'energy', 'co₂'],
};

describe('scenario share links', () => {
  it('round-trips unicode and is URL-safe and deterministic', () => {
    const token = encodeScenarioSummary(summary);
    expect(token.startsWith(SHARE_LINK_PREFIX)).toBe(true);
    expect(token).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(encodeScenarioSummary(summary)).toBe(token);
    expect(decodeScenarioSummary(token)).toEqual({ kind: 'ok', value: summary });
    expect(isValidShareLink(token)).toBe(true);
  });

  it('ignores key order in the source object', () => {
    const reordered = {
      variables: summary.variables,
      steps: summary.steps,
      seed: summary.seed,
      name: summary.name,
      id: summary.id,
    };
    expect(encodeScenarioSummary(reordered)).toBe(encodeScenarioSummary(summary));
  });

  it('rejects bad prefixes, empty payloads and invalid base64url', () => {
    expect(decodeScenarioSummary('v2.abc')).toMatchObject({
      kind: 'err',
      message: 'Unsupported share link prefix',
    });
    expect(decodeScenarioSummary(SHARE_LINK_PREFIX)).toMatchObject({ kind: 'err' });
    expect(decodeScenarioSummary(`${SHARE_LINK_PREFIX}!!!`)).toMatchObject({
      kind: 'err',
      message: 'Invalid base64url payload',
    });
  });

  it('rejects invalid fields and non-canonical payloads', () => {
    const invalid = encodeScenarioSummary(summary);
    const tampered = `${invalid.slice(0, -2)}AA`;
    expect(decodeScenarioSummary(tampered).kind).toBe('err');
    expect(
      validateScenarioSummary({ ...summary, seed: 1.5 }),
    ).toBeNull();
    expect(validateScenarioSummary({ ...summary, steps: 0 })).toBeNull();
    expect(validateScenarioSummary({ ...summary, variables: ['a', 'a'] })).toBeNull();
    expect(validateScenarioSummary({ ...summary, extra: true })).toBeNull();
    expect(() => encodeScenarioSummary({ ...summary, name: '' })).toThrow(/Invalid/);
  });

  it('reports invalid UTF-8 payloads', () => {
    expect(decodeScenarioSummary(`${SHARE_LINK_PREFIX}_w`)).toMatchObject({
      kind: 'err',
    });
  });
});
