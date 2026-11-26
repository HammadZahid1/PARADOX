# Scenarios and Presets

Scenarios are the input to `SimulationEngine` (`src/engine/simulation/engine.ts`). They are plain local JSON-shaped objects. All shipped and generated scenarios are **simplified fictional educational models**; the ecosystem preset stands in for climate feedbacks and the geopolitics preset uses invented regions, not real-world measurements or forecasts.

## Built-in presets

Registered in `src/engine/scenarios/index.ts` via `SCENARIO_PRESETS` and built fresh by `createAllPresets()`:

| Preset id | Name | Domain | Source file |
| --- | --- | --- | --- |
| `economy` | Macroeconomic Cycle | economics | `src/engine/scenarios/economy.ts` |
| `civilization` | Civilisation Development | civilization | `src/engine/scenarios/civilization.ts` |
| `ecosystem` | Ecosystem Feedbacks | ecosystem | `src/engine/scenarios/ecosystem.ts` |
| `technology` | Technology Diffusion | technology | `src/engine/scenarios/technology.ts` |
| `geopolitics` | Fictional Regional Relations | geopolitics | `src/engine/scenarios/geopolitics.ts` |
| `supply-chain` | Supply Chain Under Stress | supply-chain | `src/engine/scenarios/supplyChain.ts` |
| `urban` | Urban Growth Pressures | urban | `src/engine/scenarios/urban.ts` |

`src/ui/App.tsx` bootstraps these presets once when the scenario list is empty. `src/ui/views/ScenariosView.tsx` displays their metadata and loads one via `useParadox.loadScenario()`.

## Scenario shape

Defined in `src/engine/types/scenario.ts`:

```ts
interface Scenario {
  id: string;
  name: string;
  description: string;
  domain: string;
  worldId: string;
  variables: VariableDefinition[];
  parameters: Record<string, ScalarValue>;
  rules: SimulationRule[];
  events: SimulationEvent[];
  causalGraph?: CausalGraph;
  configuration: SimulationConfiguration;
  objectives: ScenarioObjective[];
  tags: readonly string[];
  preset: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
  disclaimer?: string;
}
```

Supporting types:

- `VariableDefinition` / `VariableConstraints` — `src/engine/types/core.ts`. `type` is `number | boolean | categorical | derived | custom`; `min`, `max`, `constraints.allowed`, and `constraints.integer` constrain values.
- `SimulationRule` / `RuleEffect` — `src/engine/types/scenario.ts`. Rules have conditions, priority, and arithmetic effects.
- `SimulationEvent` / `EventTrigger` / `EventEffect` — `src/engine/types/events.ts`. See `docs/ENGINE.md` for trigger semantics.
- `ScenarioObjective` — a target on a variable key with `gte`, `lte`, or `eq`.

### Authoring details that matter at runtime

- Variables are keyed by `VariableDefinition.id` in `WorldState.variables`, but rules, events, objectives, and most UI controls refer to `key`. Keep both stable and unique; `validateVariableSet()` rejects duplicate keys.
- `VariableDefinition.type` controls value checks: `number`/`derived` expect numbers, `boolean` expects booleans, and `categorical`/`custom` expect strings. `constraints.integer`, `allowed`, `min`, and `max` are checked by `src/engine/validation/variable.ts`.
- A `derived` variable must list `derivedFrom` identifiers and supply an `expression`; `recomputeDerived()` in `src/engine/core/variables.ts` evaluates it with the local parser and ignores malformed expressions.
- `RuleEffect.kind` is one of `increase`, `decrease`, `assign`, `multiply`, or `percentChange`. `SimulationRule.conditions` are combined with an optional single `condition`, and enabled rules run in descending `priority` order in `applyRules()` (`src/engine/core/rules.ts`).
- `EventTrigger` includes `manual`, `scheduled`, `threshold`, `boolean`, `probability`, `dependency`, `recurring`, and `cascade` variants. `EventEffect` also supports `conditional`, `temporary`, `activate`, `cancel`, and `log` beyond the arithmetic effects; see `src/engine/types/events.ts` and `docs/ENGINE.md`.
- `SimulationConfiguration.strictValidation` defaults to `true`, but `SimulationEngine.step()` does not revalidate a scenario. Validators are invoked at explicit boundaries such as `createImportPlan()` and `ParadoxRepository.saveScenario()`.

## Deterministic factory

`src/engine/scenarios/factory.ts` supplies the authoring primitives:

| Function | Purpose |
| --- | --- |
| `makeVariable()` | Stable defaults with copied option arrays |
| `makeRule()` | Enabled rule with copied conditions/effects |
| `makeEvent()` | Infers event `type` from trigger kind; normalizes probability to `[0,1]` |
| `defaultConfiguration()` | Fixed baseline config, cloned per call |
| `createScenario()` | Assembles a scenario with fixed `createdAt: 0`, `updatedAt: 0`, `version: 1` |
| `cloneScenario()` | Deep-copies variables, rules, events, config, objectives, graph |

Baseline configuration from `defaultConfiguration()`:

```ts
{
  stepDuration: 1,
  maxSteps: 120,
  seed: 1337,
  mode: 'deterministic',
  propagationLimit: 6,
  autoSnapshotSteps: 10,
  strictValidation: true,
}
```

The factory clones nested arrays explicitly rather than relying on `structuredClone`, so preset builders are reproducible across browser and test environments.

## Example: ecosystem preset

`src/engine/scenarios/ecosystem.ts` defines seven bounded index variables (`temperature`, `precipitation`, `biodiversity`, `carbon`, `vegetation`, `ocean`, `ecosystemStability`) and priority-ordered feedback rules such as “carbon increases temperature” and “vegetation absorbs carbon”. Thresholds stand in for more complex dynamics.

## Example: geopolitics preset

`src/engine/scenarios/geopolitics.ts` uses the invented Aurora League, Meridian Compact, and Sable Coast. Variables include `cooperation`, `tension`, `trade`, `security`, `resources`, and `publicSentiment`. Rules encode simple relationships such as trade increasing cooperation and tension eroding trade. The file header explicitly labels these as abstract indices, not measurements of real states.

## Local scenario generation

`src/engine/scenarios/custom.ts` has two paths:

- `customScenario()` returns a blank valid scenario with no domain assumptions.
- `generateScenario()` builds a deterministic scenario from a title, domain, `startingConditions`, `eventNames`, and duration. It uses transparent template rules (small up/down drift around each starting value), scheduled events at steps `5 + 7 * index` capped to the duration, and a seed hashed from `title|domain|maxSteps`. Duration is clamped to 30–200. No network calls, clock seeds, or model inference are used.

The UI entry point is `src/ui/modals/NewScenarioModal.tsx` (“Generate locally”). Its helper text states that generated scenarios are fictional models, not forecasts.

The generator is deliberately transparent:

1. Each finite starting condition becomes a bounded number variable whose id is `<scenario-id>.variable.<key>`; keys are sanitized and de-duplicated by `identifier()`.
2. Each variable receives two rules with priorities 10 and 9: an upward nudge at or above its baseline and a smaller downward nudge at or below it. The priority tie-break makes the baseline deterministic.
3. Each event name becomes a scheduled event at `min(maxSteps - 1, 5 + 7 * index)` with `probability: 1`, short duration, cooldown, a log effect, and small nudges to the first one or two variables.
4. `seedFromText()` hashes `` `${title}|${domain}|${maxSteps}` `` with FNV-style operations; the id is `generated.<slug(title)>.<slug(domain)>`.
5. `autoSnapshotSteps` becomes `max(5, floor(maxSteps / 10))`, and the disclaimer explicitly says “Simplified educational model”.

`customScenario()` is a separate path: it returns a blank non-preset scenario with empty variables/rules/events, merges overrides, then deep-clones the result. Neither path reads the clock or calls a service.

## Validation and loading

`validateScenario()` in `src/engine/validation/scenario.ts` checks:

- Required non-empty `id`, `name`, `domain`, `worldId`.
- Variable set via `validateVariableSet()`.
- Every event via `validateEvent()`.
- Positive `maxSteps` and `stepDuration`, finite `seed`.
- Optional causal graph via `validateCausalGraph()`.
- Objective variable keys exist.

`validateVariableSet()` additionally checks required strings, `min <= max`, non-empty `constraints.allowed`, duplicate keys, and each definition's type/range/integer constraints. `validateCausalGraph()` requires non-empty edge ids/endpoints, strength in `[-1, 1]`, non-negative `delaySteps`, existing node references, and unique edge ids. `graphCycleWarning()` is advisory only; propagation stops at `propagationLimit` rather than rejecting cycles.

`validateScenarioList()` additionally rejects duplicate scenario ids. `scenarioSummary()` in the same file formats a short “name: N variables, M events, K steps” string for diagnostics. `createImportPlan()` in `src/io/import.ts` runs these validators before a scenario enters the store; `ParadoxRepository.saveScenario()` applies the same scenario validator before writing to IndexedDB. `loadScenario()` in `src/state/store.ts` constructs a fresh `SimulationEngine`, pauses playback, resets `replayStep`, selects the new prime branch, and pushes a success toast.

Because `loadScenario()` replaces the engine, stepping state, branches, snapshots, and history from the previous scenario are discarded. Presets are recreated from `createAllPresets()` at bootstrap and by tests; treat returned objects as fresh fixtures rather than shared singletons.

## Authoring a new preset

1. Add `src/engine/scenarios/<name>.ts` using `makeVariable`, `makeRule`, `makeEvent`, and `createScenario`.
2. Add a bounded numeric variable, meaningful priority values, and a plain-language `description` and `disclaimer`.
3. Register it in `SCENARIO_PRESETS` in `src/engine/scenarios/index.ts` with a stable id.
4. Add a `src/engine/scenarios/<name>.test.ts` following existing preset tests.
5. Prefer fixed seed and timestamps; avoid `Math.random()` and `Date.now()` in scenario definitions.
