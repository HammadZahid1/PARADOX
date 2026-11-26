/**
 * Civilisation-development teaching scenario.
 *
 * Consumption, production and scarcity rules are deliberately simple: threshold
 * conditions approximate shortages and surpluses, while each effect is a fixed
 * per-step adjustment. This makes the causal chain easy to inspect.
 */
import type {
  Scenario,
  SimulationEvent,
  SimulationRule,
  VariableDefinition,
} from '@/engine/types';
import { createScenario, makeEvent, makeRule, makeVariable } from './factory';

function variable(
  key: string,
  name: string,
  initial: number,
  min: number,
  max: number,
  description: string,
): VariableDefinition {
  return makeVariable({
    id: `civilization.${key}`,
    key,
    name,
    type: 'number',
    initial,
    min,
    max,
    description,
    tags: ['civilization'],
  });
}

const variables: VariableDefinition[] = [
  variable('population', 'Population', 100, 0, 300, 'Population index, with 100 as the starting settlement size.'),
  variable('food', 'Food Reserves', 110, 0, 250, 'Food reserve index.'),
  variable('energy', 'Energy Supply', 80, 0, 200, 'Available energy index.'),
  variable('technology', 'Technology', 45, 0, 150, 'Cumulative technological capability index.'),
  variable('resources', 'Raw Resources', 120, 0, 250, 'Material resource stock index.'),
  variable('stability', 'Social Stability', 70, 0, 100, 'Social cohesion index, from 0 to 100.'),
  variable('environment', 'Environmental Quality', 80, 0, 100, 'Environmental condition index, from 0 to 100.'),
  variable('infrastructure', 'Infrastructure', 60, 0, 150, 'Built infrastructure index.'),
];

const rules: SimulationRule[] = [
  makeRule({
    id: 'civilization.rule.consumption',
    name: 'Population consumes food',
    priority: 100,
    condition: { id: 'civilization.condition.populationLarge', variableKey: 'population', operator: 'gte', value: 110 },
    effects: [
      { kind: 'decrease', variableKey: 'food', amount: 3 },
      { kind: 'decrease', variableKey: 'resources', amount: 1.5 },
    ],
    category: 'consumption',
  }),
  makeRule({
    id: 'civilization.rule.agriculture',
    name: 'Technology improves food production',
    priority: 95,
    condition: { id: 'civilization.condition.techFarming', variableKey: 'technology', operator: 'gte', value: 55 },
    effects: [
      { kind: 'increase', variableKey: 'food', amount: 3 },
      { kind: 'decrease', variableKey: 'resources', amount: 1 },
    ],
    category: 'production',
  }),
  makeRule({
    id: 'civilization.rule.energyProduction',
    name: 'Infrastructure produces energy',
    priority: 94,
    condition: { id: 'civilization.condition.infraEnergy', variableKey: 'infrastructure', operator: 'gte', value: 65 },
    effects: [
      { kind: 'increase', variableKey: 'energy', amount: 2.5 },
      { kind: 'decrease', variableKey: 'resources', amount: 1 },
    ],
    category: 'production',
  }),
  makeRule({
    id: 'civilization.rule.foodScarcity',
    name: 'Food scarcity reduces population and stability',
    priority: 90,
    condition: { id: 'civilization.condition.foodLow', variableKey: 'food', operator: 'lte', value: 80 },
    effects: [
      { kind: 'decrease', variableKey: 'population', amount: 2 },
      { kind: 'decrease', variableKey: 'stability', amount: 4 },
    ],
    category: 'scarcity',
  }),
  makeRule({
    id: 'civilization.rule.energyScarcity',
    name: 'Energy scarcity undermines infrastructure',
    priority: 89,
    condition: { id: 'civilization.condition.energyLow', variableKey: 'energy', operator: 'lte', value: 70 },
    effects: [
      { kind: 'decrease', variableKey: 'stability', amount: 3 },
      { kind: 'decrease', variableKey: 'infrastructure', amount: 1 },
    ],
    category: 'scarcity',
  }),
  makeRule({
    id: 'civilization.rule.research',
    name: 'Stable infrastructure enables technology gains',
    priority: 85,
    conditions: [
      { id: 'civilization.condition.researchInfra', variableKey: 'infrastructure', operator: 'gte', value: 65 },
      { id: 'civilization.condition.researchStability', variableKey: 'stability', operator: 'gte', value: 60 },
    ],
    effects: [
      { kind: 'increase', variableKey: 'technology', amount: 2 },
      { kind: 'decrease', variableKey: 'resources', amount: 0.5 },
    ],
    category: 'technology',
  }),
  makeRule({
    id: 'civilization.rule.resourceScarcity',
    name: 'Resource scarcity degrades infrastructure',
    priority: 80,
    condition: { id: 'civilization.condition.resourcesLow', variableKey: 'resources', operator: 'lte', value: 60 },
    effects: [
      { kind: 'decrease', variableKey: 'infrastructure', amount: 1.5 },
      { kind: 'decrease', variableKey: 'stability', amount: 2 },
    ],
    category: 'scarcity',
  }),
  makeRule({
    id: 'civilization.rule.investment',
    name: 'Surplus resources fund infrastructure',
    priority: 75,
    conditions: [
      { id: 'civilization.condition.investResources', variableKey: 'resources', operator: 'gte', value: 80 },
      { id: 'civilization.condition.investStability', variableKey: 'stability', operator: 'gte', value: 65 },
    ],
    effects: [
      { kind: 'increase', variableKey: 'infrastructure', amount: 2 },
      { kind: 'decrease', variableKey: 'resources', amount: 2 },
    ],
    category: 'investment',
  }),
  makeRule({
    id: 'civilization.rule.efficiency',
    name: 'Advanced technology reduces environmental strain',
    priority: 70,
    condition: { id: 'civilization.condition.techEfficiency', variableKey: 'technology', operator: 'gte', value: 75 },
    effects: [{ kind: 'increase', variableKey: 'environment', amount: 1.2 }],
    category: 'environment',
  }),
  makeRule({
    id: 'civilization.rule.environmentalStress',
    name: 'High energy throughput damages the environment',
    priority: 69,
    condition: { id: 'civilization.condition.energyHigh', variableKey: 'energy', operator: 'gte', value: 100 },
    effects: [{ kind: 'decrease', variableKey: 'environment', amount: 1.5 }],
    category: 'environment',
  }),
  makeRule({
    id: 'civilization.rule.recovery',
    name: 'Food security supports population recovery',
    priority: 65,
    conditions: [
      { id: 'civilization.condition.foodSecure', variableKey: 'food', operator: 'gte', value: 115 },
      { id: 'civilization.condition.recoveryStability', variableKey: 'stability', operator: 'gte', value: 60 },
    ],
    effects: [{ kind: 'increase', variableKey: 'population', amount: 1.2 }],
    category: 'demographics',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: 'civilization.event.drought',
    name: 'Drought',
    description: 'Several harvests fail in succession.',
    type: 'scheduled',
    trigger: { kind: 'scheduled', atStep: 15 },
    probability: 1,
    durationSteps: 4,
    cooldownSteps: 25,
    priority: 85,
    severity: 'critical',
    effects: [
      { kind: 'decrease', variableKey: 'food', amount: 20 },
      { kind: 'percentChange', variableKey: 'population', percent: -3 },
      { kind: 'decrease', variableKey: 'stability', amount: 6 },
      { kind: 'log', message: 'Drought: harvest reserves fall sharply.' },
    ],
    category: 'disaster',
    tags: ['civilization', 'climate'],
  }),
  makeEvent({
    id: 'civilization.event.discovery',
    name: 'Discovery',
    description: 'A new technique unlocks food and environmental improvements.',
    type: 'conditional',
    trigger: { kind: 'threshold', variableKey: 'technology', operator: 'gte', value: 70 },
    probability: 1,
    durationSteps: 6,
    cooldownSteps: 22,
    priority: 80,
    severity: 'notice',
    effects: [
      { kind: 'increase', variableKey: 'technology', amount: 8 },
      { kind: 'increase', variableKey: 'food', amount: 6 },
      { kind: 'increase', variableKey: 'environment', amount: 2 },
      { kind: 'log', message: 'Discovery: new techniques spread.' },
    ],
    category: 'innovation',
    tags: ['civilization', 'technology'],
  }),
  makeEvent({
    id: 'civilization.event.migration',
    name: 'Migration',
    description: 'Food scarcity prompts movement to new settlements.',
    type: 'conditional',
    trigger: { kind: 'threshold', variableKey: 'food', operator: 'lte', value: 75 },
    probability: 1,
    durationSteps: 3,
    cooldownSteps: 18,
    priority: 80,
    severity: 'warning',
    effects: [
      { kind: 'decrease', variableKey: 'population', amount: 8 },
      { kind: 'decrease', variableKey: 'stability', amount: 2 },
      { kind: 'decrease', variableKey: 'resources', amount: 3 },
      { kind: 'increase', variableKey: 'infrastructure', amount: 1 },
      { kind: 'log', message: 'Migration: population redistributes.' },
    ],
    category: 'demographics',
    tags: ['civilization', 'demographics'],
  }),
];

/** Build a fresh, deterministic civilisation scenario. */
export function civilizationScenario(): Scenario {
  return createScenario({
    id: 'civilization',
    name: 'Civilisation Development',
    domain: 'civilization',
    description: 'A simplified settlement model covering consumption, production, scarcity and innovation.',
    variables,
    rules,
    events,
    parameters: {
      foodScarcityThreshold: 80,
      energyScarcityThreshold: 70,
      researchThreshold: 65,
      baselinePopulation: 100,
    },
    objectives: [
      {
        id: 'civilization.objective.stability',
        name: 'Maintain stability above 60',
        variableKey: 'stability',
        target: 60,
        operator: 'gte',
      },
      {
        id: 'civilization.objective.food',
        name: 'Maintain food reserves above 90',
        variableKey: 'food',
        target: 90,
        operator: 'gte',
      },
    ],
    tags: ['civilization', 'preset'],
    preset: true,
    disclaimer: 'Simplified educational model; not a theory of real historical civilisations.',
  });
}
