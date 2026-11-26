/**
 * Technology-diffusion teaching scenario.
 *
 * Research creates innovation, compute accelerates research, infrastructure
 * enables adoption, and adoption raises productivity which funds more research.
 * High innovation can also reduce competition through consolidation.
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
    id: `technology.${key}`,
    key,
    name,
    type: 'number',
    initial,
    min,
    max,
    description,
    tags: ['technology'],
  });
}

const variables: VariableDefinition[] = [
  variable('innovation', 'Innovation', 50, 0, 150, 'Rate of new idea generation index.'),
  variable('research', 'Research Effort', 60, 0, 150, 'Funded research capacity index.'),
  variable('compute', 'Compute Capacity', 65, 0, 150, 'Available computational capacity index.'),
  variable('adoption', 'Technology Adoption', 55, 0, 100, 'Share of users adopting new technology, in percent.'),
  variable('productivity', 'Productivity', 70, 0, 150, 'Output per worker index.'),
  variable('infrastructure', 'Digital Infrastructure', 60, 0, 150, 'Networks and facilities supporting adoption.'),
  variable('competition', 'Competition', 70, 0, 100, 'Market competition index, from 0 to 100.'),
];

const rules: SimulationRule[] = [
  makeRule({
    id: 'technology.rule.researchInnovation',
    name: 'Research produces innovation',
    priority: 100,
    condition: { id: 'technology.condition.researchHigh', variableKey: 'research', operator: 'gte', value: 65 },
    effects: [
      { kind: 'increase', variableKey: 'innovation', amount: 2 },
      { kind: 'decrease', variableKey: 'research', amount: 1 },
    ],
    category: 'research',
  }),
  makeRule({
    id: 'technology.rule.computeResearch',
    name: 'Compute accelerates research',
    priority: 95,
    condition: { id: 'technology.condition.computeHigh', variableKey: 'compute', operator: 'gte', value: 70 },
    effects: [{ kind: 'increase', variableKey: 'research', amount: 1.5 }],
    category: 'research',
  }),
  makeRule({
    id: 'technology.rule.competitionInnovation',
    name: 'Competition drives innovation',
    priority: 94,
    condition: { id: 'technology.condition.competitionHigh', variableKey: 'competition', operator: 'gte', value: 65 },
    effects: [
      { kind: 'increase', variableKey: 'innovation', amount: 1 },
      { kind: 'decrease', variableKey: 'competition', amount: 0.3 },
    ],
    category: 'markets',
  }),
  makeRule({
    id: 'technology.rule.infraCompute',
    name: 'Infrastructure expands compute',
    priority: 90,
    condition: { id: 'technology.condition.infraCompute', variableKey: 'infrastructure', operator: 'gte', value: 65 },
    effects: [{ kind: 'increase', variableKey: 'compute', amount: 1.5 }],
    category: 'infrastructure',
  }),
  makeRule({
    id: 'technology.rule.infraAdoption',
    name: 'Infrastructure enables adoption',
    priority: 89,
    condition: { id: 'technology.condition.infraAdoption', variableKey: 'infrastructure', operator: 'gte', value: 65 },
    effects: [{ kind: 'increase', variableKey: 'adoption', amount: 1 }],
    category: 'adoption',
  }),
  makeRule({
    id: 'technology.rule.adoptionProductivity',
    name: 'Adoption raises productivity',
    priority: 85,
    condition: { id: 'technology.condition.adoptionHigh', variableKey: 'adoption', operator: 'gte', value: 60 },
    effects: [{ kind: 'increase', variableKey: 'productivity', amount: 1.2 }],
    category: 'adoption',
  }),
  makeRule({
    id: 'technology.rule.productivityFunding',
    name: 'Productivity funds research and infrastructure',
    priority: 80,
    condition: { id: 'technology.condition.productivityHigh', variableKey: 'productivity', operator: 'gte', value: 75 },
    effects: [
      { kind: 'increase', variableKey: 'research', amount: 1.5 },
      { kind: 'increase', variableKey: 'infrastructure', amount: 0.5 },
    ],
    category: 'investment',
  }),
  makeRule({
    id: 'technology.rule.consolidation',
    name: 'Dominant innovators reduce competition',
    priority: 75,
    condition: { id: 'technology.condition.innovationDominant', variableKey: 'innovation', operator: 'gte', value: 85 },
    effects: [{ kind: 'decrease', variableKey: 'competition', amount: 0.8 }],
    category: 'markets',
  }),
  makeRule({
    id: 'technology.rule.bottleneck',
    name: 'Weak infrastructure limits adoption',
    priority: 70,
    condition: { id: 'technology.condition.infraLow', variableKey: 'infrastructure', operator: 'lte', value: 50 },
    effects: [{ kind: 'decrease', variableKey: 'adoption', amount: 0.8 }],
    category: 'adoption',
  }),
  makeRule({
    id: 'technology.rule.researchDecay',
    name: 'Low research erodes future innovation',
    priority: 65,
    condition: { id: 'technology.condition.researchLow', variableKey: 'research', operator: 'lte', value: 30 },
    effects: [{ kind: 'decrease', variableKey: 'innovation', amount: 0.5 }],
    category: 'research',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: 'technology.event.breakthrough',
    name: 'Technological breakthrough',
    description: 'A research surprise produces either incremental or transformative gains.',
    type: 'scheduled',
    trigger: { kind: 'scheduled', atStep: 14 },
    probability: 1,
    cooldownSteps: 25,
    priority: 90,
    severity: 'notice',
    effects: [{ kind: 'log', message: 'Breakthrough event: evaluating outcomes.' }],
    outcomes: [
      {
        id: 'technology.outcome.breakthrough.incremental',
        name: 'Incremental breakthrough',
        probability: 0.6,
        effects: [
          { kind: 'increase', variableKey: 'innovation', amount: 4 },
          { kind: 'increase', variableKey: 'productivity', amount: 2 },
        ],
      },
      {
        id: 'technology.outcome.breakthrough.transformative',
        name: 'Transformative breakthrough',
        probability: 0.4,
        effects: [
          { kind: 'increase', variableKey: 'innovation', amount: 9 },
          { kind: 'increase', variableKey: 'compute', amount: 6 },
          { kind: 'increase', variableKey: 'adoption', amount: 4 },
          { kind: 'multiply', variableKey: 'research', factor: 1.2 },
        ],
      },
    ],
    category: 'innovation',
    tags: ['technology', 'research'],
  }),
  makeEvent({
    id: 'technology.event.regulation',
    name: 'Regulation',
    description: 'New rules slow adoption but increase compliance research.',
    type: 'conditional',
    trigger: { kind: 'threshold', variableKey: 'innovation', operator: 'gte', value: 75 },
    probability: 1,
    durationSteps: 5,
    cooldownSteps: 20,
    priority: 85,
    severity: 'warning',
    effects: [
      { kind: 'decrease', variableKey: 'competition', amount: 5 },
      { kind: 'decrease', variableKey: 'adoption', amount: 3 },
      { kind: 'increase', variableKey: 'research', amount: 2 },
      { kind: 'log', message: 'Regulation: adoption slows pending compliance.' },
    ],
    category: 'policy',
    tags: ['technology', 'policy'],
  }),
  makeEvent({
    id: 'technology.event.infrastructureInvestment',
    name: 'Infrastructure investment',
    description: 'Compute demand prompts investment in digital infrastructure.',
    type: 'conditional',
    trigger: { kind: 'threshold', variableKey: 'compute', operator: 'gte', value: 75 },
    probability: 1,
    cooldownSteps: 20,
    priority: 85,
    severity: 'info',
    effects: [
      { kind: 'increase', variableKey: 'infrastructure', amount: 8 },
      { kind: 'decrease', variableKey: 'compute', amount: 2 },
      { kind: 'increase', variableKey: 'adoption', amount: 2 },
      { kind: 'percentChange', variableKey: 'research', percent: 5 },
      { kind: 'log', message: 'Infrastructure investment: capacity expands.' },
    ],
    category: 'investment',
    tags: ['technology', 'infrastructure'],
  }),
];

/** Build a fresh, deterministic technology scenario. */
export function technologyScenario(): Scenario {
  return createScenario({
    id: 'technology',
    name: 'Technology Diffusion',
    domain: 'technology',
    description: 'A simplified model of research, compute, adoption and market competition.',
    variables,
    rules,
    events,
    parameters: {
      researchThreshold: 65,
      adoptionThreshold: 60,
      breakthroughStep: 14,
    },
    objectives: [
      {
        id: 'technology.objective.productivity',
        name: 'Raise productivity above 90',
        variableKey: 'productivity',
        target: 90,
        operator: 'gte',
      },
      {
        id: 'technology.objective.competition',
        name: 'Keep competition above 50',
        variableKey: 'competition',
        target: 50,
        operator: 'gte',
      },
    ],
    tags: ['technology', 'preset'],
    preset: true,
    disclaimer: 'Simplified educational model; outcomes are illustrative, not forecasts.',
  });
}
