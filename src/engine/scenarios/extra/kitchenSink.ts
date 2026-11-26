/**
 * Fictional all-in-one teaching preset for the Meridian Testbed.
 *
 * This scenario deliberately exercises the breadth of the scenario format:
 * numeric, boolean, categorical and derived variables; conditional,
 * multi-condition and categorical rules; scheduled, threshold, boolean,
 * recurring, dependency, cascade, probability and manual triggers; numeric,
 * assign, multiply, percent-change, temporary and log effects; plus outcomes.
 * Every entity and value is invented.
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

const PREFIX = 'extra-kitchen-sink';

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
    tags: ['kitchen-sink', 'extra'],
  });
}

function condition(rule: string, variableKey: string, operator: Condition['operator'], value: Condition['value']): Condition {
  return { id: `${PREFIX}.condition.${rule}.${variableKey}`, variableKey, operator, value };
}

const variables: VariableDefinition[] = [
  metric('temperature', 'Testbed Temperature', 20, 0, 60, 'Fictional enclosure temperature.', '°C'),
  metric('signal', 'Control Signal', 50, 0, 100, 'Normalised control signal strength.'),
  metric('stock', 'Buffer Stock', 100, 0, 200, 'Available buffer inventory index.'),
  metric('confidence', 'Operator Confidence', 60, 0, 100, 'Fictional operator confidence score, in percent.', '%'),
  makeVariable({
    id: `${PREFIX}.gridConnected`,
    key: 'gridConnected',
    name: 'Grid Connected',
    type: 'boolean',
    initial: true,
    description: 'Whether the fictional testbed is connected to its backup grid.',
    tags: ['kitchen-sink', 'state'],
  }),
  makeVariable({
    id: `${PREFIX}.operatingMode`,
    key: 'operatingMode',
    name: 'Operating Mode',
    type: 'categorical',
    initial: 'balanced',
    description: 'Selected operating policy for the testbed.',
    constraints: { allowed: ['balanced', 'conservative', 'aggressive'] },
    tags: ['kitchen-sink', 'state'],
  }),
  makeVariable({
    id: `${PREFIX}.headroom`,
    key: 'headroom',
    name: 'Headroom',
    type: 'derived',
    initial: 50,
    min: -200,
    max: 200,
    description: 'Buffer stock minus control signal (stock - signal).',
    derivedFrom: ['stock', 'signal'],
    expression: 'stock - signal',
    tags: ['kitchen-sink', 'derived'],
  }),
];

const rules: SimulationRule[] = [
  makeRule({
    id: `${PREFIX}.rule.highHeat`,
    name: 'High heat consumes buffer stock',
    priority: 100,
    condition: condition('highHeat', 'temperature', 'gte', 30),
    effects: [
      { kind: 'decrease', variableKey: 'stock', amount: 4 },
      { kind: 'decrease', variableKey: 'confidence', amount: 1 },
    ],
    category: 'thermal',
  }),
  makeRule({
    id: `${PREFIX}.rule.lowSignal`,
    name: 'Low signal triggers local correction',
    priority: 95,
    condition: condition('lowSignal', 'signal', 'lte', 30),
    effects: [{ kind: 'increase', variableKey: 'signal', amount: 5 }],
    category: 'control',
  }),
  makeRule({
    id: `${PREFIX}.rule.aggressiveMode`,
    name: 'High confidence selects aggressive mode',
    priority: 90,
    condition: condition('aggressiveMode', 'confidence', 'gte', 80),
    effects: [
      { kind: 'assign', variableKey: 'operatingMode', value: 'aggressive' },
      { kind: 'increase', variableKey: 'signal', amount: 2 },
    ],
    category: 'policy',
  }),
  makeRule({
    id: `${PREFIX}.rule.conservativeMode`,
    name: 'Cautious operators select conservative mode',
    priority: 89,
    condition: condition('conservativeMode', 'confidence', 'lte', 40),
    effects: [
      { kind: 'assign', variableKey: 'operatingMode', value: 'conservative' },
      { kind: 'decrease', variableKey: 'signal', amount: 2 },
    ],
    category: 'policy',
  }),
  makeRule({
    id: `${PREFIX}.rule.gridTrip`,
    name: 'Very strong signal trips the backup grid',
    priority: 85,
    condition: condition('gridTrip', 'signal', 'gte', 90),
    effects: [
      { kind: 'assign', variableKey: 'gridConnected', value: false },
      { kind: 'decrease', variableKey: 'confidence', amount: 2 },
    ],
    category: 'electrical',
  }),
  makeRule({
    id: `${PREFIX}.rule.islandMode`,
    name: 'Island mode draws down buffer stock',
    priority: 84,
    condition: condition('islandMode', 'gridConnected', 'eq', false),
    effects: [{ kind: 'decrease', variableKey: 'stock', amount: 1 }],
    category: 'electrical',
  }),
  makeRule({
    id: `${PREFIX}.rule.stableRecovery`,
    name: 'Stable conditions restore comfort',
    priority: 75,
    conditions: [
      condition('stableRecovery', 'confidence', 'gte', 70),
      condition('stableRecovery', 'stock', 'gte', 80),
    ],
    effects: [
      { kind: 'decrease', variableKey: 'temperature', amount: 1 },
      { kind: 'multiply', variableKey: 'confidence', factor: 1.01 },
    ],
    category: 'recovery',
  }),
  makeRule({
    id: `${PREFIX}.rule.strongSignalCost`,
    name: 'Strong signals consume inventory proportionally',
    priority: 70,
    condition: condition('strongSignalCost', 'signal', 'gte', 75),
    effects: [{ kind: 'percentChange', variableKey: 'stock', percent: -3 }],
    category: 'control',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: `${PREFIX}.event.calibrationDrill`,
    name: 'Calibration drill',
    description: 'A scheduled drill with two possible calibration outcomes.',
    trigger: { kind: 'scheduled', atStep: 5 },
    probability: 1,
    durationSteps: 2,
    cooldownSteps: 20,
    priority: 80,
    severity: 'notice',
    effects: [{ kind: 'log', message: 'Calibration drill started.' }],
    outcomes: [
      {
        id: `${PREFIX}.outcome.calibrationDrill.quick`,
        name: 'Quick calibration',
        description: 'A small stock draw with a confidence boost.',
        probability: 0.7,
        effects: [
          { kind: 'decrease', variableKey: 'stock', amount: 5 },
          { kind: 'increase', variableKey: 'confidence', amount: 3 },
          { kind: 'log', message: 'Quick calibration completed.' },
        ],
      },
      {
        id: `${PREFIX}.outcome.calibrationDrill.extended`,
        name: 'Extended calibration',
        description: 'A larger stock draw and a bigger confidence boost.',
        probability: 0.3,
        effects: [
          { kind: 'decrease', variableKey: 'stock', amount: 12 },
          { kind: 'increase', variableKey: 'confidence', amount: 6 },
          { kind: 'log', message: 'Extended calibration completed.' },
        ],
      },
    ],
    category: 'drill',
    tags: ['kitchen-sink', 'scheduled'],
  }),
  makeEvent({
    id: `${PREFIX}.event.heatResponse`,
    name: 'Heat response',
    description: 'A conditional response whose effect depends on the current control signal.',
    trigger: { kind: 'threshold', variableKey: 'temperature', operator: 'gte', value: 28 },
    conditions: [condition('heatResponse', 'stock', 'gte', 20)],
    probability: 1,
    cooldownSteps: 12,
    priority: 90,
    severity: 'warning',
    effects: [
      {
        kind: 'conditional',
        condition: condition('heatResponse', 'signal', 'lte', 40),
        then: { kind: 'increase', variableKey: 'stock', amount: 8 },
        otherwise: { kind: 'decrease', variableKey: 'stock', amount: 4 },
      },
      { kind: 'temporary', variableKey: 'confidence', delta: 5, durationSteps: 3 },
      { kind: 'log', message: 'Heat response applied with a temporary confidence boost.' },
    ],
    category: 'response',
    tags: ['kitchen-sink', 'conditional'],
  }),
  makeEvent({
    id: `${PREFIX}.event.gridRecovery`,
    name: 'Grid recovery',
    description: 'Reconnects the backup grid after the fictional island-mode drill.',
    trigger: { kind: 'boolean', variableKey: 'gridConnected', expected: false },
    probability: 1,
    cooldownSteps: 10,
    priority: 88,
    severity: 'notice',
    effects: [
      { kind: 'assign', variableKey: 'gridConnected', value: true },
      { kind: 'increase', variableKey: 'confidence', amount: 3 },
      { kind: 'log', message: 'Backup grid reconnected.' },
    ],
    category: 'electrical',
    tags: ['kitchen-sink', 'boolean'],
  }),
  makeEvent({
    id: `${PREFIX}.event.routineAudit`,
    name: 'Routine audit',
    description: 'A recurring audit that cools the testbed and uses a little inventory.',
    trigger: { kind: 'recurring', intervalSteps: 8, startStep: 4, maxOccurrences: 3 },
    probability: 1,
    cooldownSteps: 6,
    priority: 60,
    severity: 'info',
    effects: [
      { kind: 'decrease', variableKey: 'temperature', amount: 1 },
      { kind: 'percentChange', variableKey: 'stock', percent: -2 },
      { kind: 'log', message: 'Routine audit completed.' },
    ],
    category: 'audit',
    tags: ['kitchen-sink', 'recurring'],
  }),
  makeEvent({
    id: `${PREFIX}.event.followUpDrill`,
    name: 'Follow-up drill',
    description: 'Fires after the calibration drill has appeared in the event history.',
    trigger: { kind: 'dependency', eventIds: [`${PREFIX}.event.calibrationDrill`], requireAll: true },
    probability: 1,
    cooldownSteps: 40,
    priority: 65,
    severity: 'info',
    effects: [
      { kind: 'increase', variableKey: 'confidence', amount: 2 },
      { kind: 'log', message: 'Follow-up drill completed.' },
    ],
    category: 'drill',
    tags: ['kitchen-sink', 'dependency'],
  }),
  makeEvent({
    id: `${PREFIX}.event.aftershockDrill`,
    name: 'Aftershock drill',
    description: 'Cascades from the calibration drill after a short delay.',
    trigger: { kind: 'cascade', parentEventId: `${PREFIX}.event.calibrationDrill`, delaySteps: 2 },
    probability: 1,
    cooldownSteps: 30,
    priority: 64,
    severity: 'info',
    effects: [
      { kind: 'multiply', variableKey: 'signal', factor: 0.9 },
      { kind: 'log', message: 'Aftershock drill completed.' },
    ],
    category: 'drill',
    tags: ['kitchen-sink', 'cascade'],
  }),
  makeEvent({
    id: `${PREFIX}.event.randomPulse`,
    name: 'Random pulse',
    description: 'A per-step probability trigger that is gated by a cooldown.',
    trigger: { kind: 'probability', threshold: 0.5, perStep: true },
    probability: 1,
    cooldownSteps: 12,
    priority: 55,
    severity: 'info',
    effects: [
      { kind: 'increase', variableKey: 'signal', amount: 6 },
      { kind: 'log', message: 'Random pulse applied.' },
    ],
    category: 'signal',
    tags: ['kitchen-sink', 'probability'],
  }),
  makeEvent({
    id: `${PREFIX}.event.operatorOverride`,
    name: 'Operator override',
    description: 'A manual event available for user injection; it never fires automatically.',
    trigger: { kind: 'manual' },
    probability: 1,
    priority: 95,
    severity: 'notice',
    effects: [
      { kind: 'assign', variableKey: 'operatingMode', value: 'balanced' },
      { kind: 'assign', variableKey: 'gridConnected', value: true },
      { kind: 'log', message: 'Manual operator override applied.' },
    ],
    category: 'control',
    tags: ['kitchen-sink', 'manual'],
  }),
];

/** Build a fresh, deterministic scenario exercising the full preset feature set. */
export function kitchenSinkScenario(): Scenario {
  return createScenario({
    id: PREFIX,
    name: 'Meridian Testbed Kitchen Sink',
    description: 'A fictional all-in-one scenario covering every supported variable, rule, trigger and effect shape.',
    domain: 'kitchen-sink',
    variables,
    rules,
    events,
    parameters: {
      heatThreshold: 28,
      signalFloor: 30,
      gridTrip: 90,
      allowedModes: 'balanced|conservative|aggressive',
    },
    objectives: [
      {
        id: `${PREFIX}.objective.headroom`,
        name: 'Maintain at least 20 units of headroom',
        variableKey: 'headroom',
        target: 20,
        operator: 'gte',
      },
      {
        id: `${PREFIX}.objective.confidence`,
        name: 'Keep operator confidence above 50%',
        variableKey: 'confidence',
        target: 50,
        operator: 'gte',
      },
    ],
    tags: ['kitchen-sink', 'extra', 'preset', 'coverage'],
    preset: true,
    disclaimer: 'Fictional all-in-one teaching scenario; it models no real system and makes no prediction.',
    configuration: defaultConfiguration({ seed: 50010, maxSteps: 48, propagationLimit: 6, autoSnapshotSteps: 6 }),
  });
}
