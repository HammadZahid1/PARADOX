import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createAllLibraryPresets } from '@/engine/scenarios/library';
import { useParadox } from '@/state/store';
import { ScenariosView } from './ScenariosView';

const scenarios = createAllLibraryPresets().slice(0, 3);

describe('ScenariosView', () => {
  beforeEach(() => {
    useParadox.setState({ scenarios, engine: null });
    useParadox.getState().registerScenarios(scenarios);
  });

  it('shows all scenarios and filters them by name', async () => {
    const user = userEvent.setup();
    render(<ScenariosView />);
    expect(screen.getByText(`${scenarios.length}/${scenarios.length} scenarios`)).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Filter scenarios' }), scenarios[0]!.name.slice(0, 5));
    expect(screen.getByText('1/3 scenarios')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: scenarios[0]!.name })).toBeInTheDocument();
  });

  it('offers a clear action when filters exclude every scenario', async () => {
    const user = userEvent.setup();
    render(<ScenariosView />);
    await user.type(screen.getByRole('searchbox', { name: 'Filter scenarios' }), 'nonexistent-domain-filter');
    expect(screen.getByText('No scenarios match filters')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText(`${scenarios.length}/${scenarios.length} scenarios`)).toBeInTheDocument();
  });
});
