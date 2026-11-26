import type { EntityId, ScalarValue, SimulationConfiguration } from './core';
import type { Condition, EventEffect, SimulationEvent } from './events';
import type { CausalGraph } from './causal';
import type { VariableDefinition } from './core';

export interface RuleEffect {
  kind: 'increase' | 'decrease' | 'assign' | 'multiply' | 'percentChange';
  variableKey: string;
  amount?: number;
  value?: ScalarValue;
  factor?: number;
  percent?: number;
}

export interface SimulationRule {
  id: EntityId;
  name: string;
  description?: string;
  condition?: Condition;
  conditions?: Condition[];
  priority: number;
  effects: RuleEffect[];
  enabled: boolean;
  category?: string;
}

export interface ScenarioObjective {
  id: EntityId;
  name: string;
  description?: string;
  variableKey: string;
  target: number;
  operator: 'gte' | 'lte' | 'eq';
}

export interface Scenario {
  id: EntityId;
  name: string;
  description: string;
  domain: string;
  worldId: EntityId;
  variables: VariableDefinition[];
  parameters: Record<string, ScalarValue>;
  rules: SimulationRule[];
  events: SimulationEvent[];
  causalGraph?: CausalGraph;
  configuration: SimulationConfiguration;
  objectives: ScenarioObjective[];
  tags: readonly string[];
  preset: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
  disclaimer?: string;
}
