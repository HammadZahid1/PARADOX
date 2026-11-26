import { Copy } from 'lucide-react';

async function writeToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the selection-based path when the clipboard API is blocked.
    }
  }

  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

export interface CopyButtonProps {
  text: string;
  label?: string;
  onCopied?: (message: string) => void;
  onError?: (message: string) => void;
  className?: string;
}

export function CopyButton({ text, label = 'Copy', onCopied, onError, className = '' }: CopyButtonProps) {
  const handleClick = async (): Promise<void> => {
    const copied = await writeToClipboard(text);
    if (copied) onCopied?.('Copied to clipboard');
    else onError?.('Unable to copy');
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={handleClick}
      className={`inline-flex h-7 w-7 items-center justify-center border border-line text-muted hover:border-cyan/40 hover:text-cyan ${className}`}
    >
      <Copy size={13} aria-hidden="true" />
    </button>
  );
}
