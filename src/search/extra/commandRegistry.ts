/** Immutable typed command registry with deterministic listing and duplicate rejection. */

import { normalizeCommandId } from './recentCommands';
import { compareText, normalizeQueryText, uniqueTokens } from './tokenizer';

export interface CommandDefinition {
  readonly id: string;
  readonly label: string;
  readonly group: string;
  readonly keywords?: readonly string[];
  readonly shortcut?: string;
  readonly run: () => void;
}

export interface RegisteredCommand extends CommandDefinition {
  readonly normalizedId: string;
  readonly normalizedLabel: string;
  readonly normalizedGroup: string;
  readonly keywords: readonly string[];
}

export interface CommandRegistry {
  readonly commands: readonly RegisteredCommand[];
}

export type RegistrationResult =
  | { readonly accepted: true; readonly registry: CommandRegistry; readonly command: RegisteredCommand }
  | { readonly accepted: false; readonly registry: CommandRegistry; readonly reason: 'invalid-command' | 'duplicate-id' };

export function createCommandRegistry(): CommandRegistry {
  return { commands: [] };
}

function compareCommands(left: RegisteredCommand, right: RegisteredCommand): number {
  return (
    compareText(left.normalizedGroup, right.normalizedGroup) ||
    compareText(left.normalizedLabel, right.normalizedLabel) ||
    compareText(left.normalizedId, right.normalizedId)
  );
}

function resolveRegistry(registry: CommandRegistry | null | undefined): CommandRegistry {
  if (registry === null || typeof registry !== 'object') return createCommandRegistry();
  const source = Array.isArray(registry.commands) ? (registry.commands as readonly unknown[]) : [];
  const commands: RegisteredCommand[] = [];
  const seen = new Set<string>();
  for (const entry of source) {
    if (entry === null || typeof entry !== 'object') continue;
    const candidate = entry as Partial<RegisteredCommand>;
    const normalizedId = normalizeCommandId(candidate.normalizedId ?? candidate.id);
    if (
      !normalizedId ||
      seen.has(normalizedId) ||
      typeof candidate.label !== 'string' ||
      typeof candidate.group !== 'string' ||
      typeof candidate.run !== 'function'
    ) {
      continue;
    }
    seen.add(normalizedId);
    commands.push({
      id: candidate.id ?? normalizedId,
      label: candidate.label,
      group: candidate.group,
      keywords: uniqueTokens(Array.isArray(candidate.keywords) ? (candidate.keywords as readonly unknown[]) : []),
      shortcut: typeof candidate.shortcut === 'string' ? candidate.shortcut : undefined,
      run: candidate.run as () => void,
      normalizedId,
      normalizedLabel: normalizeQueryText(candidate.label),
      normalizedGroup: normalizeQueryText(candidate.group),
    });
  }
  return { commands: commands.sort(compareCommands) };
}

function normalizeCommand(value: unknown): RegisteredCommand | null {
  if (value === null || typeof value !== 'object') return null;
  const candidate = value as Partial<CommandDefinition>;
  const normalizedId = normalizeCommandId(candidate.id);
  const label = normalizeQueryText(candidate.label);
  const group = normalizeQueryText(candidate.group);
  if (!normalizedId || !label || !group || typeof candidate.run !== 'function') return null;
  return {
    id: typeof candidate.id === 'string' ? candidate.id.trim() : normalizedId,
    label: typeof candidate.label === 'string' ? candidate.label.trim() : label,
    group: typeof candidate.group === 'string' ? candidate.group.trim() : group,
    keywords: uniqueTokens(Array.isArray(candidate.keywords) ? (candidate.keywords as readonly unknown[]) : []),
    shortcut: typeof candidate.shortcut === 'string' ? normalizeQueryText(candidate.shortcut) || undefined : undefined,
    run: candidate.run as () => void,
    normalizedId,
    normalizedLabel: label,
    normalizedGroup: group,
  };
}

/** Register a command, rejecting invalid definitions and duplicate normalized ids. */
export function registerCommand(registry: CommandRegistry, command: CommandDefinition): RegistrationResult {
  const current = resolveRegistry(registry);
  const candidate = normalizeCommand(command);
  if (!candidate) return { accepted: false, registry: current, reason: 'invalid-command' };
  if (current.commands.some((entry) => entry.normalizedId === candidate.normalizedId)) {
    return { accepted: false, registry: current, reason: 'duplicate-id' };
  }
  return { accepted: true, registry: { commands: [...current.commands, candidate].sort(compareCommands) }, command: candidate };
}

/** Look up a command by normalized id. */
export function lookupCommand(registry: CommandRegistry, id: unknown): RegisteredCommand | undefined {
  const normalized = normalizeCommandId(id);
  if (!normalized) return undefined;
  return resolveRegistry(registry).commands.find((entry) => entry.normalizedId === normalized);
}

/** List all commands, optionally limited to a normalized group name. */
export function listCommands(registry: CommandRegistry, group?: unknown): readonly RegisteredCommand[] {
  const commands = resolveRegistry(registry).commands;
  const normalizedGroup = normalizeQueryText(group);
  if (!normalizedGroup) return commands;
  return commands.filter((entry) => entry.normalizedGroup === normalizedGroup);
}

/** Sorted normalized group names currently present in the registry. */
export function commandGroups(registry: CommandRegistry): string[] {
  const groups = new Set(resolveRegistry(registry).commands.map((entry) => entry.normalizedGroup));
  return [...groups].sort(compareText);
}
