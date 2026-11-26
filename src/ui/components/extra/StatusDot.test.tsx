import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusDot } from './StatusDot';

describe('StatusDot', () => {
  it('announces the supplied label as status text', () => {
    render(<StatusDot status="success" label="Stable" />);
    const status = screen.getByRole('status', { name: 'Stable' });
    expect(status).toHaveTextContent('Stable');
    expect(status.firstElementChild).toHaveClass('bg-emerald-400');
    expect(status.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('falls back to the status kind as its label', () => {
    render(<StatusDot status="active" />);
    expect(screen.getByRole('status', { name: 'active' })).toHaveTextContent('active');
    expect(screen.getByRole('status').firstElementChild).toHaveClass('bg-cyan');
  });

  it('uses semantic colors for warning and error', () => {
    const { rerender } = render(<StatusDot status="warning" />);
    expect(screen.getByRole('status').firstElementChild).toHaveClass('bg-amber');
    rerender(<StatusDot status="error" />);
    expect(screen.getByRole('status').firstElementChild).toHaveClass('bg-danger');
  });

  it('appends a custom class name', () => {
    render(<StatusDot status="idle" className="custom-dot" />);
    expect(screen.getByRole('status')).toHaveClass('custom-dot');
  });
});
