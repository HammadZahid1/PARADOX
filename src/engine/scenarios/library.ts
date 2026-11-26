import type { Scenario } from '@/engine/types';
import { EXTRA_PRESETS } from './extra';
import { SCENARIO_PRESETS, type ScenarioPreset } from './index';

export type LibraryPreset = ScenarioPreset;

/** Stable catalogue of every bundled scenario, in display order. */
export const SCENARIO_LIBRARY: readonly LibraryPreset[] = [...SCENARIO_PRESETS, ...EXTRA_PRESETS];

/** Look up any bundled scenario by its stable id. */
export function getLibraryPreset(id: string): LibraryPreset | undefined {
  return SCENARIO_LIBRARY.find((preset) => preset.id === id);
}

/** Build a fresh, independent scenario for every bundled preset. */
export function createAllLibraryPresets(): Scenario[] {
  return SCENARIO_LIBRARY.map((preset) => preset.create());
}
