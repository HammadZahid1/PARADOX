import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ColorLegend } from './ColorLegend';

const items = [
  { label: 'Stable', color: '#3ddbd9' },
  { label: 'Divergent', color: '#e25656' },
] as const;

describe('ColorLegend', () => {
  it('renders a labelled list of entries', () => {
    render(<ColorLegend items={items} />);
    expect(screen.getByRole('list', { name: 'Color legend' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Stable')).toBeInTheDocument();
    expect(screen.getByText('Divergent')).toBeInTheDocument();
  });

  it('applies each color to a decorative swatch', () => {
    render(<ColorLegend items={items} />);
    const stableSwatch = screen.getByText('Stable').parentElement?.firstElementChild;
    const divergentSwatch = screen.getByText('Divergent').parentElement?.firstElementChild;
    expect(stableSwatch).toHaveStyle({ backgroundColor: 'rgb(61, 219, 217)' });
    expect(divergentSwatch).toHaveStyle({ backgroundColor: 'rgb(226, 86, 86)' });
    expect(stableSwatch).toHaveAttribute('aria-hidden', 'true');
  });

  it('appends a custom class name to the list', () => {
    render(<ColorLegend items={items} className="custom-legend" />);
    expect(screen.getByRole('list', { name: 'Color legend' })).toHaveClass('custom-legend');
  });
});
