import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('wraps its trigger and exposes the label as a tooltip', () => {
    render(
      <Tooltip label="More information">
        <button type="button">Info</button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'Info' })).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent('More information');
  });

  it('renders non-button children as-is', () => {
    render(
      <Tooltip label="Hint">
        <span>Trigger</span>
      </Tooltip>,
    );
    expect(screen.getByText('Trigger')).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Hint');
  });
});
