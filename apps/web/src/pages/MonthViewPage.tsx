import { useState, FC } from 'react';
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
  CheckCircle2,
} from 'lucide-react';

interface MonthViewPageProps {
  context?: 'personal' | 'shared';
  sharedExpenseId?: string;
}

export const MonthViewPage: FC<MonthViewPageProps> = ({
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
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading cycle timeline...</span>
      </div>
    );
  }

  const activeMonth = months.find((m) => m.isCurrent);
  const totalAllocatedBudget = months.reduce((sum, m) => sum + m.budget, 0);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* 1. Page Header Card with Cycle Stats */}
      <div className="bg-surface rounded-card p-6 border border-border shadow-card flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-text-primary tracking-tight">
                Billing Cycles Timeline
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Manage user-defined accounting cycles, historical ledgers, and budget allocations.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 px-4 rounded-btn bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Cycle</span>
          </button>
        </div>

        {/* Quick Stats Banner */}
        <div className="p-4 bg-surface-raised/40 rounded-btn border border-border/70 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block">
              Total Cycles Recorded
            </span>
            <span className="font-display text-2xl font-bold text-text-primary mt-0.5 block">
              {months.length}
            </span>
            <span className="text-[11px] text-text-secondary">
              Continuous gap-free timeline
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block">
              Active Current Cycle
            </span>
            <span className="font-display text-2xl font-bold text-primary mt-0.5 block truncate">
              {activeMonth?.label || 'None Active'}
            </span>
            <span className="text-[11px] text-text-secondary">
              Target allowance: {activeMonth ? formatPaisa(activeMonth.budget) : 'Rs 0'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block">
              Lifetime Budget Allocated
            </span>
            <span className="font-display text-2xl font-bold text-text-primary mt-0.5 block">
              {formatPaisa(totalAllocatedBudget)}
            </span>
            <span className="text-[11px] text-text-secondary">
              Across all recorded cycles
            </span>
          </div>
        </div>
      </div>

      {/* 2. Cycles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {months.map((month) => {
          const startDate = formatPktDate(month.startAt);
          const endDate = month.endAt ? formatPktDate(month.endAt) : 'Present';

          return (
            <div
              key={month.id}
              className={`group bg-surface rounded-card p-5 border transition-all duration-160 shadow-card flex flex-col justify-between ${
                month.isCurrent
                  ? 'border-primary/60 ring-1 ring-primary/20 bg-primary/[0.01]'
                  : 'border-border/80 hover:border-border'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        month.isCurrent
                          ? 'bg-primary/10 text-primary'
                          : 'bg-surface-raised text-text-secondary'
                      }`}
                    >
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-text-primary tracking-tight">
                        {month.label}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>
                          {startDate} — {endDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {month.isCurrent ? (
                    <span className="px-2.5 py-1 rounded-pill text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-pill text-[11px] font-medium bg-surface-raised text-text-secondary border border-border">
                      Completed
                    </span>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-border/70 flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block">
                      Target Budget Allowance
                    </span>
                    <span className="font-display text-2xl font-bold text-text-primary mt-0.5 block tabular-nums">
                      {formatPaisa(month.budget)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadMonthCsv(month.id)}
                    className="h-8 px-2.5 rounded-btn bg-surface-raised hover:bg-surface border border-border text-text-secondary hover:text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Export CSV transactions"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-3 border-t border-border/70 flex items-center justify-between">
                {!month.isCurrent ? (
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(month.id)}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Switch to Active</span>
                  </button>
                ) : (
                  <span className="text-xs text-text-secondary flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-income-positive" />
                    <span>Currently Viewing in Dashboard</span>
                  </span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(month)}
                    className="w-8 h-8 rounded-btn flex items-center justify-center text-text-secondary hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
                    title="Edit cycle name or budget"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {!month.isCurrent && (
                    <button
                      type="button"
                      onClick={() => setDeletingMonth(month)}
                      className="w-8 h-8 rounded-btn flex items-center justify-center text-text-secondary hover:text-expense-alert hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Delete cycle"
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

      {/* Edit Modal */}
      {editingMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface rounded-modal border border-border shadow-modal w-full max-w-md overflow-hidden flex flex-col relative">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-text-primary">
                Edit Cycle Details
              </h3>
              <button
                type="button"
                onClick={() => setEditingMonth(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Cycle Label
                </label>
                <input
                  type="text"
                  required
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full h-10 px-3 rounded-btn bg-surface-raised border border-border text-sm text-text-primary focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Target Budget Allowance (PKR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-secondary">
                    Rs
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0"
                    value={editRupees}
                    onChange={(e) => setEditRupees(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-btn bg-surface-raised border border-border text-sm font-display text-text-primary focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingMonth(null)}
                  className="h-9 px-3 rounded-btn border border-border text-xs font-semibold text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-btn bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface rounded-modal border border-border shadow-modal w-full max-w-md overflow-hidden flex flex-col relative">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-text-primary">
                Create New Billing Cycle
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMonth} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Cycle Label
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October 2026, Q4 General"
                  value={createLabel}
                  onChange={(e) => setCreateLabel(e.target.value)}
                  className="w-full h-10 px-3 rounded-btn bg-surface-raised border border-border text-sm text-text-primary focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Budget Allowance (PKR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-secondary">
                    Rs
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0"
                    placeholder="100000"
                    value={createRupees}
                    onChange={(e) => setCreateRupees(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-btn bg-surface-raised border border-border text-sm font-display text-text-primary focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-9 px-3 rounded-btn border border-border text-xs font-semibold text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-btn bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs"
                >
                  Create Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deletingMonth}
        title="Delete Billing Cycle"
        description={`Are you sure you want to delete cycle "${deletingMonth?.label}"? All associated transactions will be removed.`}
        confirmLabel="Delete Cycle"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingMonth(null)}
      />
    </div>
  );
};
