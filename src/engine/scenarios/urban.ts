/**
 * Urban-development teaching scenario.
 *
 * Population growth creates housing pressure and energy demand, while transport
 * and infrastructure investment alter employment and environmental quality.
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
    id: `urban.${key}`,
    key,
    name,
    type: 'number',
    initial,
    min,
    max,
    description,
    tags: ['urban'],
  });
}

const variables: VariableDefinition[] = [
  variable('population', 'Population', 100, 0, 300, 'City population index, with 100 as the baseline.'),
  variable('housing', 'Housing Supply', 80, 0, 150, 'Housing availability index.'),
  variable('infrastructure', 'Infrastructure', 70, 0, 150, 'Public infrastructure index.'),
  variable('transportation', 'Transportation', 60, 0, 150, 'Transit service quality index.'),
  variable('employment', 'Employment', 65, 0, 100, 'Employment rate index, in percent.'),
  variable('energy', 'Energy Supply', 75, 0, 150, 'Reliable energy supply index.'),
  variable('environmentQuality', 'Environmental Quality', 70, 0, 100, 'Local environmental quality index.'),
];

const rules: SimulationRule[] = [
  makeRule({
    id: 'urban.rule.housingPressure',
    name: 'Population growth pressures housing',
    priority: 100,
    condition: { id: 'urban.condition.populationGrowing', variableKey: 'population', operator: 'gte', value: 110 },
    effects: [
      { kind: 'decrease', variableKey: 'housing', amount: 1.5 },
      { kind: 'decrease', variableKey: 'environmentQuality', amount: 0.3 },
    ],
    category: 'housing',
  }),
  makeRule({
    id: 'urban.rule.housingInvestment',
    name: 'Housing investment responds to scarcity',
    priority: 95,
    condition: { id: 'urban.condition.housingTight', variableKey: 'housing', operator: 'lte', value: 85 },
    effects: [
      { kind: 'increase', variableKey: 'housing', amount: 2 },
      { kind: 'decrease', variableKey: 'energy', amount: 1 },
      { kind: 'decrease', variableKey: 'environmentQuality', amount: 0.2 },
    ],
    category: 'housing',
  }),
  makeRule({
    id: 'urban.rule.commuteEfficiency',
    name: 'Good transit improves employment',
    priority: 90,
    condition: { id: 'urban.condition.transitGood', variableKey: 'transportation', operator: 'gte', value: 70 },
    effects: [
      { kind: 'increase', variableKey: 'employment', amount: 1 },
      { kind: 'decrease', variableKey: 'environmentQuality', amount: 0.2 },
    ],
    category: 'transport',
  }),
  makeRule({
    id: 'urban.rule.commuteBottleneck',
    name: 'Poor transit limits employment',
    priority: 89,
    condition: { id: 'urban.condition.transitPoor', variableKey: 'transportation', operator: 'lte', value: 55 },
    effects: [{ kind: 'decrease', variableKey: 'employment', amount: 0.8 }],
    category: 'transport',
  }),
  makeRule({
    id: 'urban.rule.infrastructureTransit',
    name: 'Infrastructure improves transit',
    priority: 85,
    condition: { id: 'urban.condition.infrastructureStrong', variableKey: 'infrastructure', operator: 'gte', value: 70 },
    effects: [{ kind: 'increase', variableKey: 'transportation', amount: 1.2 }],
    category: 'investment',
  }),
  makeRule({
    id: 'urban.rule.employmentAttraction',
    name: 'Employment attracts population',
    priority: 80,
    condition: { id: 'urban.condition.employmentHigh', variableKey: 'employment', operator: 'gte', value: 70 },
    effects: [{ kind: 'increase', variableKey: 'population', amount: 1.2 }],
    category: 'demographics',
  }),
  makeRule({
    id: 'urban.rule.employmentDecline',
    name: 'Weak employment reduces population',
    priority: 79,
    condition: { id: 'urban.condition.employmentLow', variableKey: 'employment', operator: 'lte', value: 50 },
    effects: [{ kind: 'decrease', variableKey: 'population', amount: 0.8 }],
    category: 'demographics',
  }),
  makeRule({
    id: 'urban.rule.energyDemand',
    name: 'Population growth increases energy demand',
    priority: 75,
    condition: { id: 'urban.condition.energyDemandHigh', variableKey: 'population', operator: 'gte', value: 110 },
    effects: [{ kind: 'decrease', variableKey: 'energy', amount: 1.5 }],
    category: 'energy',
  }),
  makeRule({
    id: 'urban.rule.energyShortage',
    name: 'Energy shortages degrade infrastructure and transit',
    priority: 70,
    condition: { id: 'urban.condition.energyLow', variableKey: 'energy', operator: 'lte', value: 60 },
    effects: [
      { kind: 'decrease', variableKey: 'infrastructure', amount: 0.5 },
      { kind: 'decrease', variableKey: 'transportation', amount: 0.5 },
    ],
    category: 'energy',
  }),
  makeRule({
    id: 'urban.rule.greenInvestment',
    name: 'Infrastructure investment improves the environment',
    priority: 65,
    conditions: [
      { id: 'urban.condition.environmentLow', variableKey: 'environmentQuality', operator: 'lte', value: 55 },
      { id: 'urban.condition.greenInfrastructure', variableKey: 'infrastructure', operator: 'gte', value: 65 },
    ],
    effects: [
      { kind: 'increase', variableKey: 'environmentQuality', amount: 1 },
      { kind: 'decrease', variableKey: 'energy', amount: 0.5 },
    ],
    category: 'environment',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: 'urban.event.zoningReform',
    name: 'Zoning reform',
    description: 'Upzoning permits more housing but raises local environmental pressure.',
    type: 'scheduled',
    trigger: { kind: 'scheduled', atStep: 12 },
    probability: 1,
    durationSteps: 8,
    cooldownSteps: 25,
    priority: 85,
    severity: 'notice',
    effects: [
      { kind: 'increase', variableKey: 'housing', amount: 10 },
      { kind: 'increase', variableKey: 'population', amount: 2 },
      { kind: 'decrease', variableKey: 'environmentQuality', amount: 2 },
      { kind: 'log', message: 'Zoning reform: housing capacity expands.' },
    ],
    category: 'policy',
    tags: ['urban', 'housing'],
  }),
  makeEvent({
    id: 'urban.event.transitExpansion',
    name: 'Transit expansion',
    description: 'New rail and bus links improve commutes at an energy cost during construction.',
    type: 'conditional',
    trigger: { kind: 'threshold', variableKey: 'transportation', operator: 'lte', value: 60 },
    probability: 1,
    cooldownSteps: 20,
    priority: 85,
    severity: 'info',
    effects: [
      { kind: 'increase', variableKey: 'transportation', amount: 12 },
      { kind: 'increase', variableKey: 'infrastructure', amount: 4 },
      { kind: 'decrease', variableKey: 'energy', amount: 3 },
      { kind: 'increase', variableKey: 'employment', amount: 2 },
      { kind: 'log', message: 'Transit expansion: network coverage increases.' },
    ],
    category: 'investment',
    tags: ['urban', 'transport'],
  }),
  makeEvent({
    id: 'urban.event.energyShock',
    name: 'Energy shock',
    description: 'A price or supply shock reduces reliable energy and transit service.',
    type: 'conditional',
    trigger: { kind: 'threshold', variableKey: 'energy', operator: 'lte', value: 65 },
    probability: 1,
    durationSteps: 5,
    cooldownSteps: 18,
    priority: 85,
    severity: 'critical',
    effects: [
      { kind: 'decrease', variableKey: 'energy', amount: 10 },
      { kind: 'decrease', variableKey: 'transportation', amount: 4 },
      { kind: 'decrease', variableKey: 'employment', amount: 2 },
      { kind: 'log', message: 'Energy shock: services are curtailed.' },
    ],
    category: 'shock',
    tags: ['urban', 'energy'],
  }),
];

/** Build a fresh, deterministic urban scenario. */
export function urbanScenario(): Scenario {
  return createScenario({
    id: 'urban',
    name: 'Urban Growth Pressures',
    domain: 'urban',
    description: 'A simplified city model of housing, commuting, investment and environmental quality.',
    variables,
    rules,
    events,
    parameters: {
      housingPressureThreshold: 110,
      transitGapThreshold: 55,
      baselinePopulation: 100,
    },
    objectives: [
      {
        id: 'urban.objective.housing',
        name: 'Keep housing supply above 90',
        variableKey: 'housing',
        target: 90,
        operator: 'gte',
      },
      {
        id: 'urban.objective.environment',
        name: 'Keep environmental quality above 55',
        variableKey: 'environmentQuality',
        target: 55,
        operator: 'gte',
      },
    ],
    tags: ['urban', 'preset'],
    preset: true,
    disclaimer: 'Simplified educational model; not an urban planning recommendation.',
  });
}
