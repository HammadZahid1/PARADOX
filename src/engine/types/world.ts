import type { EntityId, ScalarValue, VariableChange, VariableDefinition } from './core';

export interface ActiveEventInstance {
  instanceId: EntityId;
  eventId: EntityId;
  name: string;
  startedAt: number;
  startedStep: number;
  endsAt?: number;
  remainingSteps?: number;
  severity: string;
  source: 'scheduled' | 'conditional' | 'random' | 'manual' | 'cascade' | 'recurring';
}

export interface EventRecord {
  id: EntityId;
  eventId: EntityId;
  eventName: string;
  step: number;
  time: number;
  severity: string;
  source: string;
  probability?: number;
  affectedVariables: readonly EntityId[];
  description?: string;
}

export interface WorldState {
  id: EntityId;
  time: number;
  step: number;
  variables: Record<EntityId, ScalarValue>;
  parameters: Record<string, ScalarValue>;
  activeEvents: ActiveEventInstance[];
  eventHistory: EventRecord[];
  metrics: Record<string, number>;
  seed: number;
  version: number;
  parentId?: EntityId;
  changes: VariableChange[];
}

export interface WorldDefinition {
  id: EntityId;
  name: string;
  description?: string;
  domain: string;
  variables: VariableDefinition[];
  parameters: Record<string, ScalarValue>;
  initialState?: Partial<WorldState>;
  tags?: readonly string[];
  color?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface WorldVariableValue {
  key: string;
  value: ScalarValue;
  previous: ScalarValue;
  definition: VariableDefinition;
}
