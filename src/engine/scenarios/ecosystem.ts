/**
 * Simplified ecosystem and climate-feedback scenario.
 *
 * Carbon, temperature and vegetation form a deliberately small feedback loop:
 * higher carbon warms the system, warmth stresses vegetation, and healthy
 * vegetation removes carbon. Thresholds stand in for more complex dynamics.
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
    id: `ecosystem.${key}`,
    key,
    name,
    type: 'number',
    initial,
    min,
    max,
    description,
    tags: ['ecosystem'],
  });
}

const variables: VariableDefinition[] = [
  variable('temperature', 'Temperature', 15, -5, 35, 'Global mean temperature proxy, in degrees Celsius.'),
  variable('precipitation', 'Precipitation', 100, 0, 200, 'Rainfall index, with 100 as the baseline.'),
  variable('biodiversity', 'Biodiversity', 75, 0, 100, 'Species diversity index, from 0 to 100.'),
  variable('carbon', 'Atmospheric Carbon', 110, 0, 300, 'Atmospheric carbon index.'),
  variable('vegetation', 'Vegetation Cover', 70, 0, 150, 'Vegetation biomass index.'),
  variable('ocean', 'Ocean Stress', 60, 0, 100, 'Ocean acidification and warming stress index.'),
  variable('ecosystemStability', 'Ecosystem Stability', 70, 0, 100, 'Resilience of the ecosystem, from 0 to 100.'),
];

const rules: SimulationRule[] = [
  makeRule({
    id: 'ecosystem.rule.carbonWarming',
    name: 'Carbon increases temperature',
    priority: 100,
    condition: { id: 'ecosystem.condition.carbonHigh', variableKey: 'carbon', operator: 'gte', value: 120 },
    effects: [{ kind: 'increase', variableKey: 'temperature', amount: 0.4 }],
    category: 'feedback',
  }),
  makeRule({
    id: 'ecosystem.rule.warmingCarbon',
    name: 'Warming reinforces carbon accumulation',
    priority: 98,
    condition: { id: 'ecosystem.condition.temperatureHigh', variableKey: 'temperature', operator: 'gte', value: 16 },
    effects: [{ kind: 'increase', variableKey: 'carbon', amount: 0.3 }],
    category: 'feedback',
  }),
  makeRule({
    id: 'ecosystem.rule.carbonAbsorption',
    name: 'Vegetation absorbs carbon',
    priority: 95,
    condition: { id: 'ecosystem.condition.vegetationHealthy', variableKey: 'vegetation', operator: 'gte', value: 70 },
    effects: [{ kind: 'decrease', variableKey: 'carbon', amount: 1.5 }],
    category: 'carbon-cycle',
  }),
  makeRule({
    id: 'ecosystem.rule.carbonRelease',
    name: 'Lost vegetation releases carbon',
    priority: 94,
    condition: { id: 'ecosystem.condition.vegetationLow', variableKey: 'vegetation', operator: 'lte', value: 45 },
    effects: [{ kind: 'increase', variableKey: 'carbon', amount: 0.8 }],
    category: 'carbon-cycle',
  }),
  makeRule({
    id: 'ecosystem.rule.rainfallGrowth',
    name: 'High precipitation grows vegetation',
    priority: 90,
    condition: { id: 'ecosystem.condition.rainHigh', variableKey: 'precipitation', operator: 'gte', value: 110 },
    effects: [{ kind: 'increase', variableKey: 'vegetation', amount: 2 }],
    category: 'hydrology',
  }),
  makeRule({
    id: 'ecosystem.rule.droughtStress',
    name: 'Low precipitation reduces vegetation',
    priority: 89,
    condition: { id: 'ecosystem.condition.rainLow', variableKey: 'precipitation', operator: 'lte', value: 80 },
    effects: [{ kind: 'decrease', variableKey: 'vegetation', amount: 2 }],
    category: 'hydrology',
  }),
  makeRule({
    id: 'ecosystem.rule.heatStress',
    name: 'Heat damages vegetation and biodiversity',
    priority: 85,
    condition: { id: 'ecosystem.condition.heat', variableKey: 'temperature', operator: 'gte', value: 17 },
    effects: [
      { kind: 'decrease', variableKey: 'vegetation', amount: 1.2 },
      { kind: 'decrease', variableKey: 'biodiversity', amount: 0.8 },
    ],
    category: 'stress',
  }),
  makeRule({
    id: 'ecosystem.rule.oceanAbsorption',
    name: 'Oceans absorb carbon but accumulate stress',
    priority: 80,
    condition: { id: 'ecosystem.condition.carbonVeryHigh', variableKey: 'carbon', operator: 'gte', value: 130 },
    effects: [
      { kind: 'decrease', variableKey: 'carbon', amount: 0.4 },
      { kind: 'increase', variableKey: 'ocean', amount: 0.5 },
    ],
    category: 'carbon-cycle',
  }),
  makeRule({
    id: 'ecosystem.rule.biodiversityLoss',
    name: 'Sparse vegetation reduces biodiversity',
    priority: 75,
    condition: { id: 'ecosystem.condition.coverSparse', variableKey: 'vegetation', operator: 'lte', value: 50 },
    effects: [{ kind: 'decrease', variableKey: 'biodiversity', amount: 1.5 }],
    category: 'biodiversity',
  }),
  makeRule({
    id: 'ecosystem.rule.biodiversityRecovery',
    name: 'Dense vegetation restores biodiversity',
    priority: 74,
    condition: { id: 'ecosystem.condition.coverDense', variableKey: 'vegetation', operator: 'gte', value: 80 },
    effects: [{ kind: 'increase', variableKey: 'biodiversity', amount: 0.8 }],
    category: 'biodiversity',
  }),
  makeRule({
    id: 'ecosystem.rule.stabilityErosion',
    name: 'Heat and ocean stress erode stability',
    priority: 70,
    conditions: [
      { id: 'ecosystem.condition.erosionHeat', variableKey: 'temperature', operator: 'gte', value: 17 },
    ],
    effects: [{ kind: 'decrease', variableKey: 'ecosystemStability', amount: 1 }],
    category: 'resilience',
  }),
  makeRule({
    id: 'ecosystem.rule.oceanErosion',
    name: 'Ocean stress erodes stability',
    priority: 69,
    condition: { id: 'ecosystem.condition.oceanStressed', variableKey: 'ocean', operator: 'gte', value: 70 },
    effects: [{ kind: 'decrease', variableKey: 'ecosystemStability', amount: 0.6 }],
    category: 'resilience',
  }),
  makeRule({
    id: 'ecosystem.rule.stabilitySupport',
    name: 'Biodiversity supports stability',
    priority: 65,
    condition: { id: 'ecosystem.condition.diverse', variableKey: 'biodiversity', operator: 'gte', value: 60 },
    effects: [{ kind: 'increase', variableKey: 'ecosystemStability', amount: 0.6 }],
    category: 'resilience',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: 'ecosystem.event.volcanicWinter',
    name: 'Volcanic winter',
    description: 'Aerosols temporarily reduce sunlight, temperature and rainfall.',
    type: 'scheduled',
    trigger: { kind: 'scheduled', atStep: 20 },
    probability: 1,
    durationSteps: 6,
    cooldownSteps: 35,
    priority: 90,
    severity: 'critical',
    effects: [
      { kind: 'decrease', variableKey: 'temperature', amount: 1.5 },
      { kind: 'decrease', variableKey: 'precipitation', amount: 15 },
      { kind: 'decrease', variableKey: 'vegetation', amount: 10 },
      { kind: 'percentChange', variableKey: 'biodiversity', percent: -6 },
      { kind: 'log', message: 'Volcanic winter: sunlight and rainfall decline.' },
    ],
    category: 'disaster',
    tags: ['ecosystem', 'climate'],
  }),
  makeEvent({
    id: 'ecosystem.event.conservationPolicy',
    name: 'Conservation policy',
    description: 'Protected areas and restoration improve habitat and carbon uptake.',
    type: 'conditional',
    trigger: { kind: 'threshold', variableKey: 'biodiversity', operator: 'lte', value: 60 },
    probability: 1,
    durationSteps: 8,
    cooldownSteps: 25,
    priority: 85,
    severity: 'notice',
    effects: [
      { kind: 'increase', variableKey: 'vegetation', amount: 8 },
      { kind: 'increase', variableKey: 'biodiversity', amount: 5 },
      { kind: 'increase', variableKey: 'ecosystemStability', amount: 3 },
      { kind: 'multiply', variableKey: 'carbon', factor: 0.95 },
      { kind: 'log', message: 'Conservation policy: habitat restoration begins.' },
    ],
    category: 'policy',
    tags: ['ecosystem', 'policy'],
  }),
  makeEvent({
    id: 'ecosystem.event.heatwave',
    name: 'Heatwave',
    description: 'An extended heatwave dries vegetation and stresses ecosystems.',
    type: 'conditional',
    trigger: { kind: 'threshold', variableKey: 'temperature', operator: 'gte', value: 16.5 },
    probability: 1,
    durationSteps: 4,
    cooldownSteps: 10,
    priority: 85,
    severity: 'warning',
    effects: [
      { kind: 'increase', variableKey: 'temperature', amount: 0.8 },
      { kind: 'decrease', variableKey: 'precipitation', amount: 8 },
      { kind: 'decrease', variableKey: 'vegetation', amount: 6 },
      { kind: 'decrease', variableKey: 'ecosystemStability', amount: 2 },
      { kind: 'log', message: 'Heatwave: vegetation and stability decline.' },
    ],
    category: 'disaster',
    tags: ['ecosystem', 'climate'],
  }),
];

/** Build a fresh, deterministic ecosystem scenario. */
export function ecosystemScenario(): Scenario {
  return createScenario({
    id: 'ecosystem',
    name: 'Ecosystem Feedbacks',
    domain: 'ecosystem',
    description: 'A simplified climate-ecosystem model with carbon, vegetation and stability feedbacks.',
    variables,
    rules,
    events,
    parameters: {
      warmingThreshold: 17,
      carbonAbsorptionThreshold: 70,
      conservationThreshold: 60,
    },
    objectives: [
      {
        id: 'ecosystem.objective.stability',
        name: 'Maintain ecosystem stability above 60',
        variableKey: 'ecosystemStability',
        target: 60,
        operator: 'gte',
      },
      {
        id: 'ecosystem.objective.biodiversity',
        name: 'Keep biodiversity above 60',
        variableKey: 'biodiversity',
        target: 60,
        operator: 'gte',
      },
    ],
    tags: ['ecosystem', 'climate', 'preset'],
    preset: true,
    disclaimer: 'This is a simplified educational model, not a predictive climate forecast.',
  });
}
