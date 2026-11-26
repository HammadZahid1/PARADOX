import { useParadox } from '@/state/store';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';

interface ConfirmPayload {
  title?: string;
  message?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
}

function readPayload(payload: unknown): ConfirmPayload {
  return typeof payload === 'object' && payload !== null ? payload as ConfirmPayload : {};
}

export function ConfirmModal() {
  const payload = useParadox((state) => state.modal.payload);
  const closeModal = useParadox((state) => state.closeModal);
  const data = readPayload(payload);

  return (
    <Modal
      title={data.title ?? 'Confirm action'}
      onClose={closeModal}
      footer={<>
        <Button onClick={closeModal}>Cancel</Button>
        <Button variant="danger" onClick={() => { data.onConfirm?.(); closeModal(); }}>{data.confirmLabel ?? 'Confirm'}</Button>
      </>}
    >
      <p className="text-sm leading-relaxed text-chalk/80">{data.message ?? 'Are you sure you want to continue?'}</p>
    </Modal>
  );
}
