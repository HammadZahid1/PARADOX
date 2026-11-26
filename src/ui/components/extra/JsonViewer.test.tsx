import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JsonViewer } from './JsonViewer';

describe('JsonViewer', () => {
  it('starts collapsed and keeps the serialized JSON hidden', () => {
    const value = { alpha: 1, beta: [true, null] };
    render(<JsonViewer value={value} />);
    const toggle = screen.getByRole('button', { name: /JSON/ });
    const pre = document.querySelector('pre');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls');
    expect(pre).not.toBeVisible();
    expect(pre?.textContent).toBe(JSON.stringify(value, null, 2));
  });

  it('reveals the JSON when the disclosure button is clicked', () => {
    render(<JsonViewer value={{ alpha: 1 }} />);
    const toggle = screen.getByRole('button', { name: /JSON/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('pre')).toBeVisible();
  });

  it('supports starting expanded and summarizes arrays', () => {
    const value = [1, 2];
    render(<JsonViewer value={value} label="Payload" defaultExpanded />);
    expect(screen.getByRole('button', { name: /Payload/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(document.querySelector('pre')?.textContent).toBe(JSON.stringify(value, null, 2));
  });

  it('falls back to a string representation for non-JSON values', () => {
    render(<JsonViewer value={undefined} />);
    expect(document.querySelector('pre')).toHaveTextContent('undefined');
  });
});
