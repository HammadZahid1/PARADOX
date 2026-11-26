/**
 * Fictional research-programme teaching preset.
 *
 * The Aster Institute, its grants and its outputs are invented. The model
 * illustrates feedback loops, not the progress of any real research field.
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

const PREFIX = 'extra-research';

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
    tags: ['research', 'extra'],
  });
}

function condition(rule: string, variableKey: string, operator: Condition['operator'], value: Condition['value']): Condition {
  return { id: `${PREFIX}.condition.${rule}.${variableKey}`, variableKey, operator, value };
}

const variables: VariableDefinition[] = [
  metric('funding', 'Grant Funding', 80, 0, 200, 'Fictional funding index.'),
  metric('researchers', 'Researcher Capacity', 70, 0, 150, 'Available researcher index.'),
  metric('computeHours', 'Compute Hours', 60, 0, 200, 'Available compute allocation index.'),
  metric('publications', 'Publications', 40, 0, 200, 'Cumulative publications index.'),
  metric('citations', 'Citations', 30, 0, 250, 'Cumulative citations index.'),
  metric('collaboration', 'Collaboration', 65, 0, 100, 'Cross-team collaboration score, in percent.', '%'),
  metric('experimentalYield', 'Experimental Yield', 55, 0, 100, 'Share of experiments producing usable results, in percent.', '%'),
  metric('dataQuality', 'Data Quality', 78, 0, 100, 'Fictional data-quality score, in percent.', '%'),
  makeVariable({
    id: `${PREFIX}.knowledgeStock`,
    key: 'knowledgeStock',
    name: 'Knowledge Stock',
    type: 'derived',
    initial: 70,
    min: 0,
    max: 500,
    description: 'Publications plus citations in the teaching model.',
    derivedFrom: ['publications', 'citations'],
    expression: 'publications + citations',
    tags: ['research', 'derived'],
  }),
];

const rules: SimulationRule[] = [
  makeRule({
    id: `${PREFIX}.rule.grantCapacity`,
    name: 'Funding expands research capacity',
    priority: 100,
    condition: condition('grantCapacity', 'funding', 'gte', 90),
    effects: [
      { kind: 'increase', variableKey: 'researchers', amount: 2 },
      { kind: 'increase', variableKey: 'computeHours', amount: 3 },
    ],
    category: 'resources',
  }),
  makeRule({
    id: `${PREFIX}.rule.collaborationOutput`,
    name: 'Collaboration raises publication output',
    priority: 95,
    condition: condition('collaborationOutput', 'collaboration', 'gte', 75),
    effects: [
      { kind: 'increase', variableKey: 'publications', amount: 2 },
      { kind: 'increase', variableKey: 'citations', amount: 1 },
    ],
    category: 'output',
  }),
  makeRule({
    id: `${PREFIX}.rule.computeYield`,
    name: 'Compute improves experimental yield',
    priority: 90,
    condition: condition('computeYield', 'computeHours', 'gte', 80),
    effects: [{ kind: 'increase', variableKey: 'experimentalYield', amount: 1.5 }],
    category: 'experiments',
  }),
  makeRule({
    id: `${PREFIX}.rule.citationLoop`,
    name: 'Publications attract citations',
    priority: 85,
    condition: condition('citationLoop', 'publications', 'gte', 70),
    effects: [{ kind: 'increase', variableKey: 'citations', amount: 2 }],
    category: 'impact',
  }),
  makeRule({
    id: `${PREFIX}.rule.poorData`,
    name: 'Poor data reduces usable results',
    priority: 80,
    condition: condition('poorData', 'dataQuality', 'lte', 60),
    effects: [
      { kind: 'decrease', variableKey: 'experimentalYield', amount: 2 },
      { kind: 'decrease', variableKey: 'publications', amount: 0.5 },
    ],
    category: 'data',
  }),
  makeRule({
    id: `${PREFIX}.rule.staffingBottleneck`,
    name: 'Low staffing limits collaboration',
    priority: 75,
    condition: condition('staffingBottleneck', 'researchers', 'lte', 50),
    effects: [
      { kind: 'decrease', variableKey: 'collaboration', amount: 1.5 },
      { kind: 'decrease', variableKey: 'experimentalYield', amount: 0.5 },
    ],
    category: 'workforce',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: `${PREFIX}.event.grantAward`,
    name: 'Fictional grant award',
    description: 'A grant committee awards funding with two possible sizes.',
    trigger: { kind: 'scheduled', atStep: 10 },
    probability: 1,
    durationSteps: 3,
    cooldownSteps: 22,
    priority: 80,
    severity: 'notice',
    effects: [{ kind: 'log', message: 'Grant committee decision announced.' }],
    outcomes: [
      {
        id: `${PREFIX}.outcome.grantAward.standard`,
        name: 'Standard award',
        description: 'A modest boost to compute and staff time.',
        probability: 0.7,
        effects: [
          { kind: 'increase', variableKey: 'funding', amount: 15 },
          { kind: 'increase', variableKey: 'computeHours', amount: 8 },
          { kind: 'log', message: 'Standard grant awarded.' },
        ],
      },
      {
        id: `${PREFIX}.outcome.grantAward.large`,
        name: 'Large award',
        description: 'A larger award expands the whole programme.',
        probability: 0.3,
        effects: [
          { kind: 'percentChange', variableKey: 'funding', percent: 30 },
          { kind: 'increase', variableKey: 'researchers', amount: 10 },
          { kind: 'increase', variableKey: 'collaboration', amount: 6 },
          { kind: 'log', message: 'Large grant awarded.' },
        ],
      },
    ],
    category: 'funding',
    tags: ['research', 'grant'],
  }),
  makeEvent({
    id: `${PREFIX}.event.computeBottleneck`,
    name: 'Compute bottleneck',
    description: 'Shared infrastructure limits experiments when allocated hours are low.',
    trigger: { kind: 'threshold', variableKey: 'computeHours', operator: 'lte', value: 40 },
    probability: 1,
    cooldownSteps: 18,
    priority: 90,
    severity: 'warning',
    effects: [
      { kind: 'increase', variableKey: 'computeHours', amount: 20 },
      { kind: 'decrease', variableKey: 'experimentalYield', amount: 3 },
      { kind: 'log', message: 'Compute bottleneck reported and partially relieved.' },
    ],
    category: 'infrastructure',
    tags: ['research', 'compute'],
  }),
  makeEvent({
    id: `${PREFIX}.event.dataAudit`,
    name: 'Data-quality audit',
    description: 'The institute improves its data pipeline after a quality dip.',
    trigger: { kind: 'threshold', variableKey: 'dataQuality', operator: 'lte', value: 60 },
    probability: 1,
    cooldownSteps: 16,
    priority: 85,
    severity: 'notice',
    effects: [
      { kind: 'assign', variableKey: 'dataQuality', value: 85 },
      { kind: 'log', message: 'Data pipeline repaired after audit.' },
    ],
    category: 'data',
    tags: ['research', 'audit'],
  }),
];

/** Build a fresh, deterministic fictional research scenario. */
export function researchScenario(): Scenario {
  return createScenario({
    id: PREFIX,
    name: 'Aster Institute Research Portfolio',
    description: 'A fictional institute modelling funding, compute, collaboration and research outputs.',
    domain: 'research',
    variables,
    rules,
    events,
    parameters: {
      fundingThreshold: 90,
      computeFloor: 40,
      dataFloor: 60,
      baselineIndex: 100,
    },
    objectives: [
      {
        id: `${PREFIX}.objective.publications`,
        name: 'Reach a publication index of 60',
        variableKey: 'publications',
        target: 60,
        operator: 'gte',
      },
      {
        id: `${PREFIX}.objective.yield`,
        name: 'Maintain experimental yield above 65%',
        variableKey: 'experimentalYield',
        target: 65,
        operator: 'gte',
      },
    ],
    tags: ['research', 'extra', 'preset'],
    preset: true,
    disclaimer: 'Fictional teaching model; not a measure of any real institution, grant or research outcome.',
    configuration: defaultConfiguration({ seed: 48008, maxSteps: 60, autoSnapshotSteps: 6 }),
  });
}
