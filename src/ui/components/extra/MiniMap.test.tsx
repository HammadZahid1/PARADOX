import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MiniMap } from './MiniMap';

const points = [
  { x: 0.25, y: 0.5 },
  { x: 0.75, y: 0.25 },
] as const;

const viewport = { x: 0.1, y: 0.2, width: 0.5, height: 0.4 } as const;

describe('MiniMap', () => {
  it('exposes an accessible image with the point count', () => {
    render(<MiniMap points={points} viewport={viewport} />);
    expect(screen.getByRole('img', { name: 'Minimap, 2 points' })).toBeInTheDocument();
  });

  it('maps normalized points into the svg coordinate space', () => {
    render(<MiniMap points={points} viewport={viewport} />);
    const map = screen.getByRole('img', { name: /Minimap/ });
    const circles = map.querySelectorAll('circle');
    expect(circles).toHaveLength(2);
    expect(circles[0]).toHaveAttribute('cx', '40');
    expect(circles[0]).toHaveAttribute('cy', '50');
    expect(circles[1]).toHaveAttribute('cx', '120');
    expect(circles[1]).toHaveAttribute('cy', '25');
  });

  it('draws the viewport rectangle from normalized bounds', () => {
    render(<MiniMap points={points} viewport={viewport} />);
    const rect = screen.getByRole('img', { name: /Minimap/ }).querySelector('rect');
    expect(rect).toHaveAttribute('x', '16');
    expect(rect).toHaveAttribute('y', '20');
    expect(rect).toHaveAttribute('width', '80');
    expect(rect).toHaveAttribute('height', '40');
  });

  it('uses a custom label and appends a class name', () => {
    render(<MiniMap points={[]} viewport={viewport} label="Branch map" className="custom-map" />);
    const map = screen.getByRole('img', { name: 'Branch map, 0 points' });
    expect(map).toHaveClass('custom-map');
    expect(map.querySelectorAll('circle')).toHaveLength(0);
  });
});
