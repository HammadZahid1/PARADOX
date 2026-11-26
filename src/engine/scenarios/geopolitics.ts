/**
 * Fictional geopolitical teaching scenario.
 *
 * The three regions (Aurora League, Meridian Compact and Sable Coast) are
 * invented. Variables are abstract indices, not measurements of real states.
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
    id: `geopolitics.${key}`,
    key,
    name,
    type: 'number',
    initial,
    min,
    max,
    description,
    tags: ['geopolitics', 'fictional'],
  });
}

const variables: VariableDefinition[] = [
  variable('cooperation', 'Cooperation', 60, 0, 100, 'Diplomatic cooperation among Aurora League, Meridian Compact and Sable Coast.'),
  variable('tension', 'Tension', 40, 0, 100, 'Abstract interstate tension index.'),
  variable('trade', 'Trade', 70, 0, 150, 'Volume of fictional interregional trade.'),
  variable('security', 'Security', 65, 0, 100, 'Perceived security index.'),
  variable('resources', 'Resources', 80, 0, 150, 'Shared resource availability index.'),
  variable('publicSentiment', 'Public Sentiment', 65, 0, 100, 'Public support for cooperative policies.'),
];

const rules: SimulationRule[] = [
  makeRule({
    id: 'geopolitics.rule.tradeCooperation',
    name: 'Trade builds cooperation',
    priority: 100,
    condition: { id: 'geopolitics.condition.tradeHigh', variableKey: 'trade', operator: 'gte', value: 80 },
    effects: [
      { kind: 'increase', variableKey: 'cooperation', amount: 1.5 },
      { kind: 'increase', variableKey: 'publicSentiment', amount: 0.5 },
    ],
    category: 'trade',
  }),
  makeRule({
    id: 'geopolitics.rule.tensionErodesTrade',
    name: 'Tension erodes trade, cooperation and security',
    priority: 95,
    condition: { id: 'geopolitics.condition.tensionHigh', variableKey: 'tension', operator: 'gte', value: 65 },
    effects: [
      { kind: 'decrease', variableKey: 'trade', amount: 2 },
      { kind: 'decrease', variableKey: 'cooperation', amount: 1 },
      { kind: 'decrease', variableKey: 'security', amount: 0.8 },
    ],
    category: 'conflict',
  }),
  makeRule({
    id: 'geopolitics.rule.securityDilemma',
    name: 'Security spending feeds a dilemma',
    priority: 90,
    condition: { id: 'geopolitics.condition.securityHigh', variableKey: 'security', operator: 'gte', value: 75 },
    effects: [{ kind: 'increase', variableKey: 'tension', amount: 0.8 }],
    category: 'security',
  }),
  makeRule({
    id: 'geopolitics.rule.resourceScarcity',
    name: 'Resource scarcity raises tension',
    priority: 85,
    condition: { id: 'geopolitics.condition.resourcesLow', variableKey: 'resources', operator: 'lte', value: 50 },
    effects: [
      { kind: 'increase', variableKey: 'tension', amount: 1.5 },
      { kind: 'decrease', variableKey: 'cooperation', amount: 1 },
    ],
    category: 'resources',
  }),
  makeRule({
    id: 'geopolitics.rule.cooperationTrade',
    name: 'Cooperation opens trade and shared resources',
    priority: 80,
    condition: { id: 'geopolitics.condition.cooperationHigh', variableKey: 'cooperation', operator: 'gte', value: 70 },
    effects: [
      { kind: 'increase', variableKey: 'trade', amount: 1.2 },
      { kind: 'increase', variableKey: 'resources', amount: 0.8 },
    ],
    category: 'trade',
  }),
  makeRule({
    id: 'geopolitics.rule.sentimentDampens',
    name: 'Supportive publics dampen tension',
    priority: 75,
    condition: { id: 'geopolitics.condition.sentimentHigh', variableKey: 'publicSentiment', operator: 'gte', value: 70 },
    effects: [{ kind: 'decrease', variableKey: 'tension', amount: 0.8 }],
    category: 'domestic',
  }),
  makeRule({
    id: 'geopolitics.rule.sentimentSours',
    name: 'Souring publics raise tension',
    priority: 74,
    condition: { id: 'geopolitics.condition.sentimentLow', variableKey: 'publicSentiment', operator: 'lte', value: 40 },
    effects: [{ kind: 'increase', variableKey: 'tension', amount: 0.6 }],
    category: 'domestic',
  }),
  makeRule({
    id: 'geopolitics.rule.tensionSentiment',
    name: 'Tension reduces public support',
    priority: 70,
    condition: { id: 'geopolitics.condition.tensionVeryHigh', variableKey: 'tension', operator: 'gte', value: 70 },
    effects: [{ kind: 'decrease', variableKey: 'publicSentiment', amount: 1 }],
    category: 'domestic',
  }),
  makeRule({
    id: 'geopolitics.rule.securityCooperation',
    name: 'Cooperation improves security',
    priority: 65,
    condition: { id: 'geopolitics.condition.cooperationVeryHigh', variableKey: 'cooperation', operator: 'gte', value: 80 },
    effects: [{ kind: 'increase', variableKey: 'security', amount: 0.6 }],
    category: 'security',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: 'geopolitics.event.summit',
    name: 'Trilateral summit',
    description: 'Aurora League, Meridian Compact and Sable Coast hold a cooperative summit.',
    type: 'scheduled',
    trigger: { kind: 'scheduled', atStep: 10 },
    probability: 1,
    durationSteps: 4,
    cooldownSteps: 30,
    priority: 85,
    severity: 'notice',
    effects: [
      { kind: 'increase', variableKey: 'cooperation', amount: 8 },
      { kind: 'increase', variableKey: 'trade', amount: 5 },
      { kind: 'decrease', variableKey: 'tension', amount: 4 },
      { kind: 'increase', variableKey: 'publicSentiment', amount: 2 },
      { kind: 'log', message: 'Summit: the three fictional regions announce confidence-building measures.' },
    ],
    category: 'diplomacy',
    tags: ['geopolitics', 'fictional'],
  }),
  makeEvent({
    id: 'geopolitics.event.borderIncident',
    name: 'Border incident',
    description: 'A fictional incident near the Sable Coast frontier escalates rhetoric.',
    type: 'conditional',
    trigger: { kind: 'threshold', variableKey: 'tension', operator: 'gte', value: 70 },
    probability: 1,
    durationSteps: 5,
    cooldownSteps: 20,
    priority: 85,
    severity: 'critical',
    effects: [
      { kind: 'increase', variableKey: 'tension', amount: 10 },
      { kind: 'decrease', variableKey: 'cooperation', amount: 6 },
      { kind: 'decrease', variableKey: 'trade', amount: 5 },
      { kind: 'decrease', variableKey: 'security', amount: 3 },
      { kind: 'log', message: 'Border incident: Aurora League and Sable Coast exchange protests.' },
    ],
    category: 'conflict',
    tags: ['geopolitics', 'fictional'],
  }),
  makeEvent({
    id: 'geopolitics.event.tradeEmbargo',
    name: 'Trade embargo',
    description: 'Meridian Compact restricts fictional trade flows.',
    type: 'conditional',
    trigger: { kind: 'threshold', variableKey: 'trade', operator: 'lte', value: 50 },
    probability: 1,
    durationSteps: 6,
    cooldownSteps: 25,
    priority: 85,
    severity: 'warning',
    effects: [
      { kind: 'decrease', variableKey: 'trade', amount: 10 },
      { kind: 'decrease', variableKey: 'resources', amount: 8 },
      { kind: 'decrease', variableKey: 'cooperation', amount: 4 },
      { kind: 'increase', variableKey: 'tension', amount: 5 },
      { kind: 'percentChange', variableKey: 'security', percent: -8 },
      { kind: 'log', message: 'Trade embargo: flows between fictional regions contract.' },
    ],
    category: 'trade',
    tags: ['geopolitics', 'fictional'],
  }),
];

/** Build a fresh, deterministic fictional geopolitics scenario. */
export function geopoliticsScenario(): Scenario {
  return createScenario({
    id: 'geopolitics',
    name: 'Fictional Regional Relations',
    domain: 'geopolitics',
    description: 'A simplified fictional model of Aurora League, Meridian Compact and Sable Coast interactions.',
    variables,
    rules,
    events,
    parameters: {
      regions: 'Aurora League | Meridian Compact | Sable Coast',
      tradeNormalisation: 80,
      tensionEscalation: 70,
    },
    objectives: [
      {
        id: 'geopolitics.objective.cooperation',
        name: 'Keep cooperation above 60',
        variableKey: 'cooperation',
        target: 60,
        operator: 'gte',
      },
      {
        id: 'geopolitics.objective.tension',
        name: 'Keep tension below 60',
        variableKey: 'tension',
        target: 60,
        operator: 'lte',
      },
    ],
    tags: ['geopolitics', 'fictional', 'preset'],
    preset: true,
    disclaimer: 'Fictional scenario using invented regions; it is not a predictor of real-world geopolitics.',
  });
}
