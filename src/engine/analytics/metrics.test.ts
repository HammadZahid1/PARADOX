import { describe, expect, it } from 'vitest';
import type { EventRecord, RealityBranch, VariableDefinition } from '@/engine/types';
import { createInitialState } from '@/engine/core/state';
import {
  aggregateWorkspaceMetrics,
  computeBranchSummary,
  computeRealityMetrics,
} from './metrics';

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'population', name: 'Population', type: 'number', initial: 100 },
];

function event(name: string, source: string, step: number, severity: string): EventRecord {
  return {
    id: `${name}-${step}`,
    eventId: `${name}-${step}`,
    eventName: name,
    step,
    time: step,
    severity,
    source,
    affectedVariables: [],
  };
}

function makeBranch(id: string, population: number, events: EventRecord[], decisions: number, step: number): RealityBranch {
  const initial = createInitialState({ definitions, seed: 5 });
  const currentState = {
    ...initial,
    step,
    time: step,
    variables: { v1: population },
    eventHistory: events,
    changes: [{ variableId: 'v1', from: 100, to: population, step, time: step, source: 'test' }],
    metrics: { totalEvents: events.length, totalChanges: decisions + 4, activeEvents: 0 },
  };
  return {
    id,
    name: `Branch ${id}`,
    branchPointStep: 1,
    branchTime: 1,
    initialState: initial,
    currentState,
    timeline: {
      id: `timeline-${id}`,
      branchId: id,
      entries: [0, 1, step].map((entryStep) => ({
        step: entryStep,
        time: entryStep,
        stateId: initial.id,
        changedVariables: [],
        eventIds: [],
        checkpoint: false,
      })),
      snapshots: [{
        id: `snapshot-${id}`,
        name: 'Checkpoint',
        branchId: id,
        step: 1,
        time: 1,
        state: currentState,
        createdAt: 1,
        kind: 'auto',
      }],
      events,
    },
    seed: 5,
    status: 'complete',
    color: '#fff',
    createdAt: 1,
    decisions: Array.from({ length: decisions }, (_, index) => ({
      id: `decision-${index}`,
      name: `Decision ${index}`,
      step: 1,
      time: 1,
      selectedAlternativeId: 'a',
      alternatives: [],
    })),
  };
}

describe('computeRealityMetrics', () => {
  it('counts steps, events by type, snapshots, decisions and changes', () => {
    const branch = makeBranch(
      'left',
      120,
      [event('Flood', 'scheduled', 1, 'warning'), event('Quake', 'random', 2, 'critical')],
      2,
      3,
    );
    const metrics = computeRealityMetrics(branch);
    expect(metrics.branchId).toBe('left');
    expect(metrics.stepCount).toBe(3);
    expect(metrics.eventCount).toBe(2);
    expect(metrics.eventFrequency).toEqual({ scheduled: 1, random: 1 });
    expect(metrics.snapshotCount).toBe(1);
    expect(metrics.decisionCount).toBe(2);
    expect(metrics.changeCount).toBe(6);
    expect(metrics.finalValues).toEqual({ v1: 120 });
  });

  it('falls back to the state event log when the timeline log is empty', () => {
    const branch = makeBranch('fallback', 90, [event('Storm', 'conditional', 1, 'notice')], 0, 1);
    branch.timeline.events = [];
    const metrics = computeRealityMetrics(branch);
    expect(metrics.eventCount).toBe(1);
    expect(metrics.eventFrequency).toEqual({ conditional: 1 });
  });

  it('keeps metrics isolated from later branch mutations', () => {
    const left = makeBranch('left', 120, [event('Flood', 'scheduled', 1, 'warning')], 1, 3);
    const right = makeBranch('right', 80, [event('Drought', 'manual', 1, 'info')], 0, 2);
    const snapshot = computeRealityMetrics(left);
    const rightSnapshot = computeRealityMetrics(right);
    left.currentState.variables['v1'] = 999;
    left.timeline.events.push(event('Quake', 'random', 3, 'critical'));
    expect(snapshot.finalValues).toEqual({ v1: 120 });
    expect(snapshot.eventCount).toBe(1);
    expect(computeRealityMetrics(right)).toEqual(rightSnapshot);
  });
});

describe('computeBranchSummary', () => {
  it('matches BranchSummary and reports the last event name', () => {
    const branch = makeBranch('left', 120, [event('Flood', 'scheduled', 1, 'warning')], 1, 3);
    expect(computeBranchSummary(branch)).toEqual({
      branchId: 'left',
      steps: 3,
      eventCount: 1,
      snapshotCount: 1,
      decisions: 1,
      divergenceStep: 1,
      lastEvent: 'Flood',
    });
  });
});

describe('aggregateWorkspaceMetrics', () => {
  it('sums totals and merges event frequencies without sharing state', () => {
    const left = makeBranch('left', 120, [event('Flood', 'scheduled', 1, 'warning')], 1, 3);
    const right = makeBranch('right', 80, [event('Flood', 'scheduled', 1, 'warning')], 0, 2);
    const aggregate = aggregateWorkspaceMetrics([left, right]);

    expect(aggregate.branchCount).toBe(2);
    expect(aggregate.stepCount).toBe(5);
    expect(aggregate.eventCount).toBe(2);
    expect(aggregate.snapshotCount).toBe(2);
    expect(aggregate.decisionCount).toBe(1);
    expect(aggregate.eventFrequency).toEqual({ scheduled: 2 });
    expect(aggregate.branches.map((item) => item.branchId)).toEqual(['left', 'right']);
    const firstBranch = aggregate.branches[0];
    if (firstBranch) firstBranch.eventFrequency['scheduled'] = 99;
    expect(aggregate.branches[1]?.eventFrequency['scheduled']).toBe(1);
  });
});
