import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GraphLegend } from './GraphLegend';

const items = [
  { label: 'Reinforces', sign: 'positive', strength: 'strong' },
  { label: 'Suppresses', sign: 'negative', strength: 'weak' },
] as const;

describe('GraphLegend', () => {
  it('renders a labelled list of causal relations', () => {
    render(<GraphLegend items={items} />);
    expect(screen.getByRole('list', { name: 'Causal relations' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Reinforces')).toBeInTheDocument();
    expect(screen.getByText('Suppresses')).toBeInTheDocument();
  });

  it('shows signed strength labels for each relation', () => {
    render(<GraphLegend items={items} />);
    expect(screen.getByText('+ strong')).toBeInTheDocument();
    expect(screen.getByText('− weak')).toBeInTheDocument();
  });

  it('encodes sign and strength in the decorative line', () => {
    render(<GraphLegend items={items} />);
    const lines = screen.getByRole('list', { name: 'Causal relations' }).querySelectorAll('line');
    expect(lines[0]).toHaveAttribute('stroke', '#3ddbd9');
    expect(lines[0]).toHaveAttribute('stroke-width', '2.5');
    expect(lines[1]).toHaveAttribute('stroke', '#e25656');
    expect(lines[1]).toHaveAttribute('stroke-width', '1');
  });

  it('accepts a custom list label', () => {
    render(<GraphLegend items={items} label="Edge types" />);
    expect(screen.getByRole('list', { name: 'Edge types' })).toBeInTheDocument();
  });
});
