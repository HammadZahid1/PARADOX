import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type SegmentedOption, SegmentedControl } from './SegmentedControl';

type Mode = 'overview' | 'graph' | 'events';

const options: readonly SegmentedOption<Mode>[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'graph', label: 'Graph' },
  { value: 'events', label: 'Events' },
];

describe('SegmentedControl', () => {
  it('exposes a labelled group of toggle buttons', () => {
    render(<SegmentedControl options={options} value="overview" onChange={() => {}} label="View mode" />);
    expect(screen.getByRole('group', { name: 'View mode' })).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Graph' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the typed value of the selected option', () => {
    const onChange = vi.fn<(value: Mode) => void>();
    const { rerender } = render(<SegmentedControl options={options} value="overview" onChange={onChange} label="View mode" />);
    fireEvent.click(screen.getByRole('button', { name: 'Events' }));
    expect(onChange).toHaveBeenCalledWith('events');

    rerender(<SegmentedControl options={options} value="events" onChange={onChange} label="View mode" />);
    expect(screen.getByRole('button', { name: 'Events' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps decorative icons out of the accessible name', () => {
    render(<SegmentedControl options={[{ value: 'graph', label: 'Graph', icon: <span aria-hidden="true">*</span> }]} value="graph" onChange={() => {}} label="View mode" />);
    expect(screen.getByRole('button', { name: 'Graph' })).toBeInTheDocument();
  });
});
