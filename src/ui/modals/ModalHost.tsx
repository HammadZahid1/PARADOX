import { useParadox } from '@/state/store';
import { ConfirmModal } from './ConfirmModal';
import { ExportModal } from './ExportModal';
import { ImportModal } from './ImportModal';
import { InjectEventModal } from './InjectEventModal';
import { NewBranchModal } from './NewBranchModal';
import { NewScenarioModal } from './NewScenarioModal';
import { SnapshotModal } from './SnapshotModal';

export function ModalHost() {
  const kind = useParadox((state) => state.modal.kind);
  switch (kind) {
    case 'newScenario': return <NewScenarioModal />;
    case 'newBranch': return <NewBranchModal />;
    case 'injectEvent': return <InjectEventModal />;
    case 'import': return <ImportModal />;
    case 'export': return <ExportModal />;
    case 'snapshot': return <SnapshotModal />;
    case 'confirm': return <ConfirmModal />;
    default: return null;
  }
}
