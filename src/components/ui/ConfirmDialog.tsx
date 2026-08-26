import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center py-2">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full ${
            danger
  ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
          }`}
        >
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400 max-w-xs">{message}</p>
        <div className="mt-6 flex gap-3 w-full">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
