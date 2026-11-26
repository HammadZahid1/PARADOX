/**
 * Macroeconomic teaching scenario.
 *
 * Rules use fixed thresholds as stand-ins for gaps between variables (the rule
 * format cannot compare two variables directly). For example, "demand >= 110
 * and production <= 105" represents a demand-production gap.
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
    id: `economy.${key}`,
    key,
    name,
    type: 'number',
    initial,
    min,
    max,
    description,
    tags: ['economy', 'macro'],
  });
}

const variables: VariableDefinition[] = [
  variable('inflation', 'Inflation', 2.4, 0, 30, 'Annualised consumer price growth, in percent.'),
  variable('interestRate', 'Policy Interest Rate', 3.5, 0, 15, 'Central bank policy rate, in percent.'),
  variable('unemployment', 'Unemployment', 5.2, 0, 25, 'Share of the labour force without work, in percent.'),
  variable('consumerDemand', 'Consumer Demand', 100, 40, 180, 'Aggregate demand index, with 100 as the baseline.'),
  variable('production', 'Production', 100, 40, 180, 'Output index, with 100 as the baseline.'),
  variable('supply', 'Supply Capacity', 100, 40, 180, 'Available supply index, with 100 as the baseline.'),
  variable('publicDebt', 'Public Debt', 95, 0, 400, 'Public debt index.'),
  variable('investment', 'Investment', 55, 0, 120, 'Private investment index.'),
  makeVariable({
    id: 'economy.growth',
    key: 'growth',
    name: 'Output Growth',
    type: 'derived',
    initial: 0,
    min: -80,
    max: 80,
    description: 'Output above baseline supply capacity (production minus supply).',
    derivedFrom: ['production', 'supply'],
    expression: 'production - supply',
    tags: ['economy', 'derived'],
  }),
];

const rules: SimulationRule[] = [
  makeRule({
    id: 'economy.rule.demandSqueeze',
    name: 'Demand-production gap raises prices',
    description: 'Excess demand with constrained output lifts inflation and lowers unemployment.',
    priority: 100,
    conditions: [
      { id: 'economy.condition.demandHigh', variableKey: 'consumerDemand', operator: 'gte', value: 110 },
      { id: 'economy.condition.productionTight', variableKey: 'production', operator: 'lte', value: 105 },
    ],
    effects: [
      { kind: 'increase', variableKey: 'inflation', amount: 1.2 },
      { kind: 'decrease', variableKey: 'unemployment', amount: 0.2 },
    ],
    category: 'prices',
  }),
  makeRule({
    id: 'economy.rule.demandSlump',
    name: 'Demand surplus cools prices',
    conditions: [
      { id: 'economy.condition.demandLow', variableKey: 'consumerDemand', operator: 'lte', value: 90 },
      { id: 'economy.condition.supplyHigh', variableKey: 'supply', operator: 'gte', value: 105 },
    ],
    priority: 95,
    effects: [
      { kind: 'decrease', variableKey: 'inflation', amount: 0.9 },
      { kind: 'increase', variableKey: 'unemployment', amount: 0.4 },
    ],
    category: 'prices',
  }),
  makeRule({
    id: 'economy.rule.supplyShortfall',
    name: 'Supply shortfall lifts inflation',
    priority: 94,
    condition: { id: 'economy.condition.supplyLow', variableKey: 'supply', operator: 'lte', value: 92 },
    effects: [
      { kind: 'increase', variableKey: 'inflation', amount: 0.8 },
      { kind: 'increase', variableKey: 'production', amount: 1 },
    ],
    category: 'supply',
  }),
  makeRule({
    id: 'economy.rule.tightMoney',
    name: 'High interest rates dampen investment',
    priority: 90,
    condition: { id: 'economy.condition.rateHigh', variableKey: 'interestRate', operator: 'gte', value: 6 },
    effects: [
      { kind: 'decrease', variableKey: 'investment', amount: 1.5 },
      { kind: 'decrease', variableKey: 'consumerDemand', amount: 0.8 },
    ],
    category: 'monetary',
  }),
  makeRule({
    id: 'economy.rule.easyMoney',
    name: 'Low interest rates support investment',
    priority: 89,
    condition: { id: 'economy.condition.rateLow', variableKey: 'interestRate', operator: 'lte', value: 2.5 },
    effects: [
      { kind: 'increase', variableKey: 'investment', amount: 1.2 },
      { kind: 'increase', variableKey: 'consumerDemand', amount: 0.5 },
    ],
    category: 'monetary',
  }),
  makeRule({
    id: 'economy.rule.capacityExpansion',
    name: 'Investment expands capacity',
    priority: 80,
    condition: { id: 'economy.condition.investmentHigh', variableKey: 'investment', operator: 'gte', value: 60 },
    effects: [
      { kind: 'increase', variableKey: 'production', amount: 1.2 },
      { kind: 'increase', variableKey: 'supply', amount: 1 },
    ],
    category: 'supply',
  }),
  makeRule({
    id: 'economy.rule.deficitFinancing',
    name: 'Deficit grows public debt',
    priority: 75,
    conditions: [
      { id: 'economy.condition.debtElevated', variableKey: 'publicDebt', operator: 'gte', value: 110 },
      { id: 'economy.condition.demandForSpending', variableKey: 'consumerDemand', operator: 'gte', value: 105 },
    ],
    effects: [
      { kind: 'increase', variableKey: 'publicDebt', amount: 2 },
      { kind: 'increase', variableKey: 'interestRate', amount: 0.2 },
    ],
    category: 'fiscal',
  }),
  makeRule({
    id: 'economy.rule.debtCrowdingOut',
    name: 'High debt crowds out private investment',
    priority: 74,
    condition: { id: 'economy.condition.debtHigh', variableKey: 'publicDebt', operator: 'gte', value: 150 },
    effects: [
      { kind: 'increase', variableKey: 'interestRate', amount: 0.4 },
      { kind: 'decrease', variableKey: 'investment', amount: 0.6 },
    ],
    category: 'fiscal',
  }),
  makeRule({
    id: 'economy.rule.outputEmployment',
    name: 'Output tracks employment',
    priority: 70,
    condition: { id: 'economy.condition.outputStrong', variableKey: 'production', operator: 'gte', value: 108 },
    effects: [{ kind: 'decrease', variableKey: 'unemployment', amount: 0.4 }],
    category: 'labour',
  }),
  makeRule({
    id: 'economy.rule.outputWeakness',
    name: 'Weak output raises unemployment',
    priority: 69,
    condition: { id: 'economy.condition.outputWeak', variableKey: 'production', operator: 'lte', value: 92 },
    effects: [{ kind: 'increase', variableKey: 'unemployment', amount: 0.4 }],
    category: 'labour',
  }),
  makeRule({
    id: 'economy.rule.purchasingPower',
    name: 'Inflation erodes real demand',
    priority: 60,
    condition: { id: 'economy.condition.inflationHigh', variableKey: 'inflation', operator: 'gte', value: 8 },
    effects: [{ kind: 'decrease', variableKey: 'consumerDemand', amount: 1.2 }],
    category: 'prices',
  }),
  makeRule({
    id: 'economy.rule.wageSpiral',
    name: 'Tight labour markets add price pressure',
    priority: 55,
    conditions: [
      { id: 'economy.condition.unemploymentLow', variableKey: 'unemployment', operator: 'lte', value: 4 },
      { id: 'economy.condition.inflationElevated', variableKey: 'inflation', operator: 'gte', value: 5 },
    ],
    effects: [
      { kind: 'increase', variableKey: 'inflation', amount: 0.5 },
      { kind: 'increase', variableKey: 'consumerDemand', amount: 0.4 },
    ],
    category: 'prices',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: 'economy.event.marketShock',
    name: 'Market shock',
    description: 'Asset repricing or a confidence shock hits demand and investment.',
    type: 'scheduled',
    trigger: { kind: 'scheduled', atStep: 12 },
    probability: 1,
    durationSteps: 4,
    cooldownSteps: 25,
    priority: 80,
    severity: 'critical',
    effects: [{ kind: 'log', message: 'Market shock: confidence falls.' }],
    outcomes: [
      {
        id: 'economy.outcome.marketShock.mild',
        name: 'Mild repricing',
        description: 'A modest demand pullback with limited price effects.',
        probability: 0.65,
        effects: [
          { kind: 'decrease', variableKey: 'consumerDemand', amount: 9 },
          { kind: 'increase', variableKey: 'inflation', amount: 1 },
        ],
      },
      {
        id: 'economy.outcome.marketShock.severe',
        name: 'Severe repricing',
        description: 'A sharp demand contraction and investment retrenchment.',
        probability: 0.35,
        effects: [
          { kind: 'decrease', variableKey: 'consumerDemand', amount: 18 },
          { kind: 'increase', variableKey: 'inflation', amount: 2.5 },
          { kind: 'multiply', variableKey: 'investment', factor: 0.85 },
        ],
      },
    ],
    category: 'shock',
    tags: ['economy', 'market'],
  }),
  makeEvent({
    id: 'economy.event.policyRateChange',
    name: 'Policy rate change',
    description: 'The central bank raises the policy rate when inflation stays high.',
    type: 'conditional',
    trigger: { kind: 'threshold', variableKey: 'inflation', operator: 'gte', value: 7 },
    probability: 1,
    cooldownSteps: 30,
    priority: 90,
    severity: 'warning',
    effects: [
      { kind: 'assign', variableKey: 'interestRate', value: 6.5 },
      { kind: 'percentChange', variableKey: 'investment', percent: -10 },
      { kind: 'log', message: 'Policy rate raised to 6.5%.' },
    ],
    category: 'policy',
    tags: ['economy', 'monetary'],
  }),
  makeEvent({
    id: 'economy.event.supplyDisruption',
    name: 'Supply disruption',
    description: 'A supply bottleneck reduces availability and raises prices.',
    type: 'conditional',
    trigger: { kind: 'threshold', variableKey: 'supply', operator: 'lte', value: 92 },
    probability: 1,
    durationSteps: 5,
    cooldownSteps: 18,
    priority: 85,
    severity: 'warning',
    effects: [
      { kind: 'decrease', variableKey: 'supply', amount: 12 },
      { kind: 'increase', variableKey: 'inflation', amount: 1.6 },
      { kind: 'multiply', variableKey: 'investment', factor: 0.9 },
      { kind: 'log', message: 'Supply disruption: availability falls.' },
    ],
    category: 'shock',
    tags: ['economy', 'supply'],
  }),
];

/** Build a fresh, deterministic macroeconomic scenario. */
export function economyScenario(): Scenario {
  return createScenario({
    id: 'economy',
    name: 'Macroeconomic Cycle',
    domain: 'economics',
    description: 'A simplified economy with demand, supply, prices, debt and monetary feedback loops.',
    variables,
    rules,
    events,
    parameters: {
      demandGapHigh: 110,
      productionTight: 105,
      supplyShortfall: 92,
      baseline: 100,
    },
    objectives: [
      {
        id: 'economy.objective.lowInflation',
        name: 'Keep inflation below 5%',
        variableKey: 'inflation',
        target: 5,
        operator: 'lte',
      },
      {
        id: 'economy.objective.employment',
        name: 'Keep unemployment below 7%',
        variableKey: 'unemployment',
        target: 7,
        operator: 'lte',
      },
    ],
    tags: ['economy', 'macro', 'preset'],
    preset: true,
    disclaimer: 'Simplified teaching model; not economic advice or a forecast.',
  });
}
