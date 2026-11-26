/**
 * Fictional disaster-response teaching preset.
 *
 * Sable Coast, its storm and all response figures are invented. The model is
 * an illustration of coordination feedbacks, not emergency-management advice.
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

const PREFIX = 'extra-disaster';

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
    tags: ['disaster', 'extra'],
  });
}

function condition(rule: string, variableKey: string, operator: Condition['operator'], value: Condition['value']): Condition {
  return { id: `${PREFIX}.condition.${rule}.${variableKey}`, variableKey, operator, value };
}

const variables: VariableDefinition[] = [
  metric('hazardIntensity', 'Storm Intensity', 30, 0, 100, 'Fictional storm intensity index.'),
  metric('preparedness', 'Preparedness', 70, 0, 100, 'Readiness score before landfall, in percent.', '%'),
  metric('evacuationCoverage', 'Evacuation Coverage', 65, 0, 100, 'Share of exposed residents reached, in percent.', '%'),
  metric('shelterCapacity', 'Shelter Capacity', 80, 0, 150, 'Available shelter places index.'),
  metric('responseTime', 'Response Time', 45, 0, 180, 'Time to first field team arrival.', 'minutes'),
  metric('communications', 'Communications', 75, 0, 100, 'Share of usable alert channels, in percent.', '%'),
  metric('supplyReadiness', 'Supply Readiness', 72, 0, 100, 'Emergency supply availability, in percent.', '%'),
  metric('recoveryProgress', 'Recovery Progress', 20, 0, 100, 'Fictional restoration progress, in percent.', '%'),
  makeVariable({
    id: `${PREFIX}.resilience`,
    key: 'resilience',
    name: 'Resilience Index',
    type: 'derived',
    initial: 120,
    min: -100,
    max: 250,
    description: 'Preparedness plus shelter capacity minus hazard intensity.',
    derivedFrom: ['preparedness', 'shelterCapacity', 'hazardIntensity'],
    expression: 'preparedness + shelterCapacity - hazardIntensity',
    tags: ['disaster', 'derived'],
  }),
];

const rules: SimulationRule[] = [
  makeRule({
    id: `${PREFIX}.rule.stormEscalation`,
    name: 'Stronger storms slow the response',
    priority: 100,
    condition: condition('stormEscalation', 'hazardIntensity', 'gte', 60),
    effects: [
      { kind: 'increase', variableKey: 'responseTime', amount: 5 },
      { kind: 'decrease', variableKey: 'evacuationCoverage', amount: 2 },
    ],
    category: 'hazard',
  }),
  makeRule({
    id: `${PREFIX}.rule.preparationDividend`,
    name: 'Preparedness shortens response times',
    priority: 95,
    condition: condition('preparationDividend', 'preparedness', 'gte', 80),
    effects: [
      { kind: 'decrease', variableKey: 'responseTime', amount: 3 },
      { kind: 'increase', variableKey: 'evacuationCoverage', amount: 1.5 },
    ],
    category: 'readiness',
  }),
  makeRule({
    id: `${PREFIX}.rule.alertFailure`,
    name: 'Broken communications reduce evacuation',
    priority: 90,
    condition: condition('alertFailure', 'communications', 'lte', 50),
    effects: [
      { kind: 'decrease', variableKey: 'evacuationCoverage', amount: 4 },
      { kind: 'increase', variableKey: 'responseTime', amount: 2 },
    ],
    category: 'communications',
  }),
  makeRule({
    id: `${PREFIX}.rule.shelterStrain`,
    name: 'Crowded shelters slow recovery',
    priority: 85,
    condition: condition('shelterStrain', 'shelterCapacity', 'lte', 60),
    effects: [
      { kind: 'decrease', variableKey: 'recoveryProgress', amount: 2 },
      { kind: 'increase', variableKey: 'responseTime', amount: 1 },
    ],
    category: 'shelter',
  }),
  makeRule({
    id: `${PREFIX}.rule.supplyDistribution`,
    name: 'Ready supplies accelerate recovery',
    priority: 80,
    condition: condition('supplyDistribution', 'supplyReadiness', 'gte', 85),
    effects: [{ kind: 'increase', variableKey: 'recoveryProgress', amount: 2.5 }],
    category: 'logistics',
  }),
  makeRule({
    id: `${PREFIX}.rule.rapidArrival`,
    name: 'Fast teams improve recovery',
    priority: 75,
    condition: condition('rapidArrival', 'responseTime', 'lte', 35),
    effects: [
      { kind: 'increase', variableKey: 'recoveryProgress', amount: 1.5 },
      { kind: 'increase', variableKey: 'evacuationCoverage', amount: 0.5 },
    ],
    category: 'response',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: `${PREFIX}.event.coastalStorm`,
    name: 'Sable Coast storm',
    description: 'A fictional storm landfall with two illustrative severities.',
    trigger: { kind: 'scheduled', atStep: 6 },
    probability: 1,
    durationSteps: 5,
    cooldownSteps: 22,
    priority: 90,
    severity: 'critical',
    effects: [{ kind: 'log', message: 'Sable Coast storm watch issued.' }],
    outcomes: [
      {
        id: `${PREFIX}.outcome.coastalStorm.moderate`,
        name: 'Moderate landfall',
        description: 'A manageable surge with limited communications loss.',
        probability: 0.6,
        effects: [
          { kind: 'increase', variableKey: 'hazardIntensity', amount: 25 },
          { kind: 'decrease', variableKey: 'communications', amount: 8 },
          { kind: 'log', message: 'Moderate storm landfall recorded.' },
        ],
      },
      {
        id: `${PREFIX}.outcome.coastalStorm.severe`,
        name: 'Severe landfall',
        description: 'A severe surge that damages channels and shelter capacity.',
        probability: 0.4,
        effects: [
          { kind: 'increase', variableKey: 'hazardIntensity', amount: 45 },
          { kind: 'decrease', variableKey: 'communications', amount: 22 },
          { kind: 'decrease', variableKey: 'shelterCapacity', amount: 18 },
          { kind: 'log', message: 'Severe storm landfall recorded.' },
        ],
      },
    ],
    category: 'hazard',
    tags: ['disaster', 'storm'],
  }),
  makeEvent({
    id: `${PREFIX}.event.emergencyDeclaration`,
    name: 'Emergency declaration',
    description: 'Regional coordinators mobilise extra staff when the storm intensifies.',
    trigger: { kind: 'threshold', variableKey: 'hazardIntensity', operator: 'gte', value: 70 },
    probability: 1,
    cooldownSteps: 16,
    priority: 95,
    severity: 'warning',
    effects: [
      { kind: 'increase', variableKey: 'preparedness', amount: 10 },
      { kind: 'increase', variableKey: 'supplyReadiness', amount: 12 },
      { kind: 'log', message: 'Emergency declaration activated mutual aid.' },
    ],
    category: 'response',
    tags: ['disaster', 'coordination'],
  }),
  makeEvent({
    id: `${PREFIX}.event.shelterExpansion`,
    name: 'Shelter expansion',
    description: 'Emergency shelter places are added when capacity falls below the floor.',
    trigger: { kind: 'threshold', variableKey: 'shelterCapacity', operator: 'lte', value: 60 },
    probability: 1,
    cooldownSteps: 14,
    priority: 85,
    severity: 'notice',
    effects: [
      { kind: 'increase', variableKey: 'shelterCapacity', amount: 22 },
      { kind: 'log', message: 'Additional shelter places opened.' },
    ],
    category: 'shelter',
    tags: ['disaster', 'shelter'],
  }),
];

/** Build a fresh, deterministic fictional disaster-response scenario. */
export function disasterScenario(): Scenario {
  return createScenario({
    id: PREFIX,
    name: 'Sable Coast Storm Response',
    description: 'A fictional coastal response exercise following hazard, communication, shelter and recovery loops.',
    domain: 'disaster-response',
    variables,
    rules,
    events,
    parameters: {
      stormAlert: 70,
      shelterFloor: 60,
      communicationFloor: 50,
      baselineIndex: 100,
    },
    objectives: [
      {
        id: `${PREFIX}.objective.responseTime`,
        name: 'Keep first response under 60 minutes',
        variableKey: 'responseTime',
        target: 60,
        operator: 'lte',
      },
      {
        id: `${PREFIX}.objective.recovery`,
        name: 'Reach at least 50% recovery progress',
        variableKey: 'recoveryProgress',
        target: 50,
        operator: 'gte',
      },
    ],
    tags: ['disaster', 'extra', 'preset', 'exercise'],
    preset: true,
    disclaimer: 'Fictional tabletop teaching model; not emergency-management advice or a real-world warning.',
    configuration: defaultConfiguration({ seed: 49009, maxSteps: 60, propagationLimit: 5, autoSnapshotSteps: 6 }),
  });
}
