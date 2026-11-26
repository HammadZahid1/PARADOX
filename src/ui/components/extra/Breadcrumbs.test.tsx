import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumbs } from './Breadcrumbs';

const items = [
  { label: 'Home', href: '/' },
  { label: 'Branches', href: '/branches' },
  { label: 'Current run' },
] as const;

describe('Breadcrumbs', () => {
  it('renders a labelled navigation list', () => {
    render(<Breadcrumbs items={items} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('makes non-final entries links', () => {
    render(<Breadcrumbs items={items} />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Branches' })).toHaveAttribute('href', '/branches');
  });

  it('marks the final entry as the current page without a link', () => {
    render(<Breadcrumbs items={items} />);
    const current = screen.getByText('Current run');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Current run' })).not.toBeInTheDocument();
  });

  it('accepts a custom navigation label', () => {
    render(<Breadcrumbs items={items} label="Location" />);
    expect(screen.getByRole('navigation', { name: 'Location' })).toBeInTheDocument();
  });
});
