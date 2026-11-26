import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('associates the visible label with the search field', () => {
    render(<SearchInput label="Filter nodes" value="" onChange={() => {}} placeholder="Find a node" />);
    const input = screen.getByRole('searchbox', { name: 'Filter nodes' });
    expect(input).toHaveAttribute('placeholder', 'Find a node');
    expect(screen.getByText('Filter nodes')).toBeInTheDocument();
  });

  it('reports typed values through onChange', () => {
    const onChange = vi.fn();
    render(<SearchInput label="Filter nodes" value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter nodes' }), { target: { value: 'alpha' } });
    expect(onChange).toHaveBeenCalledWith('alpha');
  });

  it('offers a clear button only when there is a value and clears on click', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SearchInput label="Filter nodes" value="" onChange={onChange} />);
    expect(screen.queryByRole('button', { name: 'Clear Filter nodes' })).not.toBeInTheDocument();

    rerender(<SearchInput label="Filter nodes" value="alpha" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear Filter nodes' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
