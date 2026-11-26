import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Panel } from './Panel';

describe('Panel', () => {
  it('exposes the title as a labelled region and heading', () => {
    render(<Panel title="Inspector" subtitle="Selected entity">Body</Panel>);
    expect(screen.getByRole('region', { name: 'Inspector' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Inspector', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Selected entity')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('renders actions inside the header', () => {
    const onClick = vi.fn();
    render(
      <Panel title="Tools" actions={<button type="button" onClick={onClick}>Refresh</button>}>
        Body
      </Panel>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render a header without a title or actions', () => {
    render(<Panel>Body only</Panel>);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Body only')).toBeInTheDocument();
  });

  it('applies className and bodyClassName', () => {
    render(<Panel title="Styled" className="outer-panel" bodyClassName="inner-body">Content</Panel>);
    expect(screen.getByRole('region', { name: 'Styled' })).toHaveClass('outer-panel');
    expect(screen.getByText('Content')).toHaveClass('inner-body');
  });
});
