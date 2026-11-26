import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatGrid } from './StatGrid';

const items = [
  { label: 'Runs', value: 42, hint: 'Completed runs' },
  { label: 'Divergence', value: '12%' },
] as const;

describe('StatGrid', () => {
  it('renders labelled term and definition pairs', () => {
    render(<StatGrid items={items} />);
    const terms = screen.getAllByRole('term');
    const definitions = screen.getAllByRole('definition');
    expect(terms).toHaveLength(2);
    expect(definitions).toHaveLength(2);
    expect(terms[0]).toHaveTextContent('Runs');
    expect(definitions[0]).toHaveTextContent('42');
    expect(definitions[0]).toHaveTextContent('Completed runs');
    expect(terms[1]).toHaveTextContent('Divergence');
    expect(definitions[1]).toHaveTextContent('12%');
  });

  it('renders values and optional hints', () => {
    render(<StatGrid items={items} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('Completed runs')).toBeInTheDocument();
  });

  it('uses the requested column layout and appends a class name', () => {
    render(<StatGrid items={items} columns={2} className="custom-grid" />);
    const grid = screen.getByText('Runs').parentElement?.parentElement;
    expect(grid).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'custom-grid');
  });
});
