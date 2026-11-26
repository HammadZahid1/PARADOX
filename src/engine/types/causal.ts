import type { EntityId, ScalarValue } from './core';
import type { Condition } from './events';

export type CausalNodeKind = 'variable' | 'event' | 'metric' | 'decision' | 'outcome';

export interface CausalNode {
  id: EntityId;
  kind: CausalNodeKind;
  refId: EntityId;
  label: string;
  description?: string;
  x?: number;
  y?: number;
}

export type CausalRelationType =
  | 'causes'
  | 'influences'
  | 'enables'
  | 'prevents'
  | 'amplifies'
  | 'reduces'
  | 'depends-on'
  | 'correlates-with'
  | 'custom';

export interface CausalRelationship {
  id: EntityId;
  from: EntityId;
  to: EntityId;
  type: CausalRelationType;
  /** Signed strength in [-1, 1]; negative means inverse influence. */
  strength: number;
  condition?: Condition;
  delaySteps?: number;
  description?: string;
  enabled: boolean;
  authored?: boolean;
}

export interface CausalGraph {
  id: EntityId;
  name: string;
  nodes: CausalNode[];
  edges: CausalRelationship[];
  createdAt?: number;
}

export interface CausalPropagationStep {
  edgeId: EntityId;
  fromNode: EntityId;
  toNode: EntityId;
  before: ScalarValue;
  after: ScalarValue;
  depth: number;
  relation: CausalRelationType;
  strength: number;
}

export interface CausalPath {
  nodes: EntityId[];
  edges: EntityId[];
  signedStrength: number;
}

export interface ImpactAnalysis {
  eventId: EntityId;
  direct: CausalPropagationStep[];
  indirect: CausalPropagationStep[];
  maxDepth: number;
  affectedVariables: EntityId[];
  affectedEvents: EntityId[];
  paths: CausalPath[];
  assumptions: string[];
}
