import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useParadox } from '@/state/store';
import type { ToastMessage } from '@/state/types';
import { Toasts } from './Toasts';

const toast = (id: string, message: string, severity: ToastMessage['severity'] = 'info'): ToastMessage => ({
  id,
  message,
  severity,
  createdAt: 0,
});

beforeEach(() => {
  act(() => {
    useParadox.setState({ toasts: [] });
  });
});

afterEach(() => {
  act(() => {
    useParadox.setState({ toasts: [] });
  });
});

describe('Toasts', () => {
  it('renders an empty live region when there are no toasts', () => {
    const { container } = render(<Toasts />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });

  it('renders queued toast messages', () => {
    act(() => {
      useParadox.setState({ toasts: [toast('a', 'Saved', 'success'), toast('b', 'Failed to load', 'error')] });
    });
    render(<Toasts />);
    expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Failed to load' })).toBeInTheDocument();
  });

  it('dismisses a toast when clicked', () => {
    act(() => {
      useParadox.setState({ toasts: [toast('a', 'Saved', 'success')] });
    });
    render(<Toasts />);
    fireEvent.click(screen.getByRole('button', { name: 'Saved' }));
    expect(screen.queryByRole('button', { name: 'Saved' })).not.toBeInTheDocument();
    expect(useParadox.getState().toasts).toEqual([]);
  });

  it('dismisses only the selected toast', () => {
    act(() => {
      useParadox.setState({ toasts: [toast('a', 'First'), toast('b', 'Second')] });
    });
    render(<Toasts />);
    fireEvent.click(screen.getByRole('button', { name: 'First' }));
    expect(screen.queryByRole('button', { name: 'First' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Second' })).toBeInTheDocument();
    expect(useParadox.getState().toasts.map((item) => item.id)).toEqual(['b']);
  });
});
