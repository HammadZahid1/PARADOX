import { describe, expect, it } from 'vitest';
import type { EventRecord, RealityBranch, VariableDefinition, WorldState } from '@/engine/types';
import { createInitialState } from '@/engine/core/state';
import { compareBranches } from './compare';

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'population', name: 'Population', type: 'number', initial: 10 },
  { id: 'v2', key: 'active', name: 'Active', type: 'boolean', initial: false },
];

function state(population: number, active: boolean, step: number): WorldState {
  const base = createInitialState({ definitions, seed: 42 });
  return { ...base, step, time: step, variables: { v1: population, v2: active } };
}

function event(name: string, step: number, source: string): EventRecord {
  return {
    id: `${name}-${step}`,
    eventId: `${name}-${step}`,
    eventName: name,
    step,
    time: step,
    severity: 'warning',
    source,
    affectedVariables: [],
  };
}

function branch(id: string, name: string, states: WorldState[], events: EventRecord[]): RealityBranch {
  const initial = states[0] as WorldState;
  const current = states[states.length - 1] as WorldState;
  return {
    id,
    name,
    branchPointStep: 0,
    branchTime: 0,
    initialState: initial,
    currentState: current,
    timeline: {
      id: `timeline-${id}`,
      branchId: id,
      entries: states.map((item) => ({
        step: item.step,
        time: item.time,
        stateId: item.id,
        changedVariables: [],
        eventIds: [],
        checkpoint: false,
      })),
      snapshots: states.map((item, index) => ({
        id: `snapshot-${id}-${index}`,
        name: `Step ${item.step}`,
        branchId: id,
        step: item.step,
        time: item.time,
        state: item,
        createdAt: index,
        kind: 'auto',
      })),
      events,
    },
    seed: 42,
    status: 'complete',
    color: '#fff',
    createdAt: 1,
    decisions: [],
  };
}

function fixtures(): { left: RealityBranch; right: RealityBranch } {
  return {
    left: branch('left', 'Left Branch', [
      state(10, false, 0),
      state(12, false, 1),
      state(15, true, 2),
    ], [event('Flood', 1, 'scheduled'), event('Quake', 2, 'random')]),
    right: branch('right', 'Right Branch', [
      state(10, false, 0),
      state(13, false, 1),
      state(20, true, 2),
    ], [event('Flood', 1, 'scheduled'), event('Drought', 2, 'manual')]),
  };
}

describe('compareBranches', () => {
  it('computes signed deltas, relative change and per-variable divergence', () => {
    const { left, right } = fixtures();
    const comparison = compareBranches(left, right, definitions);

    expect(comparison.differences[0]).toMatchObject({
      key: 'population',
      left: 15,
      right: 20,
      absolute: 5,
      relative: 5 / 15,
      divergedAtStep: 1,
    });
    expect(comparison.differences[1]).toMatchObject({
      key: 'active',
      left: true,
      right: true,
      absolute: 0,
      relative: 0,
    });
    expect(comparison.divergenceStep).toBe(1);
    expect(comparison.trajectories.map((trajectory) => trajectory.key)).toEqual([
      'population', 'active', 'population (Right Branch)', 'active (Right Branch)',
    ]);
    expect(comparison.trajectories[2]?.points.map((point) => point.value)).toEqual([10, 13, 20]);
  });

  it('reports event counts, common names, unique names and a stable id', () => {
    const { left, right } = fixtures();
    const first = compareBranches(left, right, definitions);
    const second = compareBranches(left, right, definitions);

    expect(first.leftEventCount).toBe(2);
    expect(first.rightEventCount).toBe(2);
    expect(first.commonEvents).toEqual(['Flood']);
    expect(first.uniqueLeftEvents).toEqual(['Quake']);
    expect(first.uniqueRightEvents).toEqual(['Drought']);
    expect(first.id).toBe(second.id);
    expect(first.id).not.toBe(compareBranches(right, left, definitions).id);
    expect(typeof first.createdAt).toBe('number');
  });

  it('omits divergence for branches with identical states', () => {
    const { left } = fixtures();
    const identical = compareBranches(left, { ...left, id: 'copy', name: 'Copy' }, definitions);
    expect(identical.divergenceStep).toBeUndefined();
    expect(identical.differences.every((difference) => difference.absolute === 0)).toBe(true);
    expect(identical.commonEvents).toEqual(['Flood', 'Quake']);
    expect(identical.uniqueLeftEvents).toEqual([]);
    expect(identical.uniqueRightEvents).toEqual([]);
  });

  it('does not alias mutable branch data', () => {
    const { left, right } = fixtures();
    const comparison = compareBranches(left, right, definitions);
    left.currentState.variables['v1'] = 999;
    left.timeline.events.length = 0;
    const rightTrajectory = comparison.trajectories[2];
    if (rightTrajectory) rightTrajectory.points.length = 0;

    expect(comparison.differences[0]?.left).toBe(15);
    expect(comparison.leftEventCount).toBe(2);
    expect(comparison.trajectories[0]?.points).toHaveLength(3);
  });
});
