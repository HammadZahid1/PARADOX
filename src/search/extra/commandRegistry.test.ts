import { describe, expect, it } from 'vitest';
import {
  commandGroups,
  createCommandRegistry,
  listCommands,
  lookupCommand,
  registerCommand,
  type CommandDefinition,
  type CommandRegistry,
  type RegistrationResult,
} from './commandRegistry';

const noop = (): void => {};

function accepted(result: RegistrationResult): Extract<RegistrationResult, { accepted: true }> {
  if (!result.accepted) throw new Error(`unexpected rejection: ${result.reason}`);
  return result;
}

describe('command registry', () => {
  it('registers, normalizes ids and lists commands deterministically by group', () => {
    let registry = createCommandRegistry();
    registry = accepted(registerCommand(registry, { id: 'New Scenario', label: 'New scenario', group: 'Scenario', run: noop })).registry;
    registry = accepted(registerCommand(registry, { id: 'view-lab', label: 'Open lab', group: 'Navigate', run: noop })).registry;
    registry = accepted(registerCommand(registry, { id: 'new-branch', label: 'Create branch', group: 'Scenario', run: noop })).registry;
    expect(listCommands(registry).map((command) => command.id)).toEqual(['view-lab', 'new-branch', 'New Scenario']);
    expect(commandGroups(registry)).toEqual(['navigate', 'scenario']);
    expect(lookupCommand(registry, ' NEW SCENARIO ')?.id).toBe('New Scenario');
  });

  it('lists a single group case-insensitively', () => {
    let registry = createCommandRegistry();
    registry = accepted(registerCommand(registry, { id: 'a', label: 'Alpha', group: 'Scenario', run: noop })).registry;
    registry = accepted(registerCommand(registry, { id: 'b', label: 'Beta', group: 'View', run: noop })).registry;
    expect(listCommands(registry, 'SCENARIO').map((command) => command.id)).toEqual(['a']);
    expect(listCommands(registry, 'missing')).toEqual([]);
  });

  it('rejects duplicate normalized ids without changing the registry', () => {
    const registry = accepted(registerCommand(createCommandRegistry(), { id: 'new-scenario', label: 'New', group: 'Scenario', run: noop })).registry;
    const result = registerCommand(registry, { id: 'new_scenario', label: 'Other', group: 'Scenario', run: noop });
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('duplicate-id');
    expect(result.registry.commands).toHaveLength(1);
  });

  it('rejects invalid command definitions', () => {
    const registry = createCommandRegistry();
    const invalid = [
      { id: '', label: 'Valid', group: 'Scenario', run: noop },
      { id: 'valid', label: '  ', group: 'Scenario', run: noop },
      { id: 'valid', label: 'Valid', group: '', run: noop },
      { id: 'valid', label: 'Valid', group: 'Scenario', run: 'noop' },
      null,
    ];
    for (const command of invalid) {
      const result = registerCommand(registry, command as unknown as CommandDefinition);
      expect(result.accepted).toBe(false);
      if (!result.accepted) expect(result.reason).toBe('invalid-command');
    }
    expect(registry.commands).toEqual([]);
  });

  it('copies keyword arrays so callers cannot mutate the registry', () => {
    const keywords = ['create'];
    const definition: CommandDefinition = { id: 'copy-test', label: 'Copy', group: 'Test', keywords, run: noop };
    const result = accepted(registerCommand(createCommandRegistry(), definition));
    keywords.push('mutated');
    expect(result.command.keywords).toEqual(['create']);
    expect(definition.keywords).toEqual(['create', 'mutated']);
  });

  it('sanitizes malformed registries', () => {
    const malformed = { commands: [null, 42, { id: 'a', label: 'Alpha', group: 'View', run: noop }] } as unknown as CommandRegistry;
    expect(listCommands(malformed).map((command) => command.id)).toEqual(['a']);
    expect(lookupCommand(null as unknown as CommandRegistry, 'a')).toBeUndefined();
    expect(listCommands(null as unknown as CommandRegistry)).toEqual([]);
  });
});
