import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useParadox } from '@/state/store';
import { Modal } from './Modal';

beforeEach(() => {
  act(() => {
    useParadox.setState({ reducedMotion: false });
  });
});

afterEach(() => {
  act(() => {
    useParadox.setState({ reducedMotion: false });
  });
});

describe('Modal', () => {
  it('renders an accessible dialog with title, content and footer', () => {
    render(
      <Modal title="Confirm action" onClose={() => {}} footer={<button type="button">Confirm</button>}>
        <p>Are you sure?</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Confirm action' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: 'Confirm action' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('closes via the close button', () => {
    const onClose = vi.fn();
    render(<Modal title="Close me" onClose={onClose}>Body</Modal>);
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Modal title="Escape me" onClose={onClose}>Body</Modal>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', () => {
    const onClose = vi.fn();
    render(<Modal title="Keys" onClose={onClose}>Body</Modal>);
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when the backdrop is clicked but not when the dialog is clicked', () => {
    const onClose = vi.fn();
    render(<Modal title="Backdrop" onClose={onClose}>Body</Modal>);
    const dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(dialog);
    expect(onClose).not.toHaveBeenCalled();
    const overlay = dialog.parentElement;
    if (!overlay) throw new Error('Modal overlay not found');
    fireEvent.mouseDown(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('respects the reducedMotion store flag', () => {
    act(() => {
      useParadox.setState({ reducedMotion: true });
    });
    render(<Modal title="Motion" onClose={() => {}}>Body</Modal>);
    expect(screen.getByRole('dialog')).not.toHaveClass('animate-in');
  });
});
