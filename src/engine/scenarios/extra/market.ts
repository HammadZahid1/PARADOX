/**
 * Fictional market-microstructure teaching preset.
 *
 * The Aster Exchange and its instruments are invented. The preset illustrates
 * feedback loops only and is not investment advice.
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

const PREFIX = 'extra-market';

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
    tags: ['market', 'extra'],
  });
}

function condition(rule: string, variableKey: string, operator: Condition['operator'], value: Condition['value']): Condition {
  return { id: `${PREFIX}.condition.${rule}.${variableKey}`, variableKey, operator, value };
}

const variables: VariableDefinition[] = [
  metric('priceIndex', 'Aster Price Index', 100, 20, 300, 'Fictional broad price index, with 100 as baseline.'),
  metric('demand', 'Order Demand', 100, 30, 200, 'Buy-side order flow index.'),
  metric('supply', 'Offer Supply', 100, 30, 200, 'Sell-side offer flow index.'),
  metric('volatility', 'Realised Volatility', 18, 0, 100, 'Fictional volatility index, in percent.', '%'),
  metric('investorConfidence', 'Investor Confidence', 65, 0, 100, 'Survey-based confidence score, in percent.', '%'),
  metric('liquidity', 'Market Liquidity', 80, 0, 100, 'Ease of trading score, in percent.', '%'),
  metric('earnings', 'Aggregate Earnings', 100, 20, 250, 'Fictional earnings index.'),
  metric('creditSpread', 'Credit Spread', 2.5, 0, 20, 'Fictional spread over a risk-free reference, in percent.', '%'),
  makeVariable({
    id: `${PREFIX}.orderImbalance`,
    key: 'orderImbalance',
    name: 'Order Imbalance',
    type: 'derived',
    initial: 0,
    min: -200,
    max: 200,
    description: 'Demand minus supply in index points.',
    derivedFrom: ['demand', 'supply'],
    expression: 'demand - supply',
    tags: ['market', 'derived'],
  }),
];

const rules: SimulationRule[] = [
  makeRule({
    id: `${PREFIX}.rule.buyPressure`,
    name: 'Order imbalance lifts prices',
    priority: 100,
    conditions: [
      condition('buyPressure', 'demand', 'gte', 115),
      condition('buyPressure', 'supply', 'lte', 100),
    ],
    effects: [
      { kind: 'increase', variableKey: 'priceIndex', amount: 3 },
      { kind: 'increase', variableKey: 'investorConfidence', amount: 0.8 },
    ],
    category: 'price',
  }),
  makeRule({
    id: `${PREFIX}.rule.sellPressure`,
    name: 'Ample supply cools prices',
    priority: 95,
    condition: condition('sellPressure', 'supply', 'gte', 115),
    effects: [
      { kind: 'decrease', variableKey: 'priceIndex', amount: 2.5 },
      { kind: 'decrease', variableKey: 'volatility', amount: 0.5 },
    ],
    category: 'price',
  }),
  makeRule({
    id: `${PREFIX}.rule.confidenceBid`,
    name: 'Confidence supports liquidity and earnings',
    priority: 90,
    condition: condition('confidenceBid', 'investorConfidence', 'gte', 75),
    effects: [
      { kind: 'increase', variableKey: 'liquidity', amount: 1.5 },
      { kind: 'increase', variableKey: 'earnings', amount: 1 },
    ],
    category: 'sentiment',
  }),
  makeRule({
    id: `${PREFIX}.rule.volatilityDrag`,
    name: 'High volatility erodes confidence',
    priority: 85,
    condition: condition('volatilityDrag', 'volatility', 'gte', 30),
    effects: [
      { kind: 'decrease', variableKey: 'investorConfidence', amount: 2 },
      { kind: 'decrease', variableKey: 'liquidity', amount: 1.5 },
    ],
    category: 'risk',
  }),
  makeRule({
    id: `${PREFIX}.rule.creditTightening`,
    name: 'Wide credit spreads reduce liquidity',
    priority: 80,
    condition: condition('creditTightening', 'creditSpread', 'gte', 6),
    effects: [
      { kind: 'decrease', variableKey: 'liquidity', amount: 2 },
      { kind: 'increase', variableKey: 'volatility', amount: 1 },
    ],
    category: 'credit',
  }),
  makeRule({
    id: `${PREFIX}.rule.supplyResponse`,
    name: 'Higher prices attract offers',
    priority: 75,
    condition: condition('supplyResponse', 'priceIndex', 'gte', 112),
    effects: [
      { kind: 'increase', variableKey: 'supply', amount: 2 },
      { kind: 'decrease', variableKey: 'demand', amount: 0.5 },
    ],
    category: 'price',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: `${PREFIX}.event.earningsShock`,
    name: 'Fictional earnings shock',
    description: 'A surprise earnings release moves prices and volatility in the Aster Exchange.',
    trigger: { kind: 'scheduled', atStep: 11 },
    probability: 1,
    durationSteps: 3,
    cooldownSteps: 20,
    priority: 80,
    severity: 'warning',
    effects: [{ kind: 'log', message: 'Earnings release scheduled on the Aster Exchange.' }],
    outcomes: [
      {
        id: `${PREFIX}.outcome.earningsShock.mild`,
        name: 'Mild surprise',
        description: 'A small repricing with limited volatility.',
        probability: 0.6,
        effects: [
          { kind: 'decrease', variableKey: 'priceIndex', amount: 6 },
          { kind: 'increase', variableKey: 'volatility', amount: 4 },
          { kind: 'log', message: 'Mild earnings surprise recorded.' },
        ],
      },
      {
        id: `${PREFIX}.outcome.earningsShock.severe`,
        name: 'Severe surprise',
        description: 'A sharp repricing that drains confidence and liquidity.',
        probability: 0.4,
        effects: [
          { kind: 'percentChange', variableKey: 'priceIndex', percent: -18 },
          { kind: 'increase', variableKey: 'volatility', amount: 15 },
          { kind: 'decrease', variableKey: 'investorConfidence', amount: 12 },
          { kind: 'log', message: 'Severe earnings surprise recorded.' },
        ],
      },
    ],
    category: 'shock',
    tags: ['market', 'shock'],
  }),
  makeEvent({
    id: `${PREFIX}.event.liquiditySqueeze`,
    name: 'Liquidity squeeze',
    description: 'Quoting becomes expensive when liquidity falls below the alert level.',
    trigger: { kind: 'threshold', variableKey: 'liquidity', operator: 'lte', value: 55 },
    probability: 1,
    cooldownSteps: 18,
    priority: 90,
    severity: 'critical',
    effects: [
      { kind: 'increase', variableKey: 'volatility', amount: 6 },
      { kind: 'increase', variableKey: 'creditSpread', amount: 1.5 },
      { kind: 'log', message: 'Liquidity squeeze alert fired.' },
    ],
    category: 'risk',
    tags: ['market', 'liquidity'],
  }),
  makeEvent({
    id: `${PREFIX}.event.offerResponse`,
    name: 'Offer response',
    description: 'Market makers replenish offers after a large price rise.',
    trigger: { kind: 'threshold', variableKey: 'priceIndex', operator: 'gte', value: 120 },
    probability: 1,
    cooldownSteps: 15,
    priority: 85,
    severity: 'notice',
    effects: [
      { kind: 'increase', variableKey: 'supply', amount: 15 },
      { kind: 'decrease', variableKey: 'volatility', amount: 2 },
      { kind: 'log', message: 'Additional offers posted.' },
    ],
    category: 'liquidity',
    tags: ['market', 'response'],
  }),
];

/** Build a fresh, deterministic fictional market scenario. */
export function marketScenario(): Scenario {
  return createScenario({
    id: PREFIX,
    name: 'Aster Exchange Microstructure',
    description: 'A fictional exchange illustrating how order flow, liquidity, confidence and credit interact.',
    domain: 'market',
    variables,
    rules,
    events,
    parameters: {
      demandThreshold: 115,
      liquidityAlert: 55,
      priceCeiling: 120,
      baselineIndex: 100,
    },
    objectives: [
      {
        id: `${PREFIX}.objective.volatility`,
        name: 'Keep volatility below 30%',
        variableKey: 'volatility',
        target: 30,
        operator: 'lte',
      },
      {
        id: `${PREFIX}.objective.price`,
        name: 'Keep the price index at or below 125',
        variableKey: 'priceIndex',
        target: 125,
        operator: 'lte',
      },
    ],
    tags: ['market', 'extra', 'preset'],
    preset: true,
    disclaimer: 'Fictional teaching model; not investment advice, a price forecast, or a description of a real exchange.',
    configuration: defaultConfiguration({ seed: 45005, maxSteps: 60, propagationLimit: 5, autoSnapshotSteps: 6 }),
  });
}
