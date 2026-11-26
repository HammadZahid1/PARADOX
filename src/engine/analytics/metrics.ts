import type { BranchSummary, EntityId, EventRecord, RealityBranch, ScalarValue } from '@/engine/types';

export interface RealityMetrics {
  branchId: EntityId;
  stepCount: number;
  eventCount: number;
  /** Occurrences keyed by the event record source (event type). */
  eventFrequency: Record<string, number>;
  snapshotCount: number;
  decisionCount: number;
  /** Largest available change count: current-step changes or cumulative metric. */
  changeCount: number;
  finalValues: Record<string, ScalarValue>;
}

export interface WorkspaceMetrics {
  branchCount: number;
  stepCount: number;
  eventCount: number;
  snapshotCount: number;
  decisionCount: number;
  changeCount: number;
  eventFrequency: Record<string, number>;
  branches: RealityMetrics[];
}

/** The timeline log is authoritative; fall back to the state history when empty. */
function eventLog(branch: RealityBranch): readonly EventRecord[] {
  return branch.timeline.events.length > 0 ? branch.timeline.events : branch.currentState.eventHistory;
}

function finiteCount(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function stepCountFor(branch: RealityBranch): number {
  let stepCount = Math.max(branch.initialState.step, branch.currentState.step);
  for (const entry of branch.timeline.entries) stepCount = Math.max(stepCount, entry.step);
  for (const snapshot of branch.timeline.snapshots) stepCount = Math.max(stepCount, snapshot.step);
  return stepCount;
}

export function computeRealityMetrics(branch: RealityBranch): RealityMetrics {
  const events = eventLog(branch);
  const eventFrequency: Record<string, number> = {};
  for (const event of events) {
    const type = event.source || 'unknown';
    eventFrequency[type] = (eventFrequency[type] ?? 0) + 1;
  }

  return {
    branchId: branch.id,
    stepCount: stepCountFor(branch),
    eventCount: events.length,
    eventFrequency,
    snapshotCount: branch.timeline.snapshots.length,
    decisionCount: branch.decisions.length,
    changeCount: Math.max(branch.currentState.changes.length, finiteCount(branch.currentState.metrics.totalChanges)),
    finalValues: { ...branch.currentState.variables },
  };
}

export function computeBranchSummary(branch: RealityBranch): BranchSummary {
  const metrics = computeRealityMetrics(branch);
  const events = eventLog(branch);
  const lastEvent = events[events.length - 1];
  return {
    branchId: branch.id,
    steps: metrics.stepCount,
    eventCount: metrics.eventCount,
    snapshotCount: metrics.snapshotCount,
    decisions: metrics.decisionCount,
    divergenceStep: branch.branchPointStep,
    ...(lastEvent ? { lastEvent: lastEvent.eventName || lastEvent.eventId } : {}),
  };
}

export function aggregateWorkspaceMetrics(branches: readonly RealityBranch[]): WorkspaceMetrics {
  const branchMetrics = branches.map((branch) => computeRealityMetrics(branch));
  const eventFrequency: Record<string, number> = {};
  const totals = {
    stepCount: 0,
    eventCount: 0,
    snapshotCount: 0,
    decisionCount: 0,
    changeCount: 0,
  };

  for (const metrics of branchMetrics) {
    totals.stepCount += metrics.stepCount;
    totals.eventCount += metrics.eventCount;
    totals.snapshotCount += metrics.snapshotCount;
    totals.decisionCount += metrics.decisionCount;
    totals.changeCount += metrics.changeCount;
    for (const [type, count] of Object.entries(metrics.eventFrequency)) {
      eventFrequency[type] = (eventFrequency[type] ?? 0) + count;
    }
  }

  return {
    branchCount: branchMetrics.length,
    ...totals,
    eventFrequency,
    branches: branchMetrics,
  };
}
