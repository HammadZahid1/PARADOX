import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createAllPresets } from '@/engine/scenarios';
import { useParadox } from '@/state/store';
import { SnapshotModal } from './SnapshotModal';

describe('SnapshotModal', () => {
  beforeEach(() => {
    useParadox.setState({ engine: null, scenarios: [], revision: 0, modal: { kind: null } });
    useParadox.getState().bootstrap(createAllPresets());
    useParadox.setState({ modal: { kind: 'snapshot' } });
  });

  it('captures a named snapshot from the active reality', () => {
    render(<SnapshotModal />);
    const input = screen.getByLabelText(/name/i);
    fireEvent.change(input, { target: { value: 'QA checkpoint' } });
    fireEvent.click(screen.getByRole('button', { name: /save snapshot/i }));
    expect(useParadox.getState().engine?.snapshotsList.some((item) => item.name === 'QA checkpoint')).toBe(true);
    expect(useParadox.getState().modal.kind).toBeNull();
  });

  it('closes without capturing when cancelled', () => {
    const before = useParadox.getState().engine?.snapshotsList.length ?? 0;
    render(<SnapshotModal />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(useParadox.getState().engine?.snapshotsList.length).toBe(before);
  });
});
