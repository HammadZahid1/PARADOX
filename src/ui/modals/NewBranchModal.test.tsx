import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createAllPresets } from '@/engine/scenarios';
import { useParadox } from '@/state/store';
import { NewBranchModal } from './NewBranchModal';

describe('NewBranchModal', () => {
  beforeEach(() => {
    useParadox.setState({ engine: null, scenarios: [], revision: 0, modal: { kind: null }, selection: {} });
    useParadox.getState().bootstrap(createAllPresets());
    useParadox.setState({ modal: { kind: 'newBranch', payload: { eventId: 'event_1' } } });
  });

  it('creates an isolated branch anchored to the modal payload', () => {
    const parentId = useParadox.getState().engine!.activeBranchId;
    render(<NewBranchModal />);
    fireEvent.change(screen.getByLabelText(/branch name/i), { target: { value: 'Test deviation' } });
    fireEvent.click(screen.getByRole('button', { name: /create branch/i }));
    const state = useParadox.getState();
    const branch = state.engine!.getBranch(state.selection.branchId!);
    expect(branch?.name).toBe('Test deviation');
    expect(branch?.parentId).toBe(parentId);
    expect(branch?.divergenceEventId).toBe('event_1');
  });

  it('does not create a branch with a blank name', () => {
    const before = useParadox.getState().engine!.branchesList.length;
    render(<NewBranchModal />);
    fireEvent.change(screen.getByLabelText(/branch name/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /create branch/i }));
    expect(useParadox.getState().engine!.branchesList).toHaveLength(before);
  });
});
