import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Ready</Badge>);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('uses the neutral tone by default', () => {
    render(<Badge>Neutral</Badge>);
    expect(screen.getByText('Neutral')).toHaveClass('text-muted');
  });

  it('applies the selected tone', () => {
    render(<Badge tone="danger">Failed</Badge>);
    expect(screen.getByText('Failed')).toHaveClass('text-danger');
  });

  it('appends a custom className', () => {
    render(<Badge tone="success" className="custom-badge">OK</Badge>);
    expect(screen.getByText('OK')).toHaveClass('custom-badge');
  });
});
