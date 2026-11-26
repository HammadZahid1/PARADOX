/**
 * Supply-chain teaching scenario.
 *
 * Demand depletes inventory, production restocks it, and transport capacity or
 * supplier reliability controls delivery delays. Threshold rules approximate
 * reorder points and bottlenecks.
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
    id: `supplyChain.${key}`,
    key,
    name,
    type: 'number',
    initial,
    min,
    max,
    description,
    tags: ['supply-chain'],
  });
}

const variables: VariableDefinition[] = [
  variable('production', 'Production', 100, 0, 200, 'Goods produced per period, index.'),
  variable('inventory', 'Inventory', 100, 0, 250, 'Stock on hand, index.'),
  variable('demand', 'Demand', 100, 0, 200, 'Customer demand index.'),
  variable('transportCapacity', 'Transport Capacity', 80, 0, 150, 'Available shipping capacity index.'),
  variable('deliveryTime', 'Delivery Time', 4, 0, 40, 'Average delivery time in days.'),
  variable('supplierReliability', 'Supplier Reliability', 85, 0, 100, 'Share of orders delivered on time, in percent.'),
];

const rules: SimulationRule[] = [
  makeRule({
    id: 'supplyChain.rule.demandDepletion',
    name: 'High demand depletes inventory',
    priority: 100,
    condition: { id: 'supplyChain.condition.demandHigh', variableKey: 'demand', operator: 'gte', value: 110 },
    effects: [
      { kind: 'decrease', variableKey: 'inventory', amount: 4 },
      { kind: 'decrease', variableKey: 'supplierReliability', amount: 0.4 },
    ],
    category: 'inventory',
  }),
  makeRule({
    id: 'supplyChain.rule.lowDemandRestock',
    name: 'Low demand allows restocking',
    priority: 95,
    condition: { id: 'supplyChain.condition.demandLow', variableKey: 'demand', operator: 'lte', value: 90 },
    effects: [{ kind: 'increase', variableKey: 'inventory', amount: 1.5 }],
    category: 'inventory',
  }),
  makeRule({
    id: 'supplyChain.rule.productionRestock',
    name: 'Production replenishes inventory',
    priority: 94,
    condition: { id: 'supplyChain.condition.productionActive', variableKey: 'production', operator: 'gte', value: 100 },
    effects: [{ kind: 'increase', variableKey: 'inventory', amount: 3 }],
    category: 'inventory',
  }),
  makeRule({
    id: 'supplyChain.rule.reorderPoint',
    name: 'Low inventory triggers additional production',
    priority: 90,
    condition: { id: 'supplyChain.condition.inventoryLow', variableKey: 'inventory', operator: 'lte', value: 60 },
    effects: [
      { kind: 'increase', variableKey: 'production', amount: 2 },
      { kind: 'increase', variableKey: 'inventory', amount: 1.5 },
    ],
    category: 'replenishment',
  }),
  makeRule({
    id: 'supplyChain.rule.transportImprovement',
    name: 'Spare transport capacity shortens delivery',
    priority: 85,
    condition: { id: 'supplyChain.condition.transportHigh', variableKey: 'transportCapacity', operator: 'gte', value: 70 },
    effects: [{ kind: 'decrease', variableKey: 'deliveryTime', amount: 0.6 }],
    category: 'logistics',
  }),
  makeRule({
    id: 'supplyChain.rule.transportBottleneck',
    name: 'Limited transport lengthens delivery',
    priority: 84,
    condition: { id: 'supplyChain.condition.transportLow', variableKey: 'transportCapacity', operator: 'lte', value: 55 },
    effects: [{ kind: 'increase', variableKey: 'deliveryTime', amount: 0.8 }],
    category: 'logistics',
  }),
  makeRule({
    id: 'supplyChain.rule.unreliableSuppliers',
    name: 'Unreliable suppliers reduce output and slow delivery',
    priority: 80,
    condition: { id: 'supplyChain.condition.reliabilityLow', variableKey: 'supplierReliability', operator: 'lte', value: 65 },
    effects: [
      { kind: 'decrease', variableKey: 'production', amount: 1.5 },
      { kind: 'increase', variableKey: 'deliveryTime', amount: 0.5 },
    ],
    category: 'suppliers',
  }),
  makeRule({
    id: 'supplyChain.rule.reliableSuppliers',
    name: 'Reliable suppliers support output',
    priority: 79,
    condition: { id: 'supplyChain.condition.reliabilityHigh', variableKey: 'supplierReliability', operator: 'gte', value: 90 },
    effects: [{ kind: 'increase', variableKey: 'production', amount: 1 }],
    category: 'suppliers',
  }),
  makeRule({
    id: 'supplyChain.rule.demandDelay',
    name: 'Demand surges lengthen delivery queues',
    priority: 75,
    condition: { id: 'supplyChain.condition.demandSurge', variableKey: 'demand', operator: 'gte', value: 115 },
    effects: [{ kind: 'increase', variableKey: 'deliveryTime', amount: 0.7 }],
    category: 'logistics',
  }),
  makeRule({
    id: 'supplyChain.rule.inventoryConfidence',
    name: 'Healthy inventory stabilises supplier reliability',
    priority: 70,
    condition: { id: 'supplyChain.condition.inventoryHigh', variableKey: 'inventory', operator: 'gte', value: 120 },
    effects: [{ kind: 'increase', variableKey: 'supplierReliability', amount: 0.3 }],
    category: 'suppliers',
  }),
  makeRule({
    id: 'supplyChain.rule.lateDelivery',
    name: 'Late deliveries drain inventory',
    priority: 65,
    condition: { id: 'supplyChain.condition.deliveryLate', variableKey: 'deliveryTime', operator: 'gte', value: 8 },
    effects: [{ kind: 'decrease', variableKey: 'inventory', amount: 2 }],
    category: 'logistics',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: 'supplyChain.event.supplierFailure',
    name: 'Supplier failure',
    description: 'A key supplier misses deliveries for several periods.',
    type: 'scheduled',
    trigger: { kind: 'scheduled', atStep: 16 },
    probability: 1,
    durationSteps: 5,
    cooldownSteps: 20,
    priority: 90,
    severity: 'critical',
    effects: [
      { kind: 'multiply', variableKey: 'supplierReliability', factor: 0.8 },
      { kind: 'decrease', variableKey: 'production', amount: 12 },
      { kind: 'increase', variableKey: 'deliveryTime', amount: 2 },
      { kind: 'decrease', variableKey: 'inventory', amount: 6 },
      { kind: 'log', message: 'Supplier failure: inbound deliveries stop.' },
    ],
    category: 'disruption',
    tags: ['supply-chain', 'suppliers'],
  }),
  makeEvent({
    id: 'supplyChain.event.demandSurge',
    name: 'Demand surge',
    description: 'Orders spike beyond the baseline forecast.',
    type: 'conditional',
    trigger: { kind: 'threshold', variableKey: 'demand', operator: 'gte', value: 115 },
    probability: 1,
    durationSteps: 4,
    cooldownSteps: 15,
    priority: 90,
    severity: 'warning',
    effects: [
      { kind: 'increase', variableKey: 'demand', amount: 12 },
      { kind: 'decrease', variableKey: 'inventory', amount: 10 },
      { kind: 'increase', variableKey: 'deliveryTime', amount: 1.5 },
      { kind: 'percentChange', variableKey: 'production', percent: 5 },
      { kind: 'log', message: 'Demand surge: order book exceeds forecast.' },
    ],
    category: 'demand',
    tags: ['supply-chain', 'demand'],
  }),
  makeEvent({
    id: 'supplyChain.event.portCongestion',
    name: 'Port congestion',
    description: 'Congestion lowers effective transport capacity.',
    type: 'conditional',
    trigger: { kind: 'threshold', variableKey: 'transportCapacity', operator: 'lte', value: 60 },
    probability: 1,
    durationSteps: 6,
    cooldownSteps: 18,
    priority: 90,
    severity: 'warning',
    effects: [
      { kind: 'decrease', variableKey: 'transportCapacity', amount: 10 },
      { kind: 'increase', variableKey: 'deliveryTime', amount: 2.5 },
      { kind: 'decrease', variableKey: 'inventory', amount: 5 },
      { kind: 'log', message: 'Port congestion: shipments are delayed.' },
    ],
    category: 'disruption',
    tags: ['supply-chain', 'logistics'],
  }),
];

/** Build a fresh, deterministic supply-chain scenario. */
export function supplyChainScenario(): Scenario {
  return createScenario({
    id: 'supply-chain',
    name: 'Supply Chain Under Stress',
    domain: 'supply-chain',
    description: 'A simplified inventory, production, transport and supplier reliability model.',
    variables,
    rules,
    events,
    parameters: {
      reorderPoint: 60,
      demandSurgeThreshold: 115,
      baselineDeliveryDays: 4,
    },
    objectives: [
      {
        id: 'supplyChain.objective.inventory',
        name: 'Keep inventory above 80',
        variableKey: 'inventory',
        target: 80,
        operator: 'gte',
      },
      {
        id: 'supplyChain.objective.delivery',
        name: 'Keep delivery time below 7 days',
        variableKey: 'deliveryTime',
        target: 7,
        operator: 'lte',
      },
    ],
    tags: ['supply-chain', 'preset'],
    preset: true,
    disclaimer: 'Simplified educational model; not operational supply-chain advice.',
  });
}
