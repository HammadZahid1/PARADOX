import { beforeEach, describe, expect, it } from 'vitest';
import { createAllPresets } from '@/engine/scenarios';
import { useParadox } from './store';

const presets = createAllPresets();

function resetStore(): void {
  useParadox.setState({
    engine: null,
    scenarios: [],
    revision: 0,
    isPlaying: false,
    view: 'universe',
    selection: {},
    modal: { kind: null },
  });
}

describe('Paradox store', () => {
  beforeEach(resetStore);

  it('bootstraps the preset catalog and activates the first scenario', () => {
    useParadox.getState().bootstrap(presets);
    const state = useParadox.getState();
    expect(state.scenarios).toHaveLength(presets.length);
    expect(state.engine?.scenario.id).toBe(presets[0]?.id);
    expect(state.selection.branchId).toBe(state.engine?.activeBranchId);
  });

  it('advances the simulation clock and records history', () => {
    useParadox.getState().bootstrap(presets);
    const before = useParadox.getState().engine!.activeBranch.currentState.step;
    useParadox.getState().tick();
    const state = useParadox.getState();
    expect(state.engine!.activeBranch.currentState.step).toBe(before + 1);
    expect(state.engine!.historyList.length).toBeGreaterThan(1);
    expect(state.revision).toBeGreaterThan(1);
  });

  it('creates isolated branches through store actions', () => {
    useParadox.getState().bootstrap(presets);
    const parentId = useParadox.getState().engine!.activeBranchId;
    useParadox.getState().createBranch('Counterfactual');
    const state = useParadox.getState();
    const branch = state.engine!.getBranch(state.selection.branchId!);
    expect(branch?.parentId).toBe(parentId);
    expect(state.engine!.branchesList).toHaveLength(2);
  });

  it('applies local settings without mutating workspace identity', () => {
    const id = useParadox.getState().workspace.id;
    useParadox.getState().applySettings({ reducedMotion: true, showGrid: false, panelSizes: { navigator: 300 }, theme: 'graphite' });
    const state = useParadox.getState();
    expect(state.reducedMotion).toBe(true);
    expect(state.showGrid).toBe(false);
    expect(state.panelSizes.navigator).toBe(300);
    expect(state.theme).toBe('graphite');
    expect(state.workspace.id).toBe(id);
  });
});
