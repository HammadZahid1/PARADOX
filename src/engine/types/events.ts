import type { EntityId, ScalarValue, Severity } from './core';

export type EventType =
  | 'scheduled'
  | 'random'
  | 'conditional'
  | 'triggered'
  | 'manual'
  | 'cascading'
  | 'recurring';

export type ComparisonOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';

export interface Condition {
  id: EntityId;
  variableKey: string;
  operator: ComparisonOperator;
  value: ScalarValue;
  description?: string;
}

export type EventTrigger =
  | { kind: 'manual' }
  | { kind: 'scheduled'; atStep: number; atTime?: number }
  | { kind: 'threshold'; variableKey: string; operator: ComparisonOperator; value: number }
  | { kind: 'boolean'; variableKey: string; expected: boolean }
  | { kind: 'probability'; threshold: number; perStep: boolean }
  | { kind: 'dependency'; eventIds: readonly EntityId[]; requireAll?: boolean }
  | { kind: 'recurring'; intervalSteps: number; startStep?: number; maxOccurrences?: number }
  | { kind: 'cascade'; parentEventId: EntityId; delaySteps?: number };

export type EventEffect =
  | { kind: 'increase'; variableKey: string; amount: number }
  | { kind: 'decrease'; variableKey: string; amount: number }
  | { kind: 'assign'; variableKey: string; value: ScalarValue }
  | { kind: 'multiply'; variableKey: string; factor: number }
  | { kind: 'percentChange'; variableKey: string; percent: number }
  | { kind: 'conditional'; condition: Condition; then: EventEffect; otherwise?: EventEffect }
  | { kind: 'temporary'; variableKey: string; delta: number; durationSteps: number }
  | { kind: 'activate'; eventId: EntityId }
  | { kind: 'cancel'; eventId: EntityId }
  | { kind: 'log'; message: string };

export interface EventOutcome {
  id: EntityId;
  name: string;
  description?: string;
  probability: number;
  effects: EventEffect[];
}

export interface SimulationEvent {
  id: EntityId;
  name: string;
  description?: string;
  type: EventType;
  trigger: EventTrigger;
  probability: number;
  conditions: Condition[];
  effects: EventEffect[];
  outcomes?: EventOutcome[];
  durationSteps?: number;
  cooldownSteps?: number;
  dependencies: readonly EntityId[];
  priority: number;
  severity: Severity;
  enabled: boolean;
  category?: string;
  tags?: readonly string[];
  metadata?: Record<string, ScalarValue>;
}

export interface QueuedEvent {
  id: EntityId;
  event: SimulationEvent;
  scheduledStep: number;
  scheduledTime: number;
  reason: string;
  source: string;
}

export interface EventEvaluation {
  eventId: EntityId;
  step: number;
  fired: boolean;
  probability?: number;
  reason: string;
  effectsApplied: number;
}
