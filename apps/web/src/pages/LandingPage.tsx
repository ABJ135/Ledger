import React, { useState } from 'react';
import {
  useGetMonthsQuery,
  useGetMonthByIdQuery,
  useGetCategoriesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useUpdateMonthMutation,
  useCreateMonthMutation,
  downloadMonthCsv,
} from '@repo/api-client';
import { Expense } from '@repo/shared-types';
import { StatCallouts } from '../components/expense/StatCallouts';
import { ExpenseEntryForm } from '../components/expense/ExpenseEntryForm';
import { LedgerRow } from '../components/expense/LedgerRow';
import { EditExpenseModal } from '../components/expense/EditExpenseModal';
import { EditCycleModal } from '../components/expense/EditCycleModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ReceiptText, Loader2, Download, Pencil, Calendar } from 'lucide-react';
import { formatPktDate } from '../utils/date';

interface LandingPageProps {
  context?: 'personal' | 'shared';
  sharedExpenseId?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  context = 'personal',
  sharedExpenseId,
}) => {
  // Fetch months list to get the active current month
  const { data: months, isLoading: monthsLoading } = useGetMonthsQuery({
    context,
    sharedExpenseId,
  });
  const currentMonth = months?.find((m) => m.isCurrent) || months?.[0];

  // Fetch month detail with server-computed totals
  const { data: monthDetail, isLoading: detailLoading } = useGetMonthByIdQuery(
    currentMonth?.id || '',
    { skip: !currentMonth?.id },
  );

  // Fetch categories
  const { data: categories = [] } = useGetCategoriesQuery();

  // Mutations
  const [createExpense] = useCreateExpenseMutation();
  const [updateExpense] = useUpdateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();
  const [updateMonth] = useUpdateMonthMutation();
  const [createMonth] = useCreateMonthMutation();

  // Dialog and Modal state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isEditCycleOpen, setIsEditCycleOpen] = useState(false);

  const handleSaveCycle = async (data: {
    id?: string;
    label: string;
    budget: number;
  }) => {
    if (data.id) {
      await updateMonth({
        id: data.id,
        data: {
          label: data.label,
          budget: data.budget,
        },
      }).unwrap();
    } else {
      await createMonth({
        label: data.label,
        budget: data.budget,
        sharedExpenseId: context === 'shared' ? sharedExpenseId : undefined,
      }).unwrap();
    }
  };

  const handleAddExpense = async (data: {
    monthId: string;
    categoryId?: string | null;
    content: string;
    amount: number;
    occurredAt: string;
  }) => {
    await createExpense(data).unwrap();
  };

  const handleUpdateExpense = async (data: {
    id: string;
    content: string;
    amount: number;
    categoryId?: string | null;
  }) => {
    if (!currentMonth) return;
    await updateExpense({
      id: data.id,
      monthId: currentMonth.id,
      data: {
        content: data.content,
        amount: data.amount,
        categoryId: data.categoryId,
      },
    }).unwrap();
  };

  const handleConfirmDelete = async () => {
    if (!deletingExpense || !currentMonth) return;
    try {
      await deleteExpense({
        id: deletingExpense.id,
        monthId: currentMonth.id,
      }).unwrap();
    } finally {
      setDeletingExpense(null);
    }
  };

  if (monthsLoading || (currentMonth && detailLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-text-secondary">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading active cycle...</span>
      </div>
    );
  }

  const expenses = monthDetail?.expenses || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Active Cycle Header Bar */}
      {currentMonth && (
        <div className="bg-surface rounded-card p-4 border border-border shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary tracking-tight">
                  {currentMonth.label}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditCycleOpen(true)}
                  className="p-1 rounded-md text-text-secondary hover:text-primary hover:bg-surface-raised transition-colors"
                  title="Rename cycle or change budget"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-xs text-text-secondary">
                Started {formatPktDate(currentMonth.startAt)} • Active Cycle
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditCycleOpen(true)}
            className="h-8 px-3 rounded-btn border border-border hover:bg-surface-raised text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Cycle & Budget</span>
          </button>
        </div>
      )}

      {/* Stat Callouts (Hero numbers) */}
      <StatCallouts
        totals={monthDetail?.totals}
        onEditBudget={() => setIsEditCycleOpen(true)}
      />

      {/* Expense Entry Form */}
      {currentMonth && (
        <ExpenseEntryForm
          monthId={currentMonth.id}
          categories={categories}
          onSubmit={handleAddExpense}
        />
      )}

      {/* Expense List (The Ledger Rule) */}
      <div className="bg-surface rounded-card border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-text-primary tracking-tight">
              Cycle Transactions
            </span>
            <span className="px-2 py-0.5 rounded-pill text-[11px] font-semibold bg-surface-raised text-text-secondary border border-border">
              {expenses.length}
            </span>
          </div>
          {currentMonth && expenses.length > 0 && (
            <button
              type="button"
              onClick={() => downloadMonthCsv(currentMonth.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors border border-primary/20"
              title="Download transactions as CSV file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <ReceiptText className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-text-primary">
              No transactions recorded yet
            </h4>
            <p className="text-sm text-text-secondary max-w-sm mt-1">
              Add your first expense above to start tracking your spending in this billing cycle.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {expenses.map((expense) => (
              <LedgerRow
                key={expense.id}
                expense={expense}
                onEdit={setEditingExpense}
                onDelete={setDeletingExpense}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditExpenseModal
        isOpen={!!editingExpense}
        expense={editingExpense}
        categories={categories}
        onClose={() => setEditingExpense(null)}
        onSave={handleUpdateExpense}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deletingExpense}
        title="Delete Expense"
        description={`Are you sure you want to delete "${deletingExpense?.content}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingExpense(null)}
      />

      {/* Edit Cycle & Budget Modal */}
      <EditCycleModal
        isOpen={isEditCycleOpen}
        cycle={
          currentMonth
            ? {
                id: currentMonth.id,
                label: monthDetail?.label || currentMonth.label,
                budget: monthDetail?.budget ?? currentMonth.budget,
              }
            : null
        }
        onClose={() => setIsEditCycleOpen(false)}
        onSave={handleSaveCycle}
      />
    </div>
  );
};
