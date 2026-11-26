/**
 * Fictional manufacturing teaching preset.
 *
 * Kestrel Works and all production figures are invented. The rules use fixed
 * thresholds as proxies for gaps that conditions cannot compare directly.
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

const PREFIX = 'extra-manufacturing';

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
    tags: ['manufacturing', 'extra'],
  });
}

function condition(rule: string, variableKey: string, operator: Condition['operator'], value: Condition['value']): Condition {
  return { id: `${PREFIX}.condition.${rule}.${variableKey}`, variableKey, operator, value };
}

const variables: VariableDefinition[] = [
  metric('orders', 'Open Orders', 100, 20, 220, 'Order backlog index, with 100 as baseline.'),
  metric('throughput', 'Throughput', 100, 20, 220, 'Completed units index.'),
  metric('machineAvailability', 'Machine Availability', 88, 0, 100, 'Share of planned production time available, in percent.', '%'),
  metric('defectRate', 'Defect Rate', 4.2, 0, 25, 'Share of units failing inspection, in percent.', '%'),
  metric('inventory', 'Work-in-Progress Inventory', 80, 0, 200, 'Inventory index.'),
  metric('energyUse', 'Energy Intensity', 75, 0, 150, 'Energy per completed unit index.'),
  metric('qualityChecks', 'Quality Check Coverage', 85, 0, 100, 'Share of lots inspected, in percent.', '%'),
  metric('downtime', 'Unplanned Downtime', 10, 0, 80, 'Unplanned stoppage time index.'),
  makeVariable({
    id: `${PREFIX}.effectiveYield`,
    key: 'effectiveYield',
    name: 'Effective Yield',
    type: 'derived',
    initial: 74.8,
    min: 0,
    max: 100,
    description: 'Availability multiplied by quality coverage, indexed to 100.',
    derivedFrom: ['machineAvailability', 'qualityChecks'],
    expression: 'machineAvailability * qualityChecks / 100',
    tags: ['manufacturing', 'derived'],
  }),
];

const rules: SimulationRule[] = [
  makeRule({
    id: `${PREFIX}.rule.orderPush`,
    name: 'High order backlog raises throughput',
    priority: 100,
    condition: condition('orderPush', 'orders', 'gte', 115),
    effects: [
      { kind: 'increase', variableKey: 'throughput', amount: 3 },
      { kind: 'decrease', variableKey: 'inventory', amount: 2 },
    ],
    category: 'planning',
  }),
  makeRule({
    id: `${PREFIX}.rule.availabilityLoss`,
    name: 'Downtime reduces availability',
    priority: 95,
    condition: condition('availabilityLoss', 'downtime', 'gte', 18),
    effects: [
      { kind: 'decrease', variableKey: 'machineAvailability', amount: 2 },
      { kind: 'decrease', variableKey: 'throughput', amount: 1.5 },
    ],
    category: 'maintenance',
  }),
  makeRule({
    id: `${PREFIX}.rule.qualityInspection`,
    name: 'More inspection reduces defects',
    priority: 90,
    condition: condition('qualityInspection', 'qualityChecks', 'gte', 90),
    effects: [
      { kind: 'decrease', variableKey: 'defectRate', amount: 0.8 },
      { kind: 'increase', variableKey: 'energyUse', amount: 0.5 },
    ],
    category: 'quality',
  }),
  makeRule({
    id: `${PREFIX}.rule.defectRework`,
    name: 'Defects build rework inventory',
    priority: 85,
    condition: condition('defectRework', 'defectRate', 'gte', 7),
    effects: [
      { kind: 'increase', variableKey: 'inventory', amount: 3 },
      { kind: 'decrease', variableKey: 'throughput', amount: 1 },
    ],
    category: 'quality',
  }),
  makeRule({
    id: `${PREFIX}.rule.energyPressure`,
    name: 'High energy intensity limits availability',
    priority: 80,
    condition: condition('energyPressure', 'energyUse', 'gte', 100),
    effects: [
      { kind: 'decrease', variableKey: 'machineAvailability', amount: 1 },
      { kind: 'increase', variableKey: 'downtime', amount: 1.5 },
    ],
    category: 'utilities',
  }),
  makeRule({
    id: `${PREFIX}.rule.maintenanceCulture`,
    name: 'Reliable machines need less rework',
    priority: 75,
    condition: condition('maintenanceCulture', 'machineAvailability', 'gte', 92),
    effects: [
      { kind: 'decrease', variableKey: 'downtime', amount: 1 },
      { kind: 'decrease', variableKey: 'defectRate', amount: 0.3 },
    ],
    category: 'maintenance',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: `${PREFIX}.event.supplierDelay`,
    name: 'Supplier delay',
    description: 'A fictional component delay changes production and rework in the plant.',
    trigger: { kind: 'scheduled', atStep: 8 },
    probability: 1,
    durationSteps: 3,
    cooldownSteps: 18,
    priority: 85,
    severity: 'warning',
    effects: [{ kind: 'log', message: 'Supplier delay reported to production planning.' }],
    outcomes: [
      {
        id: `${PREFIX}.outcome.supplierDelay.minor`,
        name: 'Minor delay',
        description: 'Buffer stock absorbs most of the disruption.',
        probability: 0.6,
        effects: [
          { kind: 'decrease', variableKey: 'inventory', amount: 12 },
          { kind: 'decrease', variableKey: 'throughput', amount: 5 },
          { kind: 'log', message: 'Minor supplier delay recorded.' },
        ],
      },
      {
        id: `${PREFIX}.outcome.supplierDelay.major`,
        name: 'Major delay',
        description: 'The line stops briefly and defects rise during restart.',
        probability: 0.4,
        effects: [
          { kind: 'increase', variableKey: 'downtime', amount: 12 },
          { kind: 'increase', variableKey: 'defectRate', amount: 2 },
          { kind: 'percentChange', variableKey: 'throughput', percent: -15 },
          { kind: 'log', message: 'Major supplier delay recorded.' },
        ],
      },
    ],
    category: 'disruption',
    tags: ['manufacturing', 'suppliers'],
  }),
  makeEvent({
    id: `${PREFIX}.event.maintenanceWindow`,
    name: 'Planned maintenance window',
    description: 'Technicians restore availability when it drops below the maintenance trigger.',
    trigger: { kind: 'threshold', variableKey: 'machineAvailability', operator: 'lte', value: 75 },
    probability: 1,
    cooldownSteps: 16,
    priority: 90,
    severity: 'notice',
    effects: [
      { kind: 'increase', variableKey: 'machineAvailability', amount: 12 },
      { kind: 'decrease', variableKey: 'downtime', amount: 8 },
      { kind: 'log', message: 'Planned maintenance window completed.' },
    ],
    category: 'maintenance',
    tags: ['manufacturing', 'maintenance'],
  }),
  makeEvent({
    id: `${PREFIX}.event.qualityAudit`,
    name: 'Quality audit',
    description: 'An audit expands inspection coverage when defects exceed the alert level.',
    trigger: { kind: 'threshold', variableKey: 'defectRate', operator: 'gte', value: 7 },
    probability: 1,
    cooldownSteps: 14,
    priority: 88,
    severity: 'warning',
    effects: [
      { kind: 'increase', variableKey: 'qualityChecks', amount: 10 },
      { kind: 'log', message: 'Quality audit expanded inspection coverage.' },
    ],
    category: 'quality',
    tags: ['manufacturing', 'quality'],
  }),
];

/** Build a fresh, deterministic fictional manufacturing scenario. */
export function manufacturingScenario(): Scenario {
  return createScenario({
    id: PREFIX,
    name: 'Kestrel Works Assembly Line',
    description: 'A fictional factory modelling orders, throughput, downtime, defects and energy use.',
    domain: 'manufacturing',
    variables,
    rules,
    events,
    parameters: {
      orderPushThreshold: 115,
      availabilityFloor: 75,
      defectAlert: 7,
      baselineIndex: 100,
    },
    objectives: [
      {
        id: `${PREFIX}.objective.defects`,
        name: 'Keep the defect rate below 5%',
        variableKey: 'defectRate',
        target: 5,
        operator: 'lte',
      },
      {
        id: `${PREFIX}.objective.throughput`,
        name: 'Maintain throughput of at least 95',
        variableKey: 'throughput',
        target: 95,
        operator: 'gte',
      },
    ],
    tags: ['manufacturing', 'extra', 'preset'],
    preset: true,
    disclaimer: 'Fictional teaching model; not a representation of any real factory or production guarantee.',
    configuration: defaultConfiguration({ seed: 47007, maxSteps: 60, autoSnapshotSteps: 6 }),
  });
}
