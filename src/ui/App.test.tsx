import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useParadox } from '@/state/store';
import { App } from './App';

vi.mock('@/ui/ViewRouter', () => ({
  ViewRouter: () => <div data-testid="view-router" />,
}));

describe('App bootstrap', () => {
  beforeEach(() => {
    useParadox.setState({ scenarios: [], engine: null });
  });

  it('loads every bundled scenario when the workspace is empty', async () => {
    render(<App />);
    expect(screen.getByTestId('view-router')).toBeInTheDocument();
    await waitFor(() => {
      expect(useParadox.getState().scenarios).toHaveLength(17);
    });
    expect(useParadox.getState().scenarios.some((scenario) => scenario.id === 'extra-climate')).toBe(true);
  });
});
