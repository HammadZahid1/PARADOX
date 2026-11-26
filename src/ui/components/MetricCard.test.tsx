import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
  it('renders the label, value and unit', () => {
    render(<MetricCard label="Power" value={42} unit="GW" />);
    expect(screen.getByText('Power')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('GW')).toBeInTheDocument();
  });

  it('formats positive, negative and zero deltas', () => {
    const { rerender } = render(<MetricCard label="Power" value={42} delta={2.5} />);
    expect(screen.getByText('+2.50')).toBeInTheDocument();
    rerender(<MetricCard label="Power" value={42} delta={-1.25} />);
    expect(screen.getByText('-1.25')).toBeInTheDocument();
    rerender(<MetricCard label="Power" value={42} delta={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders a string value and optional hint', () => {
    render(<MetricCard label="Status" value="stable" hint="from last tick" />);
    expect(screen.getByText('stable')).toBeInTheDocument();
    expect(screen.getByText('from last tick')).toBeInTheDocument();
  });
});
