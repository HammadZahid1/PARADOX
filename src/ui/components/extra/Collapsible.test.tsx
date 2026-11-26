import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Collapsible } from './Collapsible';

describe('Collapsible', () => {
  it('starts collapsed and hides its region', () => {
    render(<Collapsible title="Details">Hidden body</Collapsible>);
    expect(screen.getByRole('button', { name: 'Details' })).toHaveAttribute('aria-expanded', 'false');
    const region = screen.getByRole('region', { hidden: true });
    expect(region).not.toBeVisible();
    expect(region).toHaveTextContent('Hidden body');
  });

  it('toggles the disclosure state on click', () => {
    render(<Collapsible title="Details">Hidden body</Collapsible>);
    const button = screen.getByRole('button', { name: 'Details' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Details' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Details' })).toHaveTextContent('Hidden body');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('region', { hidden: true })).not.toBeVisible();
  });

  it('honors defaultOpen', () => {
    render(<Collapsible title="Config" defaultOpen>Config body</Collapsible>);
    expect(screen.getByRole('button', { name: 'Config' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Config' })).toBeVisible();
  });

  it('supports controlled usage', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Collapsible title="Controlled" open={false} onOpenChange={onOpenChange}>Body</Collapsible>);
    const button = screen.getByRole('button', { name: 'Controlled' });
    fireEvent.click(button);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('region', { hidden: true })).not.toBeVisible();

    rerender(<Collapsible title="Controlled" open onOpenChange={onOpenChange}>Body</Collapsible>);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Controlled' })).toBeVisible();
  });
});
