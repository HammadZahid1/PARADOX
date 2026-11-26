import type { EntityId, ScalarValue } from './core';
import type { Timeline } from './timeline';
import type { WorldState } from './world';

export interface VariableTrajectory {
  variableId: EntityId;
  key: string;
  points: Array<{ step: number; time: number; value: ScalarValue }>;
}

export interface VariableDifference {
  key: string;
  left: ScalarValue;
  right: ScalarValue;
  absolute: number | null;
  relative: number | null;
  divergedAtStep?: number;
}

export interface ComparisonResult {
  id: EntityId;
  leftBranchId: EntityId;
  rightBranchId: EntityId;
  leftName: string;
  rightName: string;
  differences: VariableDifference[];
  trajectories: VariableTrajectory[];
  divergenceStep?: number;
  leftEventCount: number;
  rightEventCount: number;
  commonEvents: string[];
  uniqueLeftEvents: string[];
  uniqueRightEvents: string[];
  createdAt: number;
}

export interface MonteCarloRequest {
  scenarioId: EntityId;
  runs: number;
  baseSeed: number;
  maxSteps: number;
  variableKey: string;
  sampleEvery?: number;
}

export interface DistributionStatistics {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p05: number;
  p25: number;
  p75: number;
  p95: number;
  ci95Low: number;
  ci95High: number;
  histogram: Array<{ binStart: number; binEnd: number; count: number }>;
}

export interface MonteCarloRun {
  seed: number;
  finalState: WorldState;
  timeline: Timeline;
}

export interface MonteCarloResult {
  request: MonteCarloRequest;
  statistics: DistributionStatistics;
  values: number[];
  runs: MonteCarloRun[];
  elapsedMs: number;
  cancelled: boolean;
}
