/** Small string helpers for labels, previews and user-supplied text. */

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, length = 48): string {
  const limit = Math.floor(length);
  if (limit <= 0) return '';
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

export function capitalize(text: string): string {
  return text.length === 0 ? '' : `${text.charAt(0).toUpperCase()}${text.slice(1).toLowerCase()}`;
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

export function stripControlChars(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
}
