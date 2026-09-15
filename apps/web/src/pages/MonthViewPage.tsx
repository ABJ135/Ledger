import { useState } from 'react';
import {
  useGetMonthsQuery,
  useSetCurrentMonthMutation,
  useDeleteMonthMutation,
  useUpdateMonthMutation,
  useCreateMonthMutation,
  downloadMonthCsv,
} from '@repo/api-client';
import { Month } from '@repo/shared-types';
import { formatPaisa, paisaToRupees, rupeesToPaisa } from '../utils/currency';
import { formatPktDate } from '../utils/date';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  Calendar,
  Check,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  CalendarDays,
  X,
  Download,
} from 'lucide-react';

interface MonthViewPageProps {
  context?: 'personal' | 'shared';
  sharedExpenseId?: string;
}

export const MonthViewPage: React.FC<MonthViewPageProps> = ({
  context = 'personal',
  sharedExpenseId,
}) => {
  const { data: months = [], isLoading } = useGetMonthsQuery({
    context,
    sharedExpenseId,
  });

  const [setCurrentMonth] = useSetCurrentMonthMutation();
  const [deleteMonth] = useDeleteMonthMutation();
  const [updateMonth] = useUpdateMonthMutation();
  const [createMonth] = useCreateMonthMutation();

  const [deletingMonth, setDeletingMonth] = useState<Month | null>(null);
  const [editingMonth, setEditingMonth] = useState<Month | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [editLabel, setEditLabel] = useState('');
  const [editRupees, setEditRupees] = useState('');
  const [createLabel, setCreateLabel] = useState('');
  const [createRupees, setCreateRupees] = useState('100000');

  const handleOpenEdit = (month: Month) => {
    setEditingMonth(month);
    setEditLabel(month.label);
    setEditRupees(paisaToRupees(month.budget).toString());
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMonth) return;
    const parsed = parseFloat(editRupees);
    if (!editLabel.trim() || isNaN(parsed) || parsed < 0) return;

    await updateMonth({
      id: editingMonth.id,
      data: {
        label: editLabel.trim(),
        budget: rupeesToPaisa(parsed),
      },
    }).unwrap();

    setEditingMonth(null);
  };

  const handleCreateMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(createRupees);
    if (!createLabel.trim() || isNaN(parsed) || parsed < 0) return;

    await createMonth({
      label: createLabel.trim(),
      budget: rupeesToPaisa(parsed),
      sharedExpenseId: context === 'shared' ? sharedExpenseId : undefined,
    }).unwrap();

    setIsCreateOpen(false);
    setCreateLabel('');
    setCreateRupees('100000');
  };

  const handleConfirmDelete = async () => {
    if (!deletingMonth) return;
    try {
      await deleteMonth(deletingMonth.id).unwrap();
    } finally {
      setDeletingMonth(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-text-secondary">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading cycles...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">
            Billing Cycles
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">
            User-controlled expense cycles and custom budget allowances.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="h-10 px-4 rounded-btn bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Plus className="w-4 h-4" />
          <span>New Cycle</span>
        </button>
      </div>

      {/* Month cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {months.map((month) => {
          const startDate = formatPktDate(month.startAt);
          const endDate = month.endAt ? formatPktDate(month.endAt) : 'Present';

          return (
            <div
              key={month.id}
              className={`group bg-surface rounded-card p-5 border transition-all duration-160 shadow-card flex flex-col justify-between ${
                month.isCurrent ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        month.isCurrent
                          ? 'bg-primary/10 text-primary'
                          : 'bg-surface-raised text-text-secondary'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-text-primary tracking-tight">
                        {month.label}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {startDate} — {endDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {month.isCurrent && (
                    <span className="px-2.5 py-0.5 rounded-pill text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      Active Cycle
                    </span>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-border flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary block">
                      Cycle Budget
                    </span>
                    <span className="font-display text-2xl font-semibold text-text-primary mt-0.5 block tabular-nums">
                      {formatPaisa(month.budget)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                {!month.isCurrent ? (
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(month.id)}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Set as Active Cycle</span>
                  </button>
                ) : (
                  <span className="text-xs font-medium text-text-secondary">
                    Currently Active
                  </span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => downloadMonthCsv(month.id)}
                    aria-label={`Export CSV for ${month.label}`}
                    title={`Export ${month.label} to CSV`}
                    className="w-8 h-8 rounded-[6px] flex items-center justify-center text-text-secondary hover:text-primary hover:bg-surface-raised transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(month)}
                    aria-label={`Edit ${month.label}`}
                    className="w-8 h-8 rounded-[6px] flex items-center justify-center text-text-secondary hover:text-primary hover:bg-surface-raised transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {!month.isCurrent && (
                    <button
                      type="button"
                      onClick={() => setDeletingMonth(month)}
                      aria-label={`Delete ${month.label}`}
                      className="w-8 h-8 rounded-[6px] flex items-center justify-center text-text-secondary hover:text-expense-alert hover:bg-surface-raised transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Month Modal */}
      {editingMonth && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141311]/45 backdrop-blur-[2px]"
          onClick={() => setEditingMonth(null)}
        >
          <div
            className="w-full max-w-[380px] bg-surface border border-border rounded-modal p-6 shadow-modal dark:shadow-modal-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">
                Edit Cycle
              </h3>
              <button
                type="button"
                onClick={() => setEditingMonth(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-raised"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <div>
                <label className="text-[13px] font-medium text-text-secondary mb-1 block">
                  Cycle Label
                </label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-text-secondary mb-1 block">
                  Budget (Rs)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editRupees}
                  onChange={(e) => setEditRupees(e.target.value)}
                  className="w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingMonth(null)}
                  className="h-10 px-4 rounded-btn border border-border bg-surface text-text-primary text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-btn bg-primary hover:bg-primary-hover text-white text-sm font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Month Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141311]/45 backdrop-blur-[2px]"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="w-full max-w-[380px] bg-surface border border-border rounded-modal p-6 shadow-modal dark:shadow-modal-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">
                Create Billing Cycle
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-raised"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMonth} className="flex flex-col gap-4">
              <div>
                <label className="text-[13px] font-medium text-text-secondary mb-1 block">
                  Cycle Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. October 2026, Summer Cycle"
                  value={createLabel}
                  onChange={(e) => setCreateLabel(e.target.value)}
                  className="w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-text-secondary mb-1 block">
                  Budget (Rs)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={createRupees}
                  onChange={(e) => setCreateRupees(e.target.value)}
                  className="w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-10 px-4 rounded-btn border border-border bg-surface text-text-primary text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-btn bg-primary hover:bg-primary-hover text-white text-sm font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Month Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deletingMonth}
        title="Delete Billing Cycle"
        description={`Are you sure you want to delete "${deletingMonth?.label}" and all its expenses? This action is permanent and cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingMonth(null)}
      />
    </div>
  );
};
