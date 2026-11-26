import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TimelineRuler } from './TimelineRuler';

describe('TimelineRuler', () => {
  it('exposes an accessible image with the step count', () => {
    render(<TimelineRuler steps={4} />);
    expect(screen.getByRole('img', { name: 'Timeline, 4 steps' })).toBeInTheDocument();
  });

  it('draws a baseline, ticks, and numeric step labels', () => {
    render(<TimelineRuler steps={4} width={200} />);
    const ruler = screen.getByRole('img', { name: /Timeline/ });
    expect(ruler.querySelectorAll('line')).toHaveLength(6);
    const labels = ruler.querySelectorAll('text');
    expect(labels).toHaveLength(5);
    expect(Array.from(labels, (label) => label.textContent)).toEqual(['0', '1', '2', '3', '4']);
    expect(labels[2]).toHaveAttribute('x', '100');
  });

  it('uses custom step labels when provided', () => {
    render(<TimelineRuler steps={2} labels={['Start', 'Mid', 'End']} />);
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Mid')).toBeInTheDocument();
    expect(screen.getByText('End')).toBeInTheDocument();
  });

  it('clamps negative step counts and supports a custom label', () => {
    render(<TimelineRuler steps={-3} label="Run ticks" />);
    expect(screen.getByRole('img', { name: 'Run ticks, 0 steps' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Run ticks/ }).querySelectorAll('text')).toHaveLength(1);
  });
});
