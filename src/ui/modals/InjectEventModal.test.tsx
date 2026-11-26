import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createAllPresets } from '@/engine/scenarios';
import { useParadox } from '@/state/store';
import { InjectEventModal } from './InjectEventModal';

describe('InjectEventModal', () => {
  beforeEach(() => {
    useParadox.setState({ engine: null, scenarios: [], revision: 0, modal: { kind: null }, toasts: [] });
    useParadox.getState().bootstrap(createAllPresets());
    useParadox.setState({ modal: { kind: 'injectEvent' } });
  });

  it('injects the selected event with an overridden probability', () => {
    const event = useParadox.getState().engine!.scenario.events[0];
    if (!event) throw new Error('Preset requires at least one event');
    render(<InjectEventModal />);
    fireEvent.change(screen.getByLabelText(/event definition/i), { target: { value: event.id } });
    fireEvent.click(screen.getByRole('button', { name: /inject/i }));
    const state = useParadox.getState();
    expect(state.modal.kind).toBeNull();
    expect(state.toasts.some((toast) => toast.message.includes('Injected event'))).toBe(true);
  });
});
