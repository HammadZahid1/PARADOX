import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import type { ViewId } from '@/state/types';
import { useParadox } from '@/state/store';
import { LoadingState } from '@/ui/components/LoadingState';

const views: Record<ViewId, LazyExoticComponent<ComponentType>> = {
  lab: lazy(async () => ({ default: (await import('./views/LabView')).LabView })),
  timeline: lazy(async () => ({ default: (await import('./views/TimelineView')).TimelineView })),
  universe: lazy(async () => ({ default: (await import('./views/UniverseView')).UniverseView })),
  causal: lazy(async () => ({ default: (await import('./views/CausalView')).CausalView })),
  compare: lazy(async () => ({ default: (await import('./views/CompareView')).CompareView })),
  analytics: lazy(async () => ({ default: (await import('./views/AnalyticsView')).AnalyticsView })),
  scenarios: lazy(async () => ({ default: (await import('./views/ScenariosView')).ScenariosView })),
  world: lazy(async () => ({ default: (await import('./views/WorldView')).WorldView })),
  events: lazy(async () => ({ default: (await import('./views/EventsView')).EventsView })),
  explorer: lazy(async () => ({ default: (await import('./views/ExplorerView')).ExplorerView })),
  history: lazy(async () => ({ default: (await import('./views/HistoryView')).HistoryView })),
  snapshots: lazy(async () => ({ default: (await import('./views/SnapshotsView')).SnapshotsView })),
  decisions: lazy(async () => ({ default: (await import('./views/DecisionsView')).DecisionsView })),
  monte: lazy(async () => ({ default: (await import('./views/MonteView')).MonteView })),
  settings: lazy(async () => ({ default: (await import('./views/SettingsView')).SettingsView })),
};

export function ViewRouter() {
  const view = useParadox((state) => state.view);
  const View = views[view] ?? views.lab;
  return (
    <Suspense fallback={<LoadingState label={`Loading ${view} view`} />}>
      <View />
    </Suspense>
  );
}
