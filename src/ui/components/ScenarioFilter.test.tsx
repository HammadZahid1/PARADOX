import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ScenarioFilter } from './ScenarioFilter';

describe('ScenarioFilter', () => {
  it('reports the visible scenario count', () => {
    render(
      <ScenarioFilter
        query=""
        domain="all"
        domains={['economy', 'urban']}
        resultCount={17}
        totalCount={17}
        onQueryChange={vi.fn()}
        onDomainChange={vi.fn()}
      />,
    );
    expect(screen.getByText('17/17 scenarios')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filter by domain' })).toHaveDisplayValue('All domains');
  });

  it('emits query and domain changes with accessible controls', async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    const onDomainChange = vi.fn();
    render(
      <ScenarioFilter
        query=""
        domain="all"
        domains={['economy', 'urban']}
        resultCount={2}
        totalCount={17}
        onQueryChange={onQueryChange}
        onDomainChange={onDomainChange}
      />,
    );
    await user.type(screen.getByRole('searchbox', { name: 'Filter scenarios' }), 'grid');
    expect(onQueryChange).toHaveBeenCalledWith('g');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by domain' }), 'urban');
    expect(onDomainChange).toHaveBeenCalledWith('urban');
  });
});
