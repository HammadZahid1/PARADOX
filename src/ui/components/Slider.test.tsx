import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from './Slider';

describe('Slider', () => {
  it('renders a labelled range input with bounds and step', () => {
    render(<Slider label="Speed" value={3} min={1} max={10} step={1} onChange={() => {}} />);
    const slider = screen.getByRole('slider', { name: 'Speed' });
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '10');
    expect(slider).toHaveAttribute('step', '1');
    expect(slider).toHaveValue('3');
  });

  it('shows the formatted value and unit', () => {
    render(<Slider label="Speed" value={3} min={0} max={10} unit="x" onChange={() => {}} />);
    expect(screen.getByText('3 x')).toBeInTheDocument();
  });

  it('uses two decimals for fractional steps', () => {
    render(<Slider label="Scale" value={0.5} min={0} max={1} step={0.25} onChange={() => {}} />);
    expect(screen.getByText('0.50')).toBeInTheDocument();
  });

  it('emits numeric values when the slider changes', () => {
    const onChange = vi.fn();
    render(<Slider label="Speed" value={2} min={0} max={10} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider', { name: 'Speed' }), { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('can be disabled', () => {
    render(<Slider label="Speed" value={2} min={0} max={10} disabled onChange={() => {}} />);
    expect(screen.getByRole('slider', { name: 'Speed' })).toBeDisabled();
  });
});
