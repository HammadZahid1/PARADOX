/**
 * Fictional healthcare-operations teaching preset.
 *
 * The Northvale Regional Network and all figures below are invented. The rules
 * use fixed thresholds as stand-ins for operational gaps because conditions
 * cannot compare two variables directly.
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

const PREFIX = 'extra-healthcare';

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
    tags: ['healthcare', 'extra'],
  });
}

function condition(rule: string, variableKey: string, operator: Condition['operator'], value: Condition['value']): Condition {
  return { id: `${PREFIX}.condition.${rule}.${variableKey}`, variableKey, operator, value };
}

const variables: VariableDefinition[] = [
  metric('patientsWaiting', 'Patients Waiting', 120, 0, 600, 'Patients awaiting a bed or consultation.', 'patients'),
  metric('bedOccupancy', 'Bed Occupancy', 78, 0, 100, 'Share of staffed beds in use, in percent.', '%'),
  metric('staffCoverage', 'Staff Coverage', 88, 0, 100, 'Share of planned clinical shifts filled, in percent.', '%'),
  metric('routineVisits', 'Routine Visits', 100, 0, 200, 'Scheduled consultation volume index, with 100 as baseline.'),
  metric('emergencyArrivals', 'Emergency Arrivals', 100, 0, 250, 'Unscheduled arrival index, with 100 as baseline.'),
  metric('supplyStock', 'Medical Supply Stock', 80, 0, 150, 'Available consumables index.'),
  metric('patientSatisfaction', 'Patient Satisfaction', 72, 0, 100, 'Surveyed satisfaction score, in percent.', '%'),
  makeVariable({
    id: `${PREFIX}.careLoad`,
    key: 'careLoad',
    name: 'Care Load Index',
    type: 'derived',
    initial: 1.36,
    min: 0,
    max: 20,
    description: 'Waiting patients per staff coverage unit (patientsWaiting / staffCoverage).',
    derivedFrom: ['patientsWaiting', 'staffCoverage'],
    expression: 'patientsWaiting / staffCoverage',
    tags: ['healthcare', 'derived'],
  }),
];

const rules: SimulationRule[] = [
  makeRule({
    id: `${PREFIX}.rule.surgeLoad`,
    name: 'Arrival surges extend the waiting list',
    priority: 100,
    conditions: [
      condition('surgeLoad', 'emergencyArrivals', 'gte', 115),
      condition('surgeLoad', 'patientsWaiting', 'gte', 140),
    ],
    effects: [
      { kind: 'increase', variableKey: 'patientsWaiting', amount: 8 },
      { kind: 'decrease', variableKey: 'patientSatisfaction', amount: 1.5 },
    ],
    category: 'capacity',
  }),
  makeRule({
    id: `${PREFIX}.rule.bedPressure`,
    name: 'Full beds slow patient flow',
    priority: 95,
    condition: condition('bedPressure', 'bedOccupancy', 'gte', 90),
    effects: [
      { kind: 'increase', variableKey: 'patientsWaiting', amount: 6 },
      { kind: 'decrease', variableKey: 'patientSatisfaction', amount: 0.5 },
    ],
    category: 'capacity',
  }),
  makeRule({
    id: `${PREFIX}.rule.staffingRelief`,
    name: 'Full staffing clears the backlog',
    priority: 90,
    condition: condition('staffingRelief', 'staffCoverage', 'gte', 92),
    effects: [
      { kind: 'decrease', variableKey: 'patientsWaiting', amount: 5 },
      { kind: 'increase', variableKey: 'patientSatisfaction', amount: 0.6 },
    ],
    category: 'workforce',
  }),
  makeRule({
    id: `${PREFIX}.rule.supplyShortage`,
    name: 'Supply shortages degrade care quality',
    priority: 85,
    condition: condition('supplyShortage', 'supplyStock', 'lte', 60),
    effects: [
      { kind: 'decrease', variableKey: 'staffCoverage', amount: 1 },
      { kind: 'decrease', variableKey: 'patientSatisfaction', amount: 1 },
    ],
    category: 'supplies',
  }),
  makeRule({
    id: `${PREFIX}.rule.routineThroughput`,
    name: 'Routine clinics consume supplies but reduce waits',
    priority: 80,
    condition: condition('routineThroughput', 'routineVisits', 'gte', 110),
    effects: [
      { kind: 'decrease', variableKey: 'patientsWaiting', amount: 3 },
      { kind: 'decrease', variableKey: 'supplyStock', amount: 2 },
    ],
    category: 'flow',
  }),
  makeRule({
    id: `${PREFIX}.rule.qualityImprovement`,
    name: 'Stable staffing supports improvement work',
    priority: 75,
    conditions: [
      condition('qualityImprovement', 'patientSatisfaction', 'lte', 65),
      condition('qualityImprovement', 'staffCoverage', 'gte', 85),
    ],
    effects: [
      { kind: 'increase', variableKey: 'patientSatisfaction', amount: 2 },
      { kind: 'decrease', variableKey: 'patientsWaiting', amount: 1 },
    ],
    category: 'quality',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: `${PREFIX}.event.winterSurge`,
    name: 'Winter respiratory surge',
    description: 'A fictional seasonal surge changes unscheduled arrivals and consumable use.',
    trigger: { kind: 'scheduled', atStep: 8 },
    probability: 1,
    durationSteps: 4,
    cooldownSteps: 20,
    priority: 80,
    severity: 'warning',
    effects: [{ kind: 'log', message: 'Winter respiratory surge announced.' }],
    outcomes: [
      {
        id: `${PREFIX}.outcome.winterSurge.mild`,
        name: 'Mild surge',
        description: 'A modest rise in arrivals with a small supply drawdown.',
        probability: 0.6,
        effects: [
          { kind: 'increase', variableKey: 'emergencyArrivals', amount: 12 },
          { kind: 'decrease', variableKey: 'supplyStock', amount: 8 },
          { kind: 'log', message: 'Mild respiratory surge recorded.' },
        ],
      },
      {
        id: `${PREFIX}.outcome.winterSurge.severe`,
        name: 'Severe surge',
        description: 'A sharp arrival spike strains staffing and supplies.',
        probability: 0.4,
        effects: [
          { kind: 'increase', variableKey: 'emergencyArrivals', amount: 28 },
          { kind: 'decrease', variableKey: 'staffCoverage', amount: 6 },
          { kind: 'decrease', variableKey: 'supplyStock', amount: 18 },
          { kind: 'log', message: 'Severe respiratory surge recorded.' },
        ],
      },
    ],
    category: 'shock',
    tags: ['healthcare', 'surge'],
  }),
  makeEvent({
    id: `${PREFIX}.event.staffRecall`,
    name: 'Emergency staff recall',
    description: 'The network recalls off-duty clinicians when coverage falls too low.',
    trigger: { kind: 'threshold', variableKey: 'staffCoverage', operator: 'lte', value: 70 },
    probability: 1,
    cooldownSteps: 18,
    priority: 90,
    severity: 'warning',
    effects: [
      { kind: 'assign', variableKey: 'staffCoverage', value: 85 },
      { kind: 'increase', variableKey: 'patientSatisfaction', amount: 3 },
      { kind: 'log', message: 'Emergency staff recall restored planned coverage.' },
    ],
    category: 'workforce',
    tags: ['healthcare', 'response'],
  }),
  makeEvent({
    id: `${PREFIX}.event.supplyRestock`,
    name: 'Supply restock',
    description: 'Central stores replenish consumables when stock falls below the reorder point.',
    trigger: { kind: 'threshold', variableKey: 'supplyStock', operator: 'lte', value: 58 },
    probability: 1,
    cooldownSteps: 15,
    priority: 85,
    severity: 'notice',
    effects: [
      { kind: 'assign', variableKey: 'supplyStock', value: 95 },
      { kind: 'log', message: 'Medical supplies restocked to target level.' },
    ],
    category: 'supplies',
    tags: ['healthcare', 'logistics'],
  }),
];

/** Build a fresh, deterministic fictional healthcare scenario. */
export function healthcareScenario(): Scenario {
  return createScenario({
    id: PREFIX,
    name: 'Northvale Regional Health Network',
    description: 'A fictional hospital network balancing arrivals, beds, staffing, supplies and patient experience.',
    domain: 'healthcare',
    variables,
    rules,
    events,
    parameters: {
      waitingTarget: 150,
      occupancyCeiling: 90,
      reorderPoint: 58,
      baselineIndex: 100,
    },
    objectives: [
      {
        id: `${PREFIX}.objective.waiting`,
        name: 'Keep the waiting list below 150 patients',
        variableKey: 'patientsWaiting',
        target: 150,
        operator: 'lte',
      },
      {
        id: `${PREFIX}.objective.satisfaction`,
        name: 'Maintain satisfaction of at least 70%',
        variableKey: 'patientSatisfaction',
        target: 70,
        operator: 'gte',
      },
    ],
    tags: ['healthcare', 'extra', 'preset'],
    preset: true,
    disclaimer: 'Fictional teaching model; not medical, operational or policy advice.',
    configuration: defaultConfiguration({ seed: 41001, maxSteps: 60, autoSnapshotSteps: 6 }),
  });
}
