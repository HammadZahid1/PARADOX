import { useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { scaleLinear } from 'd3-scale';
import { Activity, GitBranch } from 'lucide-react';
import { Color } from 'three';
import { branchTree } from '@/engine/reality/branch';
import type { EntityId, RealityBranch } from '@/engine/types';
import { useParadox } from '@/state/store';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { ErrorBoundary } from '@/ui/components/ErrorBoundary';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { Sparkline } from '@/ui/components/Sparkline';
import { Toggle } from '@/ui/components/Toggle';

interface Position {
  x: number;
  y: number;
  z: number;
}

interface DivergenceLink {
  id: EntityId;
  from: Position;
  to: Position;
  color: string;
  step: number;
}

interface PointCloud {
  id: EntityId;
  coords: Float32Array;
  color: string;
}

interface UniverseSceneProps {
  tree: Array<{ branch: RealityBranch; depth: number }>;
  positions: Record<EntityId, Position>;
  links: DivergenceLink[];
  clouds: PointCloud[];
  selectedId: EntityId;
  maxStep: number;
  showGrid: boolean;
  reducedMotion: boolean;
  onSelect: (id: EntityId) => void;
}

function DivergenceLinks({ links }: { links: readonly DivergenceLink[] }) {
  const geometry = useMemo(() => {
    const coords: number[] = [];
    const colors: number[] = [];
    for (const link of links) {
      coords.push(link.from.x, link.from.y, link.from.z, link.to.x, link.to.y, link.to.z);
      const tint = new Color(link.color);
      colors.push(tint.r, tint.g, tint.b, tint.r, tint.g, tint.b);
    }
    return { coords: new Float32Array(coords), colors: new Float32Array(colors) };
  }, [links]);

  if (geometry.coords.length === 0) return null;
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geometry.coords, 3]} />
        <bufferAttribute attach="attributes-color" args={[geometry.colors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.55} />
    </lineSegments>
  );
}

function RealityNode({ branch, position, radius, selected, onSelect }: {
  branch: RealityBranch;
  position: Position;
  radius: number;
  selected: boolean;
  onSelect: (id: EntityId) => void;
}) {
  return (
    <group
      position={[position.x, position.y, position.z]}
      onClick={(event) => { event.stopPropagation(); onSelect(branch.id); }}
    >
      <mesh>
        <sphereGeometry args={[radius, 24, 16]} />
        <meshStandardMaterial
          color={branch.color}
          emissive={branch.color}
          emissiveIntensity={selected ? 0.75 : 0.2}
          roughness={0.35}
          metalness={0.12}
        />
      </mesh>
      {selected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 1.75, 0.014, 8, 48]} />
          <meshBasicMaterial color={branch.color} transparent opacity={0.85} />
        </mesh>
      )}
      <mesh position={[0, -radius - 0.22, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.44, 6]} />
        <meshBasicMaterial color={branch.color} transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

function UniverseScene({ tree, positions, links, clouds, selectedId, maxStep, showGrid, reducedMotion, onSelect }: UniverseSceneProps) {
  const radiusScale = useMemo(
    () => scaleLinear().domain([0, maxStep]).range([0.24, 0.42]).clamp(true),
    [maxStep],
  );

  return (
    <>
      <color attach="background" args={['#05080c']} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[6, 9, 7]} intensity={1.3} />
      <pointLight position={[-6, -3, 5]} intensity={16} color="#8b7cf6" />
      {showGrid && <gridHelper args={[28, 28, '#1d2a35', '#101820']} position={[0, -4.2, 0]} />}
      <DivergenceLinks links={links} />
      {clouds.map((cloud) => (
        <points key={cloud.id}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[cloud.coords, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color={cloud.color}
            size={cloud.id === selectedId ? 0.085 : 0.055}
            sizeAttenuation
            transparent
            opacity={cloud.id === selectedId ? 0.95 : 0.55}
          />
        </points>
      ))}
      {tree.map(({ branch }) => {
        const position = positions[branch.id];
        if (!position) return null;
        return (
          <RealityNode
            key={branch.id}
            branch={branch}
            position={position}
            radius={radiusScale(branch.currentState.step)}
            selected={branch.id === selectedId}
            onSelect={onSelect}
          />
        );
      })}
      <OrbitControls
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.35}
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={40}
      />
    </>
  );
}

export function UniverseView() {
  const engine = useParadox((state) => state.engine);
  useParadox((state) => state.revision);
  const selection = useParadox((state) => state.selection);
  const setSelection = useParadox((state) => state.setSelection);
  const selectBranch = useParadox((state) => state.selectBranch);
  const showGrid = useParadox((state) => state.showGrid);
  const reducedMotion = useParadox((state) => state.reducedMotion);
  const toggleGrid = useParadox((state) => state.toggleGrid);
  const toggleReducedMotion = useParadox((state) => state.toggleReducedMotion);
  const setView = useParadox((state) => state.setView);
  const openModal = useParadox((state) => state.openModal);

  const branches = engine?.branchesList;
  const tree = useMemo(() => (branches ? branchTree(branches) : []), [branches]);
  const maxStep = Math.max(1, ...tree.map((item) => item.branch.currentState.step));
  const maxDepth = Math.max(1, ...tree.map((item) => item.depth));

  const timeExtent = useMemo(() => {
    const times = tree.map((item) => item.branch.currentState.time);
    const min = times.length > 0 ? Math.min(...times) : 0;
    const max = times.length > 0 ? Math.max(...times) : 1;
    return { min, max: max === min ? min + 1 : max };
  }, [tree]);

  const positions = useMemo(() => {
    const result: Record<EntityId, Position> = {};
    const timeScale = scaleLinear().domain([timeExtent.min, timeExtent.max]).range([-1.8, 1.8]).clamp(true);
    const spread = Math.max(tree.length - 1, 1);
    tree.forEach((item, index) => {
      result[item.branch.id] = {
        x: (index - spread / 2) * 3.1,
        y: 2.3 - (item.depth / maxDepth) * 4.6,
        z: timeScale(item.branch.currentState.time),
      };
    });
    return result;
  }, [tree, maxDepth, timeExtent]);

  const links = useMemo(() => tree.flatMap((item) => {
    const parentId = item.branch.parentId;
    if (!parentId) return [];
    const from = positions[parentId];
    const to = positions[item.branch.id];
    if (!from || !to) return [];
    return [{ id: item.branch.id, from, to, color: item.branch.color, step: item.branch.branchPointStep }];
  }), [tree, positions]);

  const clouds = useMemo(() => {
    const stepScale = scaleLinear().domain([0, maxStep]).range([-0.9, 0.9]).clamp(true);
    const entryTimeScale = scaleLinear().domain([timeExtent.min, timeExtent.max]).range([-0.6, 0.6]).clamp(true);
    return tree.flatMap((item) => {
      const base = positions[item.branch.id];
      if (!base) return [];
      const coords = item.branch.timeline.entries.flatMap((entry) => [
        base.x + stepScale(entry.step),
        base.y - 0.55,
        base.z + entryTimeScale(entry.time),
      ]);
      return coords.length > 0 ? [{ id: item.branch.id, coords: new Float32Array(coords), color: item.branch.color }] : [];
    });
  }, [tree, positions, maxStep, timeExtent]);

  if (!engine) {
    return <EmptyState title="No reality map" description="Load a scenario to render its branching realities in three-dimensional space." />;
  }

  const selectedId = selection.branchId ?? engine.activeBranchId;
  const selectedBranch = engine.getBranch(selectedId) ?? engine.activeBranch;
  const parentName = selectedBranch.parentId ? engine.getBranch(selectedBranch.parentId)?.name : undefined;
  const divergenceState = engine.getStateAt(selectedBranch.id, selectedBranch.branchPointStep);
  const trajectory = selectedBranch.timeline.entries.map((entry) => entry.time);

  const handleSelect = (id: EntityId): void => {
    selectBranch(id);
    setSelection({ branchId: id });
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="Multiverse navigation"
        title="Reality universe"
        description="Each sphere is an actual simulation branch; connectors trace recorded divergence points and parentage."
        actions={<>
          <Button icon={<GitBranch size={13} />} onClick={() => openModal({ kind: 'newBranch' })}>New reality</Button>
          <Button icon={<Activity size={13} />} onClick={() => setView('timeline')}>Timeline</Button>
        </>}
      />
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel title="Reality space" subtitle={`${tree.length} branches · drag to orbit · scroll to zoom`} bodyClassName="p-0">
          <ErrorBoundary>
            <Canvas
              camera={{ position: [0, 1.5, 14], fov: 48 }}
              dpr={[1, 1.75]}
              gl={{ antialias: true, alpha: true }}
            >
              <UniverseScene
                tree={tree}
                positions={positions}
                links={links}
                clouds={clouds}
                selectedId={selectedId}
                maxStep={maxStep}
                showGrid={showGrid}
                reducedMotion={reducedMotion}
                onSelect={handleSelect}
              />
            </Canvas>
          </ErrorBoundary>
        </Panel>
        <div className="flex min-h-0 flex-col gap-3">
          <Panel title="Branch registry" subtitle="Click a reality to focus" bodyClassName="p-0" className="min-h-[180px] flex-1">
            <ul className="divide-y divide-line/40">
              {tree.map(({ branch }) => {
                const active = branch.id === selectedId;
                return (
                  <li key={branch.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(branch.id)}
                      aria-pressed={active}
                      className={`flex w-full flex-col gap-1 px-3 py-2 text-left transition-colors ${active ? 'bg-cyan/[0.08]' : 'hover:bg-white/[0.03]'}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: branch.color }} />
                          <span className={`truncate font-mono text-[11px] ${active ? 'text-cyan' : 'text-chalk/85'}`}>{branch.name}</span>
                        </span>
                        <Badge tone={branch.status === 'complete' ? 'success' : branch.status === 'running' ? 'cyan' : 'neutral'}>{branch.status}</Badge>
                      </span>
                      <span className="pl-4 font-mono text-[9px] text-muted">step {branch.currentState.step} · t {branch.currentState.time.toFixed(1)}</span>
                      {branch.parentId && (
                        <span className="pl-4 font-mono text-[9px] text-muted/80">
                          forked @ {branch.branchPointStep} · divergence {branch.divergenceEventId ? 'event' : branch.branchPointStep}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel title="Focused reality" subtitle={selectedBranch.id}>
            <dl className="space-y-1.5 font-mono text-[10px]">
              <div className="flex justify-between gap-2"><dt className="text-muted">Name</dt><dd className="truncate text-cyan">{selectedBranch.name}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Parent</dt><dd className="truncate text-chalk/80">{parentName ?? '— root reality'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Divergence step</dt><dd className="text-chalk/80">{selectedBranch.branchPointStep} · t {divergenceState?.time.toFixed(1) ?? selectedBranch.branchTime.toFixed(1)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Current step</dt><dd className="text-chalk/80">{selectedBranch.currentState.step} · t {selectedBranch.currentState.time.toFixed(1)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Timeline entries</dt><dd className="text-chalk/80">{selectedBranch.timeline.entries.length}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Events recorded</dt><dd className="text-chalk/80">{selectedBranch.timeline.events.length}</dd></div>
            </dl>
            <div className="mt-3 border-t border-line/60 pt-2">
              <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-muted">Time trajectory</p>
              <Sparkline values={trajectory} color={selectedBranch.color} width={260} height={34} />
            </div>
            {selectedBranch.divergenceReason && <p className="mt-2 text-[10px] leading-relaxed text-muted">{selectedBranch.divergenceReason}</p>}
          </Panel>
          <Panel title="Display">
            <Toggle label="Spatial grid" checked={showGrid} onChange={() => toggleGrid()} description="Show the reference plane beneath realities." />
            <Toggle label="Auto orbit" checked={!reducedMotion} onChange={() => toggleReducedMotion()} description="Disabled when reduced motion is enabled." />
          </Panel>
        </div>
      </div>
      <p className="flex items-center gap-2 font-mono text-[9px] text-muted/70"><Activity size={11} /> Positions are derived from branch depth, recorded time and simulation steps — no generated scenarios.</p>
    </div>
  );
}
