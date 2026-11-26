import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes labelled progress values', () => {
    render(<ProgressBar label="Loading" value={25} hint="Reading state" />);
    const bar = screen.getByRole('progressbar', { name: 'Loading' });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '25');
    expect(bar).toHaveAttribute('aria-valuetext', '25%');
    expect(screen.getByText('Reading state')).toBeInTheDocument();
  });

  it('sizes the fill according to the value', () => {
    render(<ProgressBar label="Loading" value={50} />);
    const bar = screen.getByRole('progressbar', { name: 'Loading' });
    expect(bar.firstElementChild).toHaveStyle({ width: '50%' });
  });

  it('supports a custom maximum', () => {
    render(<ProgressBar label="Steps" value={3} max={4} />);
    const bar = screen.getByRole('progressbar', { name: 'Steps' });
    expect(bar).toHaveAttribute('aria-valuemax', '4');
    expect(bar).toHaveAttribute('aria-valuetext', '75%');
  });

  it('clamps out-of-range values without exposing invalid aria values', () => {
    const { rerender } = render(<ProgressBar label="Steps" value={150} />);
    expect(screen.getByRole('progressbar', { name: 'Steps' })).toHaveAttribute('aria-valuenow', '100');
    rerender(<ProgressBar label="Steps" value={-10} />);
    expect(screen.getByRole('progressbar', { name: 'Steps' })).toHaveAttribute('aria-valuenow', '0');
  });
});
