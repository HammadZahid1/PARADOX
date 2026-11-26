/**
 * Fictional energy-grid teaching preset.
 *
 * The Lumen Isles grid, its plants and its demand figures are invented. Rules
 * use fixed thresholds to represent margins between supply and demand.
 */
import type {
  Condition,
  Scenario,
  SimulationEvent,
  SimulationRule,
  VariableDefinition,
} from '@/engine/types';
import {
  createScenario,
  defaultConfiguration,
  makeEvent,
  makeRule,
  makeVariable,
} from '@/engine/scenarios/factory';

const PREFIX = 'extra-energy';

function metric(
  key: string,
  name: string,
  initial: number,
  min: number,
  max: number,
  description: string,
  unit?: string,
): VariableDefinition {
  return makeVariable({
    id: `${PREFIX}.${key}`,
    key,
    name,
    type: 'number',
    initial,
    min,
    max,
    description,
    ...(unit ? { unit } : {}),
    tags: ['energy', 'extra'],
  });
}

function condition(rule: string, variableKey: string, operator: Condition['operator'], value: Condition['value']): Condition {
  return { id: `${PREFIX}.condition.${rule}.${variableKey}`, variableKey, operator, value };
}

const variables: VariableDefinition[] = [
  metric('demand', 'Island Demand', 100, 40, 200, 'Electrical demand index, with 100 as baseline.'),
  metric('dispatchableGeneration', 'Dispatchable Generation', 100, 30, 200, 'Controllable generation index.'),
  metric('windOutput', 'Wind Output', 70, 0, 160, 'Variable wind generation index.'),
  metric('batteryCharge', 'Battery Charge', 60, 0, 100, 'State of charge of the grid battery, in percent.', '%'),
  metric('reserveMargin', 'Reserve Margin', 15, -20, 60, 'Spare capacity above demand, in percent.', '%'),
  metric('fuelStock', 'Fuel Stock', 80, 0, 150, 'Fuel inventory for dispatchable plants, in index units.'),
  metric('reliability', 'Supply Reliability', 92, 0, 100, 'Share of demand served without interruption, in percent.', '%'),
  metric('priceIndex', 'Wholesale Price Index', 100, 20, 400, 'Fictional wholesale price index.'),
  makeVariable({
    id: `${PREFIX}.netBalance`,
    key: 'netBalance',
    name: 'Net Balance',
    type: 'derived',
    initial: 130,
    min: -200,
    max: 500,
    description: 'Generation plus wind plus battery charge minus demand.',
    derivedFrom: ['dispatchableGeneration', 'windOutput', 'batteryCharge', 'demand'],
    expression: 'dispatchableGeneration + windOutput + batteryCharge - demand',
    tags: ['energy', 'derived'],
  }),
];

const rules: SimulationRule[] = [
  makeRule({
    id: `${PREFIX}.rule.peakDemand`,
    name: 'Peak demand erodes the reserve margin',
    priority: 100,
    condition: condition('peakDemand', 'demand', 'gte', 115),
    effects: [
      { kind: 'decrease', variableKey: 'reserveMargin', amount: 2.5 },
      { kind: 'decrease', variableKey: 'batteryCharge', amount: 4 },
      { kind: 'increase', variableKey: 'priceIndex', amount: 3 },
    ],
    category: 'demand',
  }),
  makeRule({
    id: `${PREFIX}.rule.lowWind`,
    name: 'Low wind reduces the effective margin',
    priority: 95,
    condition: condition('lowWind', 'windOutput', 'lte', 50),
    effects: [
      { kind: 'decrease', variableKey: 'reserveMargin', amount: 2 },
      { kind: 'decrease', variableKey: 'fuelStock', amount: 1.5 },
    ],
    category: 'generation',
  }),
  makeRule({
    id: `${PREFIX}.rule.dispatcherResponse`,
    name: 'Operators raise dispatch when margins tighten',
    priority: 90,
    condition: condition('dispatcherResponse', 'reserveMargin', 'lte', 10),
    effects: [
      { kind: 'increase', variableKey: 'dispatchableGeneration', amount: 3 },
      { kind: 'decrease', variableKey: 'fuelStock', amount: 2 },
    ],
    category: 'operations',
  }),
  makeRule({
    id: `${PREFIX}.rule.batteryRecharge`,
    name: 'Surplus wind recharges the battery',
    priority: 85,
    condition: condition('batteryRecharge', 'windOutput', 'gte', 110),
    effects: [
      { kind: 'increase', variableKey: 'batteryCharge', amount: 5 },
      { kind: 'increase', variableKey: 'reserveMargin', amount: 0.8 },
    ],
    category: 'storage',
  }),
  makeRule({
    id: `${PREFIX}.rule.fuelConstraint`,
    name: 'Low fuel inventories limit reliability',
    priority: 80,
    condition: condition('fuelConstraint', 'fuelStock', 'lte', 45),
    effects: [
      { kind: 'decrease', variableKey: 'reliability', amount: 1.5 },
      { kind: 'increase', variableKey: 'priceIndex', amount: 2 },
    ],
    category: 'fuel',
  }),
  makeRule({
    id: `${PREFIX}.rule.strongReliability`,
    name: 'A healthy margin supports reliability',
    priority: 75,
    condition: condition('strongReliability', 'reserveMargin', 'gte', 18),
    effects: [
      { kind: 'increase', variableKey: 'reliability', amount: 0.5 },
      { kind: 'decrease', variableKey: 'priceIndex', amount: 1 },
    ],
    category: 'operations',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: `${PREFIX}.event.windLull`,
    name: 'Multi-day wind lull',
    description: 'A fictional weather pattern suppresses wind output and raises demand for fuel.',
    trigger: { kind: 'scheduled', atStep: 10 },
    probability: 1,
    durationSteps: 4,
    cooldownSteps: 20,
    priority: 85,
    severity: 'warning',
    effects: [{ kind: 'log', message: 'Wind lull forecast issued.' }],
    outcomes: [
      {
        id: `${PREFIX}.outcome.windLull.short`,
        name: 'Short lull',
        description: 'A brief dip that the battery can absorb.',
        probability: 0.65,
        effects: [
          { kind: 'decrease', variableKey: 'windOutput', amount: 22 },
          { kind: 'decrease', variableKey: 'batteryCharge', amount: 8 },
          { kind: 'log', message: 'Short wind lull observed.' },
        ],
      },
      {
        id: `${PREFIX}.outcome.windLull.long`,
        name: 'Long lull',
        description: 'A prolonged dip that draws down fuel stocks.',
        probability: 0.35,
        effects: [
          { kind: 'multiply', variableKey: 'windOutput', factor: 0.5 },
          { kind: 'decrease', variableKey: 'fuelStock', amount: 15 },
          { kind: 'decrease', variableKey: 'batteryCharge', amount: 16 },
          { kind: 'log', message: 'Long wind lull observed.' },
        ],
      },
    ],
    category: 'shock',
    tags: ['energy', 'weather'],
  }),
  makeEvent({
    id: `${PREFIX}.event.reserveAlert`,
    name: 'Reserve margin alert',
    description: 'The system operator commits additional capacity when the margin is thin.',
    trigger: { kind: 'threshold', variableKey: 'reserveMargin', operator: 'lte', value: 8 },
    probability: 1,
    cooldownSteps: 16,
    priority: 90,
    severity: 'critical',
    effects: [
      { kind: 'increase', variableKey: 'dispatchableGeneration', amount: 12 },
      { kind: 'increase', variableKey: 'reserveMargin', amount: 6 },
      { kind: 'log', message: 'Reserve margin alert triggered; additional capacity committed.' },
    ],
    category: 'operations',
    tags: ['energy', 'response'],
  }),
  makeEvent({
    id: `${PREFIX}.event.fuelDelivery`,
    name: 'Fuel delivery',
    description: 'A scheduled delivery refills the fictional island fuel depot.',
    trigger: { kind: 'threshold', variableKey: 'fuelStock', operator: 'lte', value: 50 },
    probability: 1,
    cooldownSteps: 14,
    priority: 80,
    severity: 'notice',
    effects: [
      { kind: 'assign', variableKey: 'fuelStock', value: 95 },
      { kind: 'log', message: 'Fuel delivery completed.' },
    ],
    category: 'fuel',
    tags: ['energy', 'logistics'],
  }),
];

/** Build a fresh, deterministic fictional energy-grid scenario. */
export function energyScenario(): Scenario {
  return createScenario({
    id: PREFIX,
    name: 'Lumen Isles Grid',
    description: 'A fictional island grid balancing demand, wind, batteries, fuel and reliability.',
    domain: 'energy',
    variables,
    rules,
    events,
    parameters: {
      peakDemand: 115,
      lowWind: 50,
      reserveFloor: 8,
      reorderPoint: 50,
    },
    objectives: [
      {
        id: `${PREFIX}.objective.reliability`,
        name: 'Keep reliability above 85%',
        variableKey: 'reliability',
        target: 85,
        operator: 'gte',
      },
      {
        id: `${PREFIX}.objective.reserve`,
        name: 'Maintain a reserve margin of at least 5%',
        variableKey: 'reserveMargin',
        target: 5,
        operator: 'gte',
      },
    ],
    tags: ['energy', 'extra', 'preset'],
    preset: true,
    disclaimer: 'Simplified fictional grid model; not engineering advice or an operational forecast.',
    configuration: defaultConfiguration({ seed: 42002, maxSteps: 60, propagationLimit: 5, autoSnapshotSteps: 6 }),
  });
}
