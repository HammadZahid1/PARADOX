import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('renders a switch with the label and description', () => {
    render(<Toggle label="Show grid" description="Overlay grid lines" checked={false} onChange={() => {}} />);
    expect(screen.getByRole('switch', { name: 'Show grid' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Show grid')).toBeInTheDocument();
    expect(screen.getByText('Overlay grid lines')).toBeInTheDocument();
  });

  it('reports the checked state', () => {
    render(<Toggle label="Reduced motion" checked onChange={() => {}} />);
    expect(screen.getByRole('switch', { name: 'Reduced motion' })).toHaveAttribute('aria-checked', 'true');
  });

  it('emits the inverted value on click', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Toggle label="Grid" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Grid' }));
    expect(onChange).toHaveBeenCalledWith(true);
    rerender(<Toggle label="Grid" checked onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Grid' }));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it('works without a description', () => {
    render(<Toggle label="Compact" checked={false} onChange={() => {}} />);
    expect(screen.getByRole('switch', { name: 'Compact' })).toBeInTheDocument();
    expect(screen.queryByText('Overlay grid lines')).not.toBeInTheDocument();
  });
});
