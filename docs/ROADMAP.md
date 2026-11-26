# PARADOX Engineering Roadmap

This roadmap is a living document for the PARADOX alternate-reality simulation platform. It is organized into 24 phases that follow the dependency order of the system, from repository foundation through deterministic and probabilistic engines to visualization, workspace, and final refinement. Tasks use stable identifiers and checkbox syntax; completed items will be checked off in place as work lands. Move or re-scope items deliberately, preserving their IDs so history and discussion links remain valid.

**Total tasks: 376**

## Phase 01: Repository Foundation

- [ ] **P01-01** Initialize the monorepo root package manifest with pinned dependency versions and engine constraints
- [ ] **P01-02** Add the base TypeScript configuration with strict mode, exactOptionalPropertyTypes, and noUncheckedIndexedAccess enabled
- [ ] **P01-03** Create the build orchestration configuration for shared, engine, simulation, and UI packages
- [ ] **P01-04** Add the lint configuration with deterministic import ordering and no floating promises rules
- [ ] **P01-05** Add the formatting configuration with a single-quote, trailing-comma, and 100-column convention
- [ ] **P01-06** Create the .gitignore entries for build output, coverage artifacts, caches, and local environment files
- [ ] **P01-07** Add the .editorconfig file defining UTF-8 encoding, LF line endings, and two-space indentation
- [ ] **P01-08** Create the root README with repository layout, prerequisites, quick start, and package overview sections
- [ ] **P01-09** Add the license file and reference it from every published package manifest
- [ ] **P01-10** Define the workspace package boundary map with explicit allowed dependency directions
- [ ] **P01-11** Create the CI pipeline that runs install, typecheck, lint, unit tests, and build on pull requests
- [ ] **P01-12** Add branch protection guidance documentation covering required checks and review ownership
- [ ] **P01-13** Establish the changeset-based versioning workflow with package-level change categories
- [ ] **P01-14** Add the conventional commit validation hook for commit messages on shared branches
- [ ] **P01-15** Create the issue templates for bug reports, engine defects, and feature proposals
- [ ] **P01-16** Add the dependency audit job that fails the build on high or critical advisories

## Phase 02: Type System and Utilities

- [ ] **P02-01** Define the branded EntityId, BranchId, EventId, and TimelineId types with runtime validators
- [ ] **P02-02** Define the WorldStateShape interface describing typed variable slots and metadata
- [ ] **P02-03** Define the VariableDescriptor type with domain, mutability, unit, and initial-value fields
- [ ] **P02-04** Implement the deepFreeze utility that recursively freezes simulation inputs in development builds
- [ ] **P02-05** Implement the structural clone utility with special handling for maps, sets, dates, and typed arrays
- [ ] **P02-06** Implement the stable stringify utility producing canonical key ordering for hash inputs
- [ ] **P02-07** Implement the 64-bit FNV-1a hash wrapper used for state and branch identification
- [ ] **P02-08** Add the Result type and ok/err constructors with exhaustive discriminated error codes
- [ ] **P02-09** Implement the assertion helpers with narrow, assertDefined, and assertNever variants
- [ ] **P02-10** Implement the bounded variable clamping utility that emits validation errors outside declared ranges
- [ ] **P02-11** Implement the interval arithmetic helper with add, subtract, multiply, and intersect operations
- [ ] **P02-12** Add the seed parsing utility accepting numeric, string, and UUID-formatted seed inputs
- [ ] **P02-13** Implement the deterministic PRNG wrapper exposing next, nextInt, pick, and shuffle methods
- [ ] **P02-14** Add the typed event emitter with compile-time event-name and payload checking
- [ ] **P02-15** Implement the immutable sorted-list utility with binary insertion and lookup
- [ ] **P02-16** Add shared type-level tests using expectTypeOf for public utility signatures

## Phase 03: Deterministic Engine

- [ ] **P03-01** Define the SimulationEngine interface with step, run, reset, and snapshot operations
- [ ] **P03-02** Implement the fixed-step scheduler with configurable tick duration and maximum tick count
- [ ] **P03-03** Implement the state transition reducer as a pure function of state, inputs, and RNG draw
- [ ] **P03-04** Add the reproducibility guard that rejects non-serializable values in state transitions
- [ ] **P03-05** Implement the RNG stream splitter that derives independent named streams from a master seed
- [ ] **P03-06** Add the step budget enforcement that halts execution after the configured tick limit
- [ ] **P03-07** Implement the idle detection mechanism that stops runs when no state has changed for N ticks
- [ ] **P03-08** Add the engine pause and resume controls preserving pending scheduler state
- [ ] **P03-09** Implement the deterministic replay driver that consumes a recorded input log
- [ ] **P03-10** Add the state checksum computation after every tick in development builds
- [ ] **P03-11** Implement the variable update pipeline with pre-validation, application, and post-validation stages
- [ ] **P03-12** Add the derivation evaluator for computed variables depending on other variables
- [ ] **P03-13** Implement the cycle detection guard for derivation dependency graphs
- [ ] **P03-14** Add the engine telemetry hook exposing tick count, elapsed simulation time, and draw count
- [ ] **P03-15** Implement the abortable run handle with cooperative cancellation between ticks
- [ ] **P03-16** Add tests proving identical seeds and inputs produce byte-identical state checkpoints

## Phase 04: Probability Engine

- [ ] **P04-01** Define the ProbabilityDistribution interface with sample, mean, variance, and support methods
- [ ] **P04-02** Implement the uniform distribution over continuous and integer ranges
- [ ] **P04-03** Implement the normal distribution with configurable mean and standard deviation
- [ ] **P04-04** Implement the log-normal distribution with parameter conversion helpers
- [ ] **P04-05** Implement the exponential distribution with rate and scale parameterizations
- [ ] **P04-06** Implement the Bernoulli and binomial distributions with exact small-n paths
- [ ] **P04-07** Implement the Poisson distribution with Knuth and PTRS sampling strategies
- [ ] **P04-08** Implement the categorical distribution with weighted outcome tables
- [ ] **P04-09** Implement the triangular distribution for three-point estimate scenarios
- [ ] **P04-10** Implement the beta distribution with alpha-beta shape validation
- [ ] **P04-11** Implement the gamma distribution with shared gamma-shape sampling helper
- [ ] **P04-12** Add the seeded distribution sampler that accepts an injected RNG instance
- [ ] **P04-13** Implement the truncated distribution wrapper with rejection-sampling safeguards
- [ ] **P04-14** Add the mixture distribution composition with normalized component weights
- [ ] **P04-15** Implement the empirical distribution builder from observed sample arrays
- [ ] **P04-16** Add tests validating sample moments against analytic expectations within tolerance

## Phase 05: Event Engine

- [ ] **P05-01** Define the SimulationEvent schema with id, tick, type, priority, and payload fields
- [ ] **P05-02** Implement the event queue with binary-heap ordering by tick then priority then id
- [ ] **P05-03** Add the event validation layer rejecting unknown event types and malformed payloads
- [ ] **P05-04** Implement the event scheduler with relative and absolute tick offsets
- [ ] **P05-05** Implement the recurring event generator with interval, jitter, and max-occurrence settings
- [ ] **P05-06** Add the event cancellation mechanism keyed by stable event identifiers
- [ ] **P05-07** Implement the event handler registry with typed registration and priority ordering
- [ ] **P05-08** Add the event effect applier that produces immutable state deltas
- [ ] **P05-09** Implement the conditional event dispatcher with predicate evaluation against current state
- [ ] **P05-10** Add the event trace recorder capturing scheduled, dispatched, cancelled, and skipped events
- [ ] **P05-11** Implement the event mutation guard preventing handler-side mutation of queued events
- [ ] **P05-12** Add the deferred event batch for effects that must apply at end of tick
- [ ] **P05-13** Implement the event deduplication strategy using payload hashing within a tick
- [ ] **P05-14** Add the wildcard event listener with filtered payload projection
- [ ] **P05-15** Implement the event replay tool that re-applies a trace to a fresh engine
- [ ] **P05-16** Add tests for queue ordering stability across equal-priority events

## Phase 06: Causal Engine

- [ ] **P06-01** Define the CausalLink type with source, target, strength, delay, and confidence fields
- [ ] **P06-02** Implement the directed causal graph with cycle detection on insertion
- [ ] **P06-03** Add the graph topological sort used for ordered effect propagation
- [ ] **P06-04** Implement the direct effect propagator applying immediate variable-to-variable links
- [ ] **P06-05** Implement the delayed effect propagator scheduling changes on future ticks
- [ ] **P06-06** Add the causal path finder returning all simple paths between two variables
- [ ] **P06-07** Implement the counterfactual evaluator that answers what-if questions on a fixed graph
- [ ] **P06-08** Add the do-operator intervention API on the causal graph
- [ ] **P06-09** Implement the confounder detection heuristic over shared ancestor sets
- [ ] **P06-10** Add the causal strength estimator from observed intervention samples
- [ ] **P06-11** Implement the graph simplification pass that merges equivalent parallel links
- [ ] **P06-12** Add the saturated-graph guard that warns when link density exceeds a threshold
- [ ] **P06-13** Implement the transitive reduction utility for readability of dense graphs
- [ ] **P06-14** Add the invariant checker validating every link endpoint against the world schema
- [ ] **P06-15** Implement the causal explanation generator producing human-readable link chains
- [ ] **P06-16** Add tests for counterfactual results on a canonical three-variable chain

## Phase 07: Timeline and History

- [ ] **P07-01** Define the immutable Timeline type as an ordered sequence of state snapshots
- [ ] **P07-02** Implement the append-only timeline store with structural sharing of unchanged frames
- [ ] **P07-03** Add the frame indexing structure for constant-time lookup by tick
- [ ] **P07-04** Implement the timeline diff engine producing added, removed, and changed variable entries
- [ ] **P07-05** Add the variable history query returning values over a tick range
- [ ] **P07-06** Implement the timeline compression pass using run-length encoding for repeated states
- [ ] **P07-07** Add the checkpoint scheduler that writes full snapshots at configurable intervals
- [ ] **P07-08** Implement the delta replay path reconstructing frames between checkpoints
- [ ] **P07-09** Add the timeline trim operation with preserved anchor frames
- [ ] **P07-10** Implement the keyframe annotation API with user-authored notes and tags
- [ ] **P07-11** Add the timeline merge utility for parallel recorded input logs
- [ ] **P07-12** Implement the frame hash verification that flags corrupted snapshots
- [ ] **P07-13** Add the timeline slicing helper producing independent sub-timelines
- [ ] **P07-14** Implement the chronological event correlation over timeline frames
- [ ] **P07-15** Add the timeline export adapter producing compact binary and JSON forms
- [ ] **P07-16** Add tests for compression round-trip fidelity and checkpoint reconstruction

## Phase 08: Branching Realities

- [ ] **P08-01** Define the Branch type with parent, fork tick, label, and state pointer fields
- [ ] **P08-02** Implement the fork operation creating a child branch from a parent frame
- [ ] **P08-03** Add the branch tree structure with parent-child navigation helpers
- [ ] **P08-04** Implement the branch switch operation with workspace state restoration
- [ ] **P08-05** Add the branch rename and annotation operations with uniqueness checks
- [ ] **P08-06** Implement the branch prune operation that removes a subtree safely
- [ ] **P08-07** Add the branch compare operation returning diverging variables and events
- [ ] **P08-08** Implement the branch snapshot isolation guard preventing cross-branch mutation
- [ ] **P08-09** Add the branch bookmark system for pinned frames across realities
- [ ] **P08-10** Implement the branch serialization format preserving the tree topology
- [ ] **P08-11** Add the branch diff visualization data provider for UI consumers
- [ ] **P08-12** Implement the fork-from-event convenience action at a selected event tick
- [ ] **P08-13** Add the branch depth and fanout metrics computation
- [ ] **P08-14** Implement the branch search by label, annotation, and forking event type
- [ ] **P08-15** Add the branch color assignment utility for consistent visual identity
- [ ] **P08-16** Add tests for snapshot isolation, pruning, and tree serialization round-trips

## Phase 09: Scenario Presets

- [ ] **P09-01** Define the ScenarioPreset schema with metadata, world definition, and event schedule
- [ ] **P09-02** Author the default baseline preset with a minimal stable world
- [ ] **P09-03** Author the epidemic spread preset with contact and immunity variables
- [ ] **P09-04** Author the market shock preset with price, sentiment, and liquidity variables
- [ ] **P09-05** Author the climate tipping-point preset with feedback-loop causal links
- [ ] **P09-06** Author the orbital mechanics preset with deterministic integrator settings
- [ ] **P09-07** Author the ecosystem predator-prey preset with population distributions
- [ ] **P09-08** Add preset validation against the world schema with actionable error messages
- [ ] **P09-09** Implement the preset registry with lazy loading and category filtering
- [ ] **P09-10** Add preset version migration handling for schema upgrades
- [ ] **P09-11** Implement the preset search index over titles, tags, and descriptions
- [ ] **P09-12** Add the preset parameter override mechanism for quick experimentation
- [ ] **P09-13** Implement the preset thumbnail generation from canonical initial states
- [ ] **P09-14** Add preset provenance metadata with source citation fields
- [ ] **P09-15** Implement the preset duplication flow into the user workspace
- [ ] **P09-16** Add tests that every shipped preset runs deterministically for 1000 ticks

## Phase 10: World and Scenario Builders

- [ ] **P10-01** Design the builder state machine with select, edit, connect, and validate modes
- [ ] **P10-02** Implement the variable authoring form with type, range, and unit inputs
- [ ] **P10-03** Add the variable deletion flow with dependency reference cleanup
- [ ] **P10-04** Implement the causal link authoring interaction with source and target pickers
- [ ] **P10-05** Add the link weight and delay editor with inline validation feedback
- [ ] **P10-06** Implement the initial-condition editor with distribution selection per variable
- [ ] **P10-07** Add the world metadata editor for title, description, and tags
- [ ] **P10-08** Implement the template library for common variable and link patterns
- [ ] **P10-09** Add the builder undo and redo stack keyed to discrete edit operations
- [ ] **P10-10** Implement the live schema validation panel with navigable diagnostics
- [ ] **P10-11** Add the world preview panel showing a single initialized state
- [ ] **P10-12** Implement the copy-world-as-template action
- [ ] **P10-13** Add the builder auto-save draft with recovery prompt on startup
- [ ] **P10-14** Implement the import-from-existing-world cloning action
- [ ] **P10-15** Add keyboard shortcuts for mode switching and element deletion
- [ ] **P10-16** Add tests for builder state transitions and undo-redo equivalence

## Phase 11: Event Injection

- [ ] **P11-01** Implement the manual event injection dialog with type-specific payload forms
- [ ] **P11-02** Add the tick-offset selector for immediate, delayed, and recurring injection
- [ ] **P11-03** Implement the injection preview showing expected state deltas before commit
- [ ] **P11-04** Add the injection history panel listing all user-injected events
- [ ] **P11-05** Implement the bulk injection from a pasted JSON event array
- [ ] **P11-06** Add the injection template picker with common event presets
- [ ] **P11-07** Implement the injection validation against the active world schema
- [ ] **P11-08** Add the undo action for the most recent injection at the current branch
- [ ] **P11-09** Implement the inject-and-fork combined action
- [ ] **P11-10** Add the injection effect highlight on the timeline visualization
- [ ] **P11-11** Implement the scheduled injection calendar view by tick ranges
- [ ] **P11-12** Add the injection conflict warning for duplicate ids in one tick
- [ ] **P11-13** Implement the conditional injection rule builder using state predicates
- [ ] **P11-14** Add the injection audit log with user, timestamp, and branch fields
- [ ] **P11-15** Implement the injection replay-from-selection action
- [ ] **P11-16** Add tests for injection preview accuracy against committed effects

## Phase 12: Comparison

- [ ] **P12-01** Define the ComparisonReport type with variables, events, and metadata sections
- [ ] **P12-02** Implement side-by-side branch selection with independent frame cursors
- [ ] **P12-03** Add the variable delta table with absolute and percentage change columns
- [ ] **P12-04** Implement the significant-change filter driven by configurable thresholds
- [ ] **P12-05** Add the event divergence list showing events unique to each branch
- [ ] **P12-06** Implement the causal-path divergence summary between two branches
- [ ] **P12-07** Add the comparison snapshot export as a shareable report object
- [ ] **P12-08** Implement the multi-branch comparison matrix for up to eight branches
- [ ] **P12-09** Add the comparison bookmark for re-opening a saved pair of cursors
- [ ] **P12-10** Implement the synchronized timeline scrubbing across compared branches
- [ ] **P12-11** Add the difference heatmap data provider keyed by variable and tick
- [ ] **P12-12** Implement the comparison narrative generator with templated sentence output
- [ ] **P12-13** Add the comparison annotation tool for analyst notes
- [ ] **P12-14** Implement the compare-against-baseline shortcut from any branch
- [ ] **P12-15** Add tests for delta computation on known divergent fixtures
- [ ] **P12-16** Add tests for report serialization and rehydration fidelity

## Phase 13: Monte Carlo

- [ ] **P13-01** Implement the batch runner executing N independent simulations from one seed family
- [ ] **P13-02** Add the worker-pool dispatcher with configurable concurrency limits
- [ ] **P13-03** Implement the deterministic seed derivation for each batch trial
- [ ] **P13-04** Add the batch progress reporting with throughput estimates
- [ ] **P13-05** Implement the cooperative cancellation of an in-flight batch
- [ ] **P13-06** Add the run configuration form for trial count, tick count, and seed range
- [ ] **P13-07** Implement the aggregated outcome collector keyed by variable and tick
- [ ] **P13-08** Add the percentile band computation for p5, p25, p50, p75, and p95
- [ ] **P13-09** Implement the histogram builder with Freedman-Diaconis bin selection
- [ ] **P13-10** Add the rare-event counter with configurable threshold predicates
- [ ] **P13-11** Implement the batch result caching keyed by config hash
- [ ] **P13-12** Add the batch comparison across two run configurations
- [ ] **P13-13** Implement the partial-result recovery after a worker failure
- [ ] **P13-14** Add the batch export adapter producing row-oriented result sets
- [ ] **P13-15** Implement the memory-bounded streaming aggregator for large batches
- [ ] **P13-16** Add tests proving batch reproducibility for a fixed seed family

## Phase 14: Analytics

- [ ] **P14-01** Implement the descriptive statistics summary over any selected variable series
- [ ] **P14-02** Add the moving-average and exponentially weighted moving-average transforms
- [ ] **P14-03** Implement the autocorrelation function estimator with lag limits
- [ ] **P14-04** Add the cross-correlation calculator between two variable series
- [ ] **P14-05** Implement the linear-regression fit with slope, intercept, and R-squared
- [ ] **P14-06** Add the change-point detector based on cumulative sum deviations
- [ ] **P14-07** Implement the trend classifier with flat, increasing, decreasing, and cyclic labels
- [ ] **P14-08** Add the outlier detector using median absolute deviation
- [ ] **P14-09** Implement the entropy estimator over categorical event frequencies
- [ ] **P14-10** Add the event rate calculator per thousand ticks
- [ ] **P14-11** Implement the first-passage-time computation for threshold crossings
- [ ] **P14-12** Add the sensitivity analysis sweep over one parameter grid
- [ ] **P14-13** Implement the Sobol-style index approximation for two-parameter interactions
- [ ] **P14-14** Add the analytics result table with sortable numeric columns
- [ ] **P14-15** Implement the analytics finding exporter to Markdown
- [ ] **P14-16** Add tests for statistics on datasets with known analytic values

## Phase 15: 2D Visualization

- [ ] **P15-01** Implement the SVG timeline chart rendering variable series over ticks
- [ ] **P15-02** Add the multi-series overlay with per-series color and visibility toggles
- [ ] **P15-03** Implement the brush-based tick range selection on the timeline chart
- [ ] **P15-04** Add the percentile band renderer for Monte Carlo results
- [ ] **P15-05** Implement the causal graph canvas with force-directed layout
- [ ] **P15-06** Add the graph node drag interaction with persisted positions
- [ ] **P15-07** Implement the event density strip aligned to the timeline axis
- [ ] **P15-08** Add the branch tree diagram with fork markers and labels
- [ ] **P15-09** Implement the histogram chart with configurable bin highlighting
- [ ] **P15-10** Add the scatter plot for two-variable correlation views
- [ ] **P15-11** Implement the tooltip system with formatted values and provenance
- [ ] **P15-12** Add the chart legend with click-to-isolate behavior
- [ ] **P15-13** Implement the axis tick formatter supporting compact numeric notation
- [ ] **P15-14** Add the export-chart-as-SVG action
- [ ] **P15-15** Implement the chart theme tokens shared with the UI shell
- [ ] **P15-16** Add visual regression tests for the primary chart renders

## Phase 16: 3D Visualization

- [ ] **P16-01** Implement the WebGL scene bootstrap with resize-aware renderer setup
- [ ] **P16-02** Add the orbit camera controls with damping and configurable bounds
- [ ] **P16-03** Implement the causal graph 3D layout using layered depth assignment
- [ ] **P16-04** Add the node sphere meshes with color mapped to variable value
- [ ] **P16-05** Implement the directed link tubes with arrow markers
- [ ] **P16-06** Add the animated pulse effect representing event propagation along links
- [ ] **P16-07** Implement the raycast picking for nodes and links
- [ ] **P16-08** Add the hover highlight and selection outline for picked nodes
- [ ] **P16-09** Implement the tick-driven scene updater consuming timeline frames
- [ ] **P16-10** Add the playback controls for 3D scene animation
- [ ] **P16-11** Implement the branch comparison mode rendering two scenarios side by side
- [ ] **P16-12** Add the axis grid and value legend overlay
- [ ] **P16-13** Implement the screenshot capture action for the current camera view
- [ ] **P16-14** Add the device pixel ratio cap to protect fill rate on high-DPI screens
- [ ] **P16-15** Implement the graceful fallback message when WebGL is unavailable
- [ ] **P16-16** Add tests for scene graph construction from a canonical world fixture

## Phase 17: Workspace and Persistence

- [ ] **P17-01** Define the WorkspaceState schema covering open branches, panels, and cursors
- [ ] **P17-02** Implement the local storage persistence adapter with versioned envelopes
- [ ] **P17-03** Add the IndexedDB adapter for large timelines and batch results
- [ ] **P17-04** Implement the schema migration runner for persisted workspace upgrades
- [ ] **P17-05** Add the autosave scheduler with debounce and idle flush
- [ ] **P17-06** Implement the workspace restore flow with corruption fallback
- [ ] **P17-07** Add the named workspace save and load operations
- [ ] **P17-08** Implement the recent-workspaces list with pinned entries
- [ ] **P17-09** Add the workspace export bundle containing state, branches, and presets
- [ ] **P17-10** Implement the workspace import validator rejecting unsupported versions
- [ ] **P17-11** Add the unsaved-changes guard on navigation and tab close
- [ ] **P17-12** Implement the storage quota warning with actionable cleanup suggestions
- [ ] **P17-13** Add the workspace reset action with confirmation step
- [ ] **P17-14** Implement the persistence unit-of-work abstraction for atomic writes
- [ ] **P17-15** Add tests for migration chains and corrupted-envelope recovery

## Phase 18: Import and Export

- [ ] **P18-01** Implement the JSON schema validator for world and timeline import files
- [ ] **P18-02** Add the version negotiation layer for legacy import formats
- [ ] **P18-03** Implement the CSV variable-series importer with header mapping
- [ ] **P18-04** Add the CSV batch-result exporter with escaped fields
- [ ] **P18-05** Implement the NDJSON event-log importer with per-line error reporting
- [ ] **P18-06** Add the report exporter to Markdown with embedded tables
- [ ] **P18-07** Implement the bundle archive writer using a manifest and checksum entries
- [ ] **P18-08** Add the bundle archive reader with tamper detection
- [ ] **P18-09** Implement the shareable link encoder for compact scenario descriptions
- [ ] **P18-10** Add the shareable link decoder with schema validation
- [ ] **P18-11** Implement the export preview dialog listing included artifacts
- [ ] **P18-12** Add the import warning summary for dropped unknown fields
- [ ] **P18-13** Implement the drag-and-drop file target with type detection
- [ ] **P18-14** Add the export filename generator with sanitized scenario titles
- [ ] **P18-15** Add round-trip tests for world, timeline, and report formats

## Phase 19: Search and Command Palette

- [ ] **P19-01** Implement the global search index over worlds, branches, events, and presets
- [ ] **P19-02** Add the fuzzy matcher with typo tolerance and rank scoring
- [ ] **P19-03** Implement the command registry with id, title, group, and handler fields
- [ ] **P19-04** Add the command palette dialog with keyboard-only navigation
- [ ] **P19-05** Implement the recent-commands ranking boost
- [ ] **P19-06** Add the context-aware command filtering by active panel and selection
- [ ] **P19-07** Implement the search result grouping with section headers
- [ ] **P19-08** Add the highlighted match rendering in result titles
- [ ] **P19-09** Implement the search history store with clear action
- [ ] **P19-10** Add the jump-to-tick command from a search result
- [ ] **P19-11** Implement the keybinding resolver with conflict detection
- [ ] **P19-12** Add the palette help footer showing active shortcuts
- [ ] **P19-13** Implement the async command execution with progress indication
- [ ] **P19-14** Add the no-results state with suggested related searches
- [ ] **P19-15** Add tests for matcher ranking and command dispatch

## Phase 20: UI Shell and Panels

- [ ] **P20-01** Implement the application shell with header, sidebar, canvas, and footer regions
- [ ] **P20-02** Add the panel docking system with resizable splitters
- [ ] **P20-03** Implement the tabbed workspace area with drag reordering
- [ ] **P20-04** Add the collapsible sidebar with persisted visibility state
- [ ] **P20-05** Implement the global toolbar with run, pause, step, and reset controls
- [ ] **P20-06** Add the status bar showing seed, tick, branch, and engine state
- [ ] **P20-07** Implement the inspector panel for selected variables and events
- [ ] **P20-08** Add the diagnostics panel listing schema and runtime warnings
- [ ] **P20-09** Implement the toast notification system with severity variants
- [ ] **P20-10** Add the modal dialog manager with focus trap and escape handling
- [ ] **P20-11** Implement the theme switcher with light, dark, and system modes
- [ ] **P20-12** Add the loading skeleton components for async panels
- [ ] **P20-13** Implement the empty-state components for each major panel
- [ ] **P20-14** Add the in-app help drawer linking to documentation sections
- [ ] **P20-15** Add component tests for shell layout and dialog focus behavior

## Phase 21: Responsive Design

- [ ] **P21-01** Define the breakpoint tokens for compact, medium, and wide layouts
- [ ] **P21-02** Implement the compact layout hiding the sidebar behind a drawer toggle
- [ ] **P21-03** Add the stackable panel mode for narrow viewports
- [ ] **P21-04** Implement the touch-friendly hit targets for primary controls
- [ ] **P21-05** Add the responsive chart resizing with ResizeObserver integration
- [ ] **P21-06** Implement the condensed toolbar with overflow menu on small screens
- [ ] **P21-07** Add the table horizontal-scroll treatment with sticky first column
- [ ] **P21-08** Implement the media-query hook shared across components
- [ ] **P21-09** Add the responsive branch tree with collapse-by-depth defaults
- [ ] **P21-10** Implement the mobile-friendly command palette positioning
- [ ] **P21-11** Add the orientation-change handling for the 3D viewport
- [ ] **P21-12** Implement the reduced-motion media query support for animated transitions
- [ ] **P21-13** Add the viewport-size persistence for restored panel layouts
- [ ] **P21-14** Implement the print stylesheet for comparison reports
- [ ] **P21-15** Add visual checks at three target viewport widths

## Phase 22: Accessibility

- [ ] **P22-01** Add semantic landmarks to the application shell regions
- [ ] **P22-02** Implement keyboard navigation for the timeline chart using arrow keys
- [ ] **P22-03** Add accessible names and descriptions to all icon-only controls
- [ ] **P22-04** Implement focus-visible styling tokens across interactive elements
- [ ] **P22-05** Add the skip-to-content link in the application shell
- [ ] **P22-06** Implement screen-reader announcements for run start, pause, and completion
- [ ] **P22-07** Add ARIA live regions for validation and engine errors
- [ ] **P22-08** Implement accessible labels for causal graph nodes and links
- [ ] **P22-09** Add the high-contrast theme with verified color ratios
- [ ] **P22-10** Implement keyboard shortcuts for fork, inject, and compare commands
- [ ] **P22-11** Add focus restoration after modal dialog close
- [ ] **P22-12** Implement reduced-motion fallbacks for event pulse animations
- [ ] **P22-13** Add the accessible data table markup for delta reports
- [ ] **P22-14** Implement the color-vision-independent encoding for series and branches
- [ ] **P22-15** Add automated axe checks to the component test suite

## Phase 23: Testing and QA

- [ ] **P23-01** Add the unit test project configuration with coverage thresholds
- [ ] **P23-02** Implement the property-based test suite for PRNG distribution invariants
- [ ] **P23-03** Add the golden-master fixtures for deterministic engine checkpoints
- [ ] **P23-04** Implement the integration test harness that boots a full simulation run
- [ ] **P23-05** Add the end-to-end test for creating a world and running a branch
- [ ] **P23-06** Implement the end-to-end test for fork, inject, and compare workflow
- [ ] **P23-07** Add the end-to-end test for import and export round trips
- [ ] **P23-08** Implement the seeded fuzz harness for event queue inputs
- [ ] **P23-09** Add the mutation-testing job for the engine package
- [ ] **P23-10** Implement the performance regression benchmark suite with baseline snapshots
- [ ] **P23-11** Add the cross-browser smoke test matrix for core workflows
- [ ] **P23-12** Implement the accessibility audit gate in continuous integration
- [ ] **P23-13** Add the flaky-test quarantine workflow with owner assignment
- [ ] **P23-14** Implement the test data factory package for worlds and events
- [ ] **P23-15** Add the release checklist documenting manual verification steps

## Phase 24: Performance, Refinement, and Documentation

- [ ] **P24-01** Profile the state transition hot path and eliminate avoidable allocations
- [ ] **P24-02** Add the incremental computation cache for derived variables
- [ ] **P24-03** Optimize timeline storage using structural sharing across frames
- [ ] **P24-04** Implement the web worker offloading for long-running batch jobs
- [ ] **P24-05** Add the lazy loading boundary for the 3D visualization package
- [ ] **P24-06** Implement the virtualization for long event and result tables
- [ ] **P24-07** Add the bundle size budget check in continuous integration
- [ ] **P24-08** Implement the telemetry opt-in hook for anonymous performance counters
- [ ] **P24-09** Add the engine API reference documentation with examples
- [ ] **P24-10** Write the user guide covering worlds, branches, events, and comparison
- [ ] **P24-11** Write the preset authoring guide with schema walkthrough
- [ ] **P24-12** Add the troubleshooting page for determinism and reproducibility issues
- [ ] **P24-13** Write the contributor guide covering package boundaries and review flow
- [ ] **P24-14** Add the architecture decision record template and initial records
- [ ] **P24-15** Publish the release notes process with changelog generation from changesets
