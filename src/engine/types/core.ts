/** Shared primitive types for the PARADOX simulation domain. */

export type EntityId = string;
export type ScalarValue = number | boolean | string;
export type NumericRecord = Record<string, number>;

export type VariableType = 'number' | 'boolean' | 'categorical' | 'derived' | 'custom';

export interface VariableConstraints {
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  allowed?: readonly string[];
  required?: boolean;
}

export interface VariableDefinition {
  id: EntityId;
  key: string;
  name: string;
  description?: string;
  type: VariableType;
  initial: ScalarValue;
  unit?: string;
  min?: number;
  max?: number;
  constraints?: VariableConstraints;
  color?: string;
  /** Expression identifier used by derived variables, e.g. "growth = production - consumption". */
  derivedFrom?: readonly string[];
  expression?: string;
  tags?: readonly string[];
}

export interface VariableChange {
  variableId: EntityId;
  from: ScalarValue;
  to: ScalarValue;
  step: number;
  time: number;
  source: string;
  reason?: string;
}

export interface MetricDefinition {
  id: EntityId;
  key: string;
  name: string;
  unit?: string;
  description?: string;
  higherIsBetter?: boolean;
}

export type Severity = 'info' | 'notice' | 'warning' | 'critical';

export interface SimulationSeed {
  value: number;
  label?: string;
  createdAt?: number;
}

export interface SimulationConfiguration {
  stepDuration: number;
  maxSteps: number;
  seed: number;
  mode: 'deterministic' | 'probabilistic';
  propagationLimit: number;
  autoSnapshotSteps: number;
  strictValidation: boolean;
}
