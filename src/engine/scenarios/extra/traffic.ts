/**
 * Fictional urban-traffic teaching preset for Cobalt City.
 *
 * All corridors, signals and figures are invented. Fixed thresholds stand in
 * for differences between variables that conditions cannot compare directly.
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

const PREFIX = 'extra-traffic';

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
    tags: ['traffic', 'extra'],
  });
}

function condition(rule: string, variableKey: string, operator: Condition['operator'], value: Condition['value']): Condition {
  return { id: `${PREFIX}.condition.${rule}.${variableKey}`, variableKey, operator, value };
}

const variables: VariableDefinition[] = [
  metric('trafficVolume', 'Corridor Volume', 100, 20, 220, 'Vehicles entering the modelled corridor, indexed to 100.'),
  metric('roadCapacity', 'Road Capacity', 90, 30, 180, 'Available lane capacity index.'),
  metric('signalEfficiency', 'Signal Efficiency', 70, 0, 100, 'Average signal coordination score, in percent.', '%'),
  metric('transitCapacity', 'Transit Capacity', 80, 20, 180, 'Bus and tram capacity index.'),
  metric('commuteTime', 'Average Commute', 32, 5, 120, 'Average peak-direction travel time.', 'minutes'),
  metric('incidentRate', 'Incident Rate', 12, 0, 80, 'Modelled incidents per period index.'),
  metric('airQuality', 'Air Quality', 75, 0, 100, 'Local air-quality index, higher is better.'),
  metric('transitModeShare', 'Transit Mode Share', 35, 0, 90, 'Share of trips using transit, in percent.', '%'),
  makeVariable({
    id: `${PREFIX}.congestionIndex`,
    key: 'congestionIndex',
    name: 'Congestion Index',
    type: 'derived',
    initial: 10,
    min: -150,
    max: 200,
    description: 'Demand above road capacity (trafficVolume - roadCapacity).',
    derivedFrom: ['trafficVolume', 'roadCapacity'],
    expression: 'trafficVolume - roadCapacity',
    tags: ['traffic', 'derived'],
  }),
];

const rules: SimulationRule[] = [
  makeRule({
    id: `${PREFIX}.rule.corridorSaturation`,
    name: 'Excess demand lengthens commutes',
    priority: 100,
    condition: condition('corridorSaturation', 'trafficVolume', 'gte', 115),
    effects: [
      { kind: 'increase', variableKey: 'commuteTime', amount: 2.5 },
      { kind: 'decrease', variableKey: 'airQuality', amount: 1 },
    ],
    category: 'congestion',
  }),
  makeRule({
    id: `${PREFIX}.rule.signalCoordination`,
    name: 'Coordinated signals shorten trips',
    priority: 95,
    condition: condition('signalCoordination', 'signalEfficiency', 'gte', 78),
    effects: [
      { kind: 'decrease', variableKey: 'commuteTime', amount: 1.5 },
      { kind: 'increase', variableKey: 'airQuality', amount: 0.3 },
    ],
    category: 'operations',
  }),
  makeRule({
    id: `${PREFIX}.rule.transitShift`,
    name: 'Reliable transit attracts riders',
    priority: 90,
    condition: condition('transitShift', 'transitCapacity', 'gte', 95),
    effects: [
      { kind: 'increase', variableKey: 'transitModeShare', amount: 2 },
      { kind: 'decrease', variableKey: 'trafficVolume', amount: 3 },
    ],
    category: 'transit',
  }),
  makeRule({
    id: `${PREFIX}.rule.incidentDelay`,
    name: 'Incidents reduce usable capacity',
    priority: 85,
    condition: condition('incidentDelay', 'incidentRate', 'gte', 20),
    effects: [
      { kind: 'decrease', variableKey: 'roadCapacity', amount: 3 },
      { kind: 'increase', variableKey: 'commuteTime', amount: 1.5 },
    ],
    category: 'safety',
  }),
  makeRule({
    id: `${PREFIX}.rule.cleanerAir`,
    name: 'High transit share improves air quality',
    priority: 80,
    condition: condition('cleanerAir', 'transitModeShare', 'gte', 45),
    effects: [{ kind: 'increase', variableKey: 'airQuality', amount: 1 }],
    category: 'environment',
  }),
  makeRule({
    id: `${PREFIX}.rule.demandRecovery`,
    name: 'Short trips recover when congestion clears',
    priority: 75,
    condition: condition('demandRecovery', 'commuteTime', 'lte', 30),
    effects: [
      { kind: 'increase', variableKey: 'trafficVolume', amount: 1 },
      { kind: 'increase', variableKey: 'airQuality', amount: 0.2 },
    ],
    category: 'demand',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: `${PREFIX}.event.bridgeClosure`,
    name: 'River bridge closure',
    description: 'A fictional bridge closure diverts corridor traffic for several periods.',
    trigger: { kind: 'scheduled', atStep: 7 },
    probability: 1,
    durationSteps: 4,
    cooldownSteps: 20,
    priority: 85,
    severity: 'warning',
    effects: [{ kind: 'log', message: 'River bridge closure announced.' }],
    outcomes: [
      {
        id: `${PREFIX}.outcome.bridgeClosure.partial`,
        name: 'Partial closure',
        description: 'One lane is closed and diversions add moderate delay.',
        probability: 0.6,
        effects: [
          { kind: 'decrease', variableKey: 'roadCapacity', amount: 12 },
          { kind: 'increase', variableKey: 'commuteTime', amount: 5 },
          { kind: 'log', message: 'Partial bridge closure in effect.' },
        ],
      },
      {
        id: `${PREFIX}.outcome.bridgeClosure.full`,
        name: 'Full closure',
        description: 'All lanes close, sharply increasing incidents and delay.',
        probability: 0.4,
        effects: [
          { kind: 'decrease', variableKey: 'roadCapacity', amount: 24 },
          { kind: 'increase', variableKey: 'incidentRate', amount: 10 },
          { kind: 'increase', variableKey: 'commuteTime', amount: 11 },
          { kind: 'log', message: 'Full bridge closure in effect.' },
        ],
      },
    ],
    category: 'disruption',
    tags: ['traffic', 'network'],
  }),
  makeEvent({
    id: `${PREFIX}.event.signalUpgrade`,
    name: 'Adaptive signal upgrade',
    description: 'The city upgrades signal timing when average commutes become excessive.',
    trigger: { kind: 'threshold', variableKey: 'commuteTime', operator: 'gte', value: 45 },
    probability: 1,
    cooldownSteps: 16,
    priority: 90,
    severity: 'notice',
    effects: [
      { kind: 'increase', variableKey: 'signalEfficiency', amount: 12 },
      { kind: 'log', message: 'Adaptive signal timing activated.' },
    ],
    category: 'operations',
    tags: ['traffic', 'upgrade'],
  }),
  makeEvent({
    id: `${PREFIX}.event.transitExpansion`,
    name: 'Transit expansion',
    description: 'Additional tram service is introduced when mode share is low.',
    trigger: { kind: 'threshold', variableKey: 'transitModeShare', operator: 'lte', value: 25 },
    probability: 1,
    cooldownSteps: 18,
    priority: 80,
    severity: 'notice',
    effects: [
      { kind: 'increase', variableKey: 'transitCapacity', amount: 18 },
      { kind: 'log', message: 'Transit expansion opened in the teaching model.' },
    ],
    category: 'transit',
    tags: ['traffic', 'policy'],
  }),
];

/** Build a fresh, deterministic fictional traffic scenario. */
export function trafficScenario(): Scenario {
  return createScenario({
    id: PREFIX,
    name: 'Cobalt City Commuter Corridor',
    description: 'A fictional commuter corridor where demand, signals, incidents and transit shape travel time.',
    domain: 'traffic',
    variables,
    rules,
    events,
    parameters: {
      demandThreshold: 115,
      commuteCeiling: 45,
      transitFloor: 25,
      baselineIndex: 100,
    },
    objectives: [
      {
        id: `${PREFIX}.objective.commute`,
        name: 'Keep the average commute below 40 minutes',
        variableKey: 'commuteTime',
        target: 40,
        operator: 'lte',
      },
      {
        id: `${PREFIX}.objective.airQuality`,
        name: 'Maintain air quality above 65',
        variableKey: 'airQuality',
        target: 65,
        operator: 'gte',
      },
    ],
    tags: ['traffic', 'extra', 'preset'],
    preset: true,
    disclaimer: 'Simplified fictional transport model; not traffic-engineering advice or a real-world forecast.',
    configuration: defaultConfiguration({ seed: 44004, maxSteps: 60, autoSnapshotSteps: 6 }),
  });
}
