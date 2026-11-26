import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(<EmptyState title="No events" description="Add an event to begin." />);
    expect(screen.getByRole('heading', { name: 'No events', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('Add an event to begin.')).toBeInTheDocument();
  });

  it('renders and activates an optional action', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No events"
        description="Add an event to begin."
        action={<button type="button" onClick={onClick}>Add event</button>}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add event' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('omits the action slot when not supplied', () => {
    render(<EmptyState title="No events" description="Add an event to begin." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
