import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useParadox } from '@/state/store';
import { CommandPalette } from './CommandPalette';

function resetStore(): void {
  act(() => {
    useParadox.setState({
      commandOpen: false,
      searchOpen: false,
      modal: { kind: null },
      isPlaying: false,
      view: 'universe',
      toasts: [],
    });
  });
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  resetStore();
});

describe('CommandPalette', () => {
  it('is hidden when the store says closed', () => {
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the dialog and search input when open', () => {
    act(() => {
      useParadox.setState({ commandOpen: true });
    });
    render(<CommandPalette />);
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search commands' })).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('filters commands by label and group', () => {
    act(() => {
      useParadox.setState({ commandOpen: true });
    });
    render(<CommandPalette />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search commands' }), { target: { value: 'Open settings' } });
    expect(screen.getByRole('button', { name: /Open settings/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New scenario/ })).not.toBeInTheDocument();
  });

  it('shows an empty message when nothing matches', () => {
    act(() => {
      useParadox.setState({ commandOpen: true });
    });
    render(<CommandPalette />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search commands' }), { target: { value: 'no-such-command' } });
    expect(screen.getByText('No matching commands')).toBeInTheDocument();
  });

  it('runs the active command on Enter and closes the palette', () => {
    act(() => {
      useParadox.setState({ commandOpen: true });
    });
    render(<CommandPalette />);
    const input = screen.getByRole('textbox', { name: 'Search commands' });
    fireEvent.change(input, { target: { value: 'Start simulation' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useParadox.getState().isPlaying).toBe(true);
    expect(useParadox.getState().commandOpen).toBe(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('moves the active command with ArrowDown', () => {
    act(() => {
      useParadox.setState({ commandOpen: true });
    });
    render(<CommandPalette />);
    const input = screen.getByRole('textbox', { name: 'Search commands' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useParadox.getState().modal.kind).toBe('newBranch');
    expect(useParadox.getState().commandOpen).toBe(false);
  });

  it('moves the active command back with ArrowUp', () => {
    act(() => {
      useParadox.setState({ commandOpen: true });
    });
    render(<CommandPalette />);
    const input = screen.getByRole('textbox', { name: 'Search commands' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useParadox.getState().modal.kind).toBe('newScenario');
  });

  it('runs a command on click', () => {
    act(() => {
      useParadox.setState({ commandOpen: true });
    });
    render(<CommandPalette />);
    fireEvent.click(screen.getByRole('button', { name: /Open settings/ }));
    expect(useParadox.getState().view).toBe('settings');
    expect(useParadox.getState().commandOpen).toBe(false);
  });

  it('closes on Escape', () => {
    act(() => {
      useParadox.setState({ commandOpen: true });
    });
    render(<CommandPalette />);
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search commands' }), { key: 'Escape' });
    expect(useParadox.getState().commandOpen).toBe(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when the backdrop is clicked', () => {
    act(() => {
      useParadox.setState({ commandOpen: true });
    });
    render(<CommandPalette />);
    const overlay = screen.getByRole('dialog').parentElement;
    if (!overlay) throw new Error('Command palette overlay not found');
    fireEvent.mouseDown(overlay);
    expect(useParadox.getState().commandOpen).toBe(false);
  });
});
