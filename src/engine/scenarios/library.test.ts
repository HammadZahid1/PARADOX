import { describe, expect, it } from 'vitest';
import { validateScenarioList } from '@/engine/validation';
import { createAllLibraryPresets, getLibraryPreset, SCENARIO_LIBRARY } from './library';

describe('combined scenario library', () => {
  it('contains every bundled preset with unique stable ids', () => {
    const ids = SCENARIO_LIBRARY.map((preset) => preset.id);
    expect(ids).toHaveLength(17);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('economy');
    expect(ids).toContain('extra-climate');
    expect(getLibraryPreset('extra-healthcare')?.name).toBe('Northvale Regional Health Network');
    expect(getLibraryPreset('missing')).toBeUndefined();
  });

  it('creates fresh valid scenarios for the whole library', () => {
    const first = createAllLibraryPresets();
    const second = createAllLibraryPresets();
    expect(first).toHaveLength(SCENARIO_LIBRARY.length);
    expect(first.map((scenario) => scenario.id)).toEqual(second.map((scenario) => scenario.id));
    expect(first[0]).not.toBe(second[0]);
    expect(validateScenarioList(first).valid).toBe(true);
  });
});
