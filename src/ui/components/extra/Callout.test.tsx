import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Callout } from './Callout';

describe('Callout', () => {
  it('uses the status role and info tone by default', () => {
    render(<Callout title="Note">Engine is idle.</Callout>);
    const callout = screen.getByRole('status');
    expect(callout).toHaveTextContent('Note');
    expect(callout).toHaveTextContent('Engine is idle.');
    expect(callout).toHaveClass('text-cyan');
  });

  it('uses the alert role and danger styling for warning tones', () => {
    render(<Callout tone="warning">Unstable branch.</Callout>);
    const callout = screen.getByRole('alert');
    expect(callout).toHaveTextContent('Unstable branch.');
    expect(callout).toHaveClass('text-amber');
  });

  it('uses the alert role for danger tone', () => {
    render(<Callout tone="danger">Simulation failed.</Callout>);
    expect(screen.getByRole('alert')).toHaveClass('text-danger');
  });

  it('uses the status role for success tone and appends a custom class', () => {
    render(<Callout tone="success" className="custom-callout">Run complete.</Callout>);
    const callout = screen.getByRole('status');
    expect(callout).toHaveClass('text-emerald-300', 'custom-callout');
  });
});
