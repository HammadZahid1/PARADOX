/**
 * Fictional education-system teaching preset.
 *
 * Larkspur District and all enrolment, staffing and attainment figures are
 * invented. Thresholds are illustrative, not benchmarks.
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

const PREFIX = 'extra-education';

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
    tags: ['education', 'extra'],
  });
}

function condition(rule: string, variableKey: string, operator: Condition['operator'], value: Condition['value']): Condition {
  return { id: `${PREFIX}.condition.${rule}.${variableKey}`, variableKey, operator, value };
}

const variables: VariableDefinition[] = [
  metric('enrollment', 'Enrolment', 100, 40, 200, 'Student enrolment index, with 100 as baseline.'),
  metric('teacherCoverage', 'Teacher Coverage', 85, 0, 100, 'Share of funded teaching posts filled, in percent.', '%'),
  metric('funding', 'Funding', 75, 0, 150, 'Per-student funding index.'),
  metric('attendance', 'Attendance', 88, 0, 100, 'Average daily attendance, in percent.', '%'),
  metric('literacy', 'Literacy Score', 72, 0, 100, 'Fictional standardised literacy score.'),
  metric('digitalAccess', 'Digital Access', 70, 0, 100, 'Share of students with reliable devices and connectivity, in percent.', '%'),
  metric('graduationRate', 'Graduation Rate', 78, 0, 100, 'Fictional cohort graduation rate, in percent.', '%'),
  metric('classSize', 'Average Class Size', 28, 5, 60, 'Mean students per class.', 'students'),
  makeVariable({
    id: `${PREFIX}.learningIndex`,
    key: 'learningIndex',
    name: 'Learning Index',
    type: 'derived',
    initial: 132,
    min: -100,
    max: 300,
    description: 'Attendance plus literacy minus class size.',
    derivedFrom: ['attendance', 'literacy', 'classSize'],
    expression: 'attendance + literacy - classSize',
    tags: ['education', 'derived'],
  }),
];

const rules: SimulationRule[] = [
  makeRule({
    id: `${PREFIX}.rule.enrolmentPressure`,
    name: 'Rapid enrolment increases class size',
    priority: 100,
    condition: condition('enrolmentPressure', 'enrollment', 'gte', 115),
    effects: [
      { kind: 'increase', variableKey: 'classSize', amount: 1 },
      { kind: 'decrease', variableKey: 'teacherCoverage', amount: 1 },
    ],
    category: 'capacity',
  }),
  makeRule({
    id: `${PREFIX}.rule.hiringProgramme`,
    name: 'Funding fills teaching posts',
    priority: 95,
    condition: condition('hiringProgramme', 'funding', 'gte', 90),
    effects: [
      { kind: 'increase', variableKey: 'teacherCoverage', amount: 2 },
      { kind: 'decrease', variableKey: 'classSize', amount: 0.8 },
    ],
    category: 'workforce',
  }),
  makeRule({
    id: `${PREFIX}.rule.smallClasses`,
    name: 'Smaller classes support literacy',
    priority: 90,
    condition: condition('smallClasses', 'classSize', 'lte', 24),
    effects: [
      { kind: 'increase', variableKey: 'literacy', amount: 1.2 },
      { kind: 'increase', variableKey: 'graduationRate', amount: 0.4 },
    ],
    category: 'instruction',
  }),
  makeRule({
    id: `${PREFIX}.rule.attendanceGain`,
    name: 'Good attendance lifts attainment',
    priority: 85,
    condition: condition('attendanceGain', 'attendance', 'gte', 90),
    effects: [
      { kind: 'increase', variableKey: 'literacy', amount: 0.8 },
      { kind: 'increase', variableKey: 'graduationRate', amount: 0.5 },
    ],
    category: 'attainment',
  }),
  makeRule({
    id: `${PREFIX}.rule.digitalInvestment`,
    name: 'Funding improves digital access',
    priority: 80,
    condition: condition('digitalInvestment', 'funding', 'gte', 100),
    effects: [{ kind: 'increase', variableKey: 'digitalAccess', amount: 3 }],
    category: 'resources',
  }),
  makeRule({
    id: `${PREFIX}.rule.accessGap`,
    name: 'Limited digital access holds back attainment',
    priority: 75,
    condition: condition('accessGap', 'digitalAccess', 'lte', 55),
    effects: [
      { kind: 'decrease', variableKey: 'literacy', amount: 1 },
      { kind: 'decrease', variableKey: 'graduationRate', amount: 0.6 },
    ],
    category: 'equity',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: `${PREFIX}.event.curriculumPilot`,
    name: 'Literacy curriculum pilot',
    description: 'A fictional pilot programme produces different attainment gains across schools.',
    trigger: { kind: 'scheduled', atStep: 9 },
    probability: 1,
    durationSteps: 4,
    cooldownSteps: 20,
    priority: 80,
    severity: 'notice',
    effects: [{ kind: 'log', message: 'Literacy curriculum pilot launched.' }],
    outcomes: [
      {
        id: `${PREFIX}.outcome.curriculumPilot.modest`,
        name: 'Modest gains',
        description: 'Small improvements in literacy and attendance.',
        probability: 0.65,
        effects: [
          { kind: 'increase', variableKey: 'literacy', amount: 3 },
          { kind: 'increase', variableKey: 'attendance', amount: 1 },
          { kind: 'log', message: 'Literacy pilot recorded modest gains.' },
        ],
      },
      {
        id: `${PREFIX}.outcome.curriculumPilot.strong`,
        name: 'Strong gains',
        description: 'Larger improvements supported by extra coaching.',
        probability: 0.35,
        effects: [
          { kind: 'increase', variableKey: 'literacy', amount: 7 },
          { kind: 'increase', variableKey: 'graduationRate', amount: 2 },
          { kind: 'log', message: 'Literacy pilot recorded strong gains.' },
        ],
      },
    ],
    category: 'programme',
    tags: ['education', 'pilot'],
  }),
  makeEvent({
    id: `${PREFIX}.event.budgetTopUp`,
    name: 'Emergency budget top-up',
    description: 'The district releases reserves when funding falls below the planning floor.',
    trigger: { kind: 'threshold', variableKey: 'funding', operator: 'lte', value: 60 },
    probability: 1,
    cooldownSteps: 18,
    priority: 90,
    severity: 'warning',
    effects: [
      { kind: 'assign', variableKey: 'funding', value: 90 },
      { kind: 'log', message: 'Emergency budget top-up released.' },
    ],
    category: 'finance',
    tags: ['education', 'finance'],
  }),
  makeEvent({
    id: `${PREFIX}.event.attendanceCampaign`,
    name: 'Attendance campaign',
    description: 'A fictional outreach campaign responds to chronic absence.',
    trigger: { kind: 'threshold', variableKey: 'attendance', operator: 'lte', value: 80 },
    probability: 1,
    cooldownSteps: 16,
    priority: 85,
    severity: 'notice',
    effects: [
      { kind: 'increase', variableKey: 'attendance', amount: 6 },
      { kind: 'increase', variableKey: 'teacherCoverage', amount: 1 },
      { kind: 'log', message: 'Attendance campaign launched.' },
    ],
    category: 'engagement',
    tags: ['education', 'support'],
  }),
];

/** Build a fresh, deterministic fictional education scenario. */
export function educationScenario(): Scenario {
  return createScenario({
    id: PREFIX,
    name: 'Larkspur District Schools',
    description: 'A fictional school district modelling enrolment, staffing, attendance and attainment loops.',
    domain: 'education',
    variables,
    rules,
    events,
    parameters: {
      enrolmentThreshold: 115,
      fundingFloor: 60,
      attendanceFloor: 80,
      baselineIndex: 100,
    },
    objectives: [
      {
        id: `${PREFIX}.objective.graduation`,
        name: 'Raise graduation rate to at least 80%',
        variableKey: 'graduationRate',
        target: 80,
        operator: 'gte',
      },
      {
        id: `${PREFIX}.objective.literacy`,
        name: 'Raise literacy score above 75',
        variableKey: 'literacy',
        target: 75,
        operator: 'gte',
      },
    ],
    tags: ['education', 'extra', 'preset'],
    preset: true,
    disclaimer: 'Fictional teaching model; not an assessment of any real school, district or policy.',
    configuration: defaultConfiguration({ seed: 46006, maxSteps: 60, autoSnapshotSteps: 6 }),
  });
}
