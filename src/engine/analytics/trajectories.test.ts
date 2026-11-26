import { describe, expect, it } from 'vitest';
import type { VariableDefinition, VariableTrajectory, WorldState } from '@/engine/types';
import { createInitialState } from '@/engine/core/state';
import {
  buildTrajectories,
  rateOfChange,
  toNumericValue,
  trajectoryStatistics,
  type TrajectoryEntry,
} from './trajectories';

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'population', name: 'Population', type: 'number', initial: 10 },
  { id: 'v2', key: 'active', name: 'Active', type: 'boolean', initial: false },
];

function entry(state: WorldState): TrajectoryEntry {
  return {
    step: state.step,
    time: state.time,
    stateId: state.id,
    changedVariables: [],
    eventIds: [],
    checkpoint: false,
    state,
  };
}

function states(): WorldState[] {
  const initial = createInitialState({ definitions, seed: 7 });
  const first = { ...initial, id: 'state-1', step: 1, time: 1, variables: { v1: 20, v2: true } };
  const second = { ...initial, id: 'state-2', step: 2, time: 2, variables: { v1: 30, v2: true } };
  return [initial, first, second];
}

describe('buildTrajectories', () => {
  it('orders entries and reads values from their embedded states without mutation', () => {
    const [initial, first, second] = states();
    const entries = [entry(second as WorldState), entry(initial as WorldState), entry(first as WorldState)];
    const trajectories = buildTrajectories(entries, definitions);

    expect(trajectories.map((trajectory) => trajectory.key)).toEqual(['population', 'active']);
    expect(trajectories[0]?.points).toEqual([
      { step: 0, time: 0, value: 10 },
      { step: 1, time: 1, value: 20 },
      { step: 2, time: 2, value: 30 },
    ]);
    expect(trajectories[1]?.points.map((point) => point.value)).toEqual([false, true, true]);
    expect(entries.map((item) => item.step)).toEqual([2, 0, 1]);
  });

  it('resolves states by stateId when entries do not embed them', () => {
    const [initial, first, second] = states();
    const all = [initial as WorldState, first as WorldState, second as WorldState];
    const entries = all.map((state) => ({
      step: state.step,
      time: state.time,
      stateId: state.id,
      changedVariables: [],
      eventIds: [],
      checkpoint: false,
    }));
    const byId = new Map(all.map((state) => [state.id, state]));
    const trajectories = buildTrajectories(entries, definitions, byId);

    expect(trajectories[0]?.points.map((point) => point.value)).toEqual([10, 20, 30]);
    expect(buildTrajectories(entries, definitions)[0]?.points).toEqual([]);
  });

  it('supports snapshot-shaped entries with a state property', () => {
    const state = states()[0] as WorldState;
    const trajectories = buildTrajectories(
      [{ id: 'snap', name: 'Snapshot', branchId: 'b', step: 4, time: 8, state, createdAt: 1, kind: 'manual' }],
      definitions,
    );
    expect(trajectories[0]?.points).toEqual([{ step: 4, time: 8, value: 10 }]);
  });
});

describe('trajectoryStatistics', () => {
  it('computes slope, bounds and endpoints for a linear numeric series', () => {
    const trajectory: VariableTrajectory = {
      variableId: 'v1',
      key: 'linear',
      points: [0, 1, 2].map((step) => ({ step, time: step, value: 10 + step * 10 })),
    };
    const stats = trajectoryStatistics(trajectory);
    expect(stats).toEqual({ count: 3, first: 10, last: 30, min: 10, max: 30, slope: 10, volatility: 0 });
  });

  it('measures volatility as the sample deviation of per-step change rates', () => {
    const trajectory: VariableTrajectory = {
      variableId: 'v1',
      key: 'zigzag',
      points: [0, 1, 2, 3].map((step) => ({ step, time: step, value: step === 1 || step === 2 ? 10 : 0 })),
    };
    const stats = trajectoryStatistics(trajectory);
    expect(stats.slope).toBeCloseTo(0, 10);
    expect(stats.volatility).toBeCloseTo(10, 10);
  });

  it('returns neutral values for empty or non-numeric trajectories', () => {
    expect(trajectoryStatistics({ variableId: 'v', key: 'empty', points: [] })).toEqual({
      count: 0, first: null, last: null, min: null, max: null, slope: 0, volatility: 0,
    });
    const categorical: VariableTrajectory = {
      variableId: 'v',
      key: 'categorical',
      points: [{ step: 0, time: 0, value: 'alpha' }, { step: 1, time: 1, value: true }],
    };
    expect(trajectoryStatistics(categorical)).toEqual({
      count: 1, first: 1, last: 1, min: 1, max: 1, slope: 0, volatility: 0,
    });
  });
});

describe('rateOfChange', () => {
  it('computes the change rate at an exact step, including uneven gaps', () => {
    const trajectory: VariableTrajectory = {
      variableId: 'v1',
      key: 'series',
      points: [
        { step: 0, time: 0, value: 0 },
        { step: 2, time: 2, value: 10 },
        { step: 5, time: 5, value: 1 },
      ],
    };
    expect(rateOfChange(trajectory, 2)).toBe(5);
    expect(rateOfChange(trajectory, 5)).toBeCloseTo(-3, 10);
  });

  it('returns zero when the step or a numeric predecessor is missing', () => {
    const trajectory: VariableTrajectory = {
      variableId: 'v1',
      key: 'series',
      points: [{ step: 0, time: 0, value: 2 }, { step: 1, time: 1, value: 4 }],
    };
    expect(rateOfChange(trajectory, 99)).toBe(0);
    expect(rateOfChange(trajectory, 0)).toBe(0);
    expect(toNumericValue('3.5')).toBe(3.5);
    expect(toNumericValue('nope')).toBeNull();
  });
});
