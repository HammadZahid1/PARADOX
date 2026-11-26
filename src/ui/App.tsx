import { useEffect, useState } from 'react';
import { createAllLibraryPresets } from '@/engine/scenarios/library';
import { useParadox } from '@/state/store';
import { CommandPalette } from '@/ui/components/CommandPalette';
import { ErrorBoundary } from '@/ui/components/ErrorBoundary';
import { SearchDialog } from '@/ui/components/SearchDialog';
import { Sidebar } from '@/ui/components/Sidebar';
import { StatusBar } from '@/ui/components/StatusBar';
import { Toasts } from '@/ui/components/Toasts';
import { TopBar } from '@/ui/components/TopBar';
import { useKeyboardShortcuts } from '@/ui/hooks/useKeyboardShortcuts';
import { usePersistence } from '@/ui/hooks/usePersistence';
import { usePlayback } from '@/ui/hooks/usePlayback';
import { ModalHost } from '@/ui/modals/ModalHost';
import { ViewRouter } from '@/ui/ViewRouter';

export function App() {
  const [collapsed, setCollapsed] = useState(false);
  const bootstrap = useParadox((state) => state.bootstrap);
  const scenarioCount = useParadox((state) => state.scenarios.length);
  usePlayback();
  useKeyboardShortcuts();
  usePersistence();

  useEffect(() => {
    if (scenarioCount === 0) bootstrap(createAllLibraryPresets());
  }, [bootstrap, scenarioCount]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-void text-chalk">
      <a href="#main-view" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:border focus:border-cyan focus:bg-graphite focus:px-3 focus:py-2 focus:text-xs">Skip to main view</a>
      <Sidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onToggleSidebar={() => setCollapsed((value) => !value)} />
        <main id="main-view" className="min-h-0 flex-1 overflow-hidden" tabIndex={-1}>
          <ErrorBoundary><ViewRouter /></ErrorBoundary>
        </main>
        <StatusBar />
      </div>
      <CommandPalette />
      <SearchDialog />
      <ModalHost />
      <Toasts />
    </div>
  );
}
