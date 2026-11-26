import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CopyButton } from './CopyButton';

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const originalExecCommand = Object.getOwnPropertyDescriptor(document, 'execCommand');

afterEach(() => {
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else Reflect.deleteProperty(navigator, 'clipboard');
  if (originalExecCommand) Object.defineProperty(document, 'execCommand', originalExecCommand);
  else Reflect.deleteProperty(document, 'execCommand');
});

describe('CopyButton', () => {
  it('copies via the clipboard API and reports a toast-safe message', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const onCopied = vi.fn();

    render(<CopyButton text="payload" label="Copy payload" onCopied={onCopied} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy payload' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('payload'));
    expect(onCopied).toHaveBeenCalledWith('Copied to clipboard');
  });

  it('falls back to a hidden textarea when the clipboard API is unavailable', async () => {
    const execCommand = vi.fn(() => true);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    const onCopied = vi.fn();

    render(<CopyButton text="fallback payload" onCopied={onCopied} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => expect(execCommand).toHaveBeenCalledWith('copy'));
    expect(onCopied).toHaveBeenCalledWith('Copied to clipboard');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('reports an error when both copy paths fail', async () => {
    const writeText = vi.fn(() => Promise.reject(new Error('denied')));
    const execCommand = vi.fn(() => false);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    const onError = vi.fn();

    render(<CopyButton text="payload" onError={onError} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Unable to copy'));
    expect(document.querySelector('textarea')).toBeNull();
  });
});
