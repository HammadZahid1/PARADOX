import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type TabItem, Tabs } from './Tabs';

type TabId = 'overview' | 'details' | 'missing';

const items: readonly TabItem<TabId>[] = [
  { id: 'overview', label: 'Overview', content: <p>Overview panel</p> },
  { id: 'details', label: 'Details', badge: 3, content: <p>Details panel</p> },
];

describe('Tabs', () => {
  it('renders a tablist and the active tabpanel', () => {
    render(<Tabs items={items} value="overview" onChange={() => {}} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Details/ })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Overview panel');
    expect(screen.getByRole('tabpanel')).not.toHaveTextContent('Details panel');
  });

  it('renders a badge inside its tab', () => {
    render(<Tabs items={items} value="overview" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /Details/ })).toHaveTextContent('3');
  });

  it('calls onChange with the selected id and renders the new panel after rerender', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Tabs items={items} value="overview" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /Details/ }));
    expect(onChange).toHaveBeenCalledWith('details');
    rerender(<Tabs items={items} value="details" onChange={onChange} />);
    expect(screen.getByRole('tab', { name: /Details/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Details panel');
  });

  it('falls back to the first item for an unknown value', () => {
    render(<Tabs items={items} value="missing" onChange={() => {}} />);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Overview panel');
  });
});
