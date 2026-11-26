/** Registry of built-in, deterministic scenario presets. */
import type { Scenario } from '@/engine/types';
import { civilizationScenario } from './civilization';
import { economyScenario } from './economy';
import { ecosystemScenario } from './ecosystem';
import { geopoliticsScenario } from './geopolitics';
import { supplyChainScenario } from './supplyChain';
import { technologyScenario } from './technology';
import { urbanScenario } from './urban';

export interface ScenarioPreset {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly description: string;
  readonly create: () => Scenario;
}

export const SCENARIO_PRESETS: readonly ScenarioPreset[] = [
  {
    id: 'economy',
    name: 'Macroeconomic Cycle',
    domain: 'economics',
    description: 'Demand, supply, prices, debt and monetary feedback loops.',
    create: economyScenario,
  },
  {
    id: 'civilization',
    name: 'Civilisation Development',
    domain: 'civilization',
    description: 'Consumption, production, scarcity and technological progress.',
    create: civilizationScenario,
  },
  {
    id: 'ecosystem',
    name: 'Ecosystem Feedbacks',
    domain: 'ecosystem',
    description: 'Carbon, temperature, vegetation and ecosystem resilience.',
    create: ecosystemScenario,
  },
  {
    id: 'technology',
    name: 'Technology Diffusion',
    domain: 'technology',
    description: 'Research, compute, adoption, productivity and competition.',
    create: technologyScenario,
  },
  {
    id: 'geopolitics',
    name: 'Fictional Regional Relations',
    domain: 'geopolitics',
    description: 'Fictional interactions between invented regions.',
    create: geopoliticsScenario,
  },
  {
    id: 'supply-chain',
    name: 'Supply Chain Under Stress',
    domain: 'supply-chain',
    description: 'Inventory, demand, transport and supplier reliability.',
    create: supplyChainScenario,
  },
  {
    id: 'urban',
    name: 'Urban Growth Pressures',
    domain: 'urban',
    description: 'Housing, commuting, investment and environmental quality.',
    create: urbanScenario,
  },
];

/** Look up a preset by its stable scenario id. */
export function getScenarioPreset(id: string): ScenarioPreset | undefined {
  return SCENARIO_PRESETS.find((preset) => preset.id === id);
}

/** Build a fresh, independent scenario for every registered preset. */
export function createAllPresets(): Scenario[] {
  return SCENARIO_PRESETS.map((preset) => preset.create());
}
