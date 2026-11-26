import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Kbd } from './Kbd';

describe('Kbd', () => {
  it('renders a semantic kbd element with the key label', () => {
    render(<Kbd>Ctrl</Kbd>);
    const key = screen.getByText('Ctrl');
    expect(key.tagName).toBe('KBD');
    expect(key).toHaveClass('border-line/80', 'font-mono');
  });

  it('appends a custom class name', () => {
    render(<Kbd className="text-cyan">Esc</Kbd>);
    expect(screen.getByText('Esc')).toHaveClass('text-cyan');
  });

  it('renders each key when several are provided', () => {
    render(
      <>
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </>,
    );
    expect(screen.getAllByText(/^(Ctrl|K)$/)).toHaveLength(2);
  });
});
