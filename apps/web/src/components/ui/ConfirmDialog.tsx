import { useEffect, FC } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141311]/45 backdrop-blur-[2px] transition-opacity duration-200"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[360px] bg-surface border border-border rounded-modal p-6 shadow-modal dark:shadow-modal-dark transform scale-100 transition-transform duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col items-center text-center">
          {/* Icon-in-circle semantic motif */}
          <div className="w-10 h-10 rounded-full bg-expense-alert/10 flex items-center justify-center text-expense-alert mb-4">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <h3 className="text-lg font-semibold text-text-primary tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-text-secondary mt-1 mb-6">
            {description}
          </p>

          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-10 px-4 rounded-btn border border-border bg-surface hover:bg-surface-raised text-text-primary text-sm font-semibold transition-colors duration-160 focus-visible:outline-2 focus-visible:outline-primary"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 h-10 px-4 rounded-btn bg-expense-alert hover:opacity-90 text-white text-sm font-semibold transition-opacity duration-160 flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-expense-alert"
            >
              <Trash2 className="w-4 h-4" />
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
