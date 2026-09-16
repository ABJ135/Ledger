import React, { useState, useEffect } from 'react';
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
import { BudgetPacingHero } from '../components/dashboard/BudgetPacingHero';
import { SpendingBreakdownChart } from '../components/dashboard/SpendingBreakdownChart';
import { PowerLedgerTable } from '../components/expense/PowerLedgerTable';
import { QuickExpenseModal } from '../components/expense/QuickExpenseModal';
import { EditExpenseModal } from '../components/expense/EditExpenseModal';
import { EditCycleModal } from '../components/expense/EditCycleModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Loader2 } from 'lucide-react';

interface LandingPageProps {
  context?: 'personal' | 'shared';
  sharedExpenseId?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  context = 'personal',
  sharedExpenseId,
}) => {
  // Fetch months list to get active current cycle
  const { data: months, isLoading: monthsLoading } = useGetMonthsQuery({
    context,
    sharedExpenseId,
  });
  const currentMonth = months?.find((m) => m.isCurrent) || months?.[0] || null;

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

  // UI Modals state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isEditCycleOpen, setIsEditCycleOpen] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);

  // Global hotkey: Press 'n' to quickly record an expense
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'n' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault();
        if (currentMonth) setIsQuickAddOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMonth]);

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
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading financial dashboard...</span>
      </div>
    );
  }

  const expenses = monthDetail?.expenses || [];

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* 1. Financial Hero Pulse Card: Budget, Spent, Remaining, Daily Pacing Dial */}
      <BudgetPacingHero
        currentMonth={currentMonth}
        totals={monthDetail?.totals}
        onEditBudget={() => setIsEditCycleOpen(true)}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
      />

      {/* 2. Visual Spending Breakdown by Category: Donut Chart & Category Progress */}
      <SpendingBreakdownChart
        expenses={expenses}
        categories={categories}
        selectedCategoryId={filterCategoryId}
        onSelectCategory={setFilterCategoryId}
      />

      {/* 3. Searchable Power Ledger Table */}
      <PowerLedgerTable
        expenses={expenses}
        categories={categories}
        selectedCategoryId={filterCategoryId}
        onSelectCategory={setFilterCategoryId}
        onEditExpense={setEditingExpense}
        onDeleteExpense={setDeletingExpense}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onExportCsv={currentMonth ? () => downloadMonthCsv(currentMonth.id) : undefined}
      />

      {/* Quick Add Modal (Hotkey 'N') */}
      {currentMonth && (
        <QuickExpenseModal
          isOpen={isQuickAddOpen}
          monthId={currentMonth.id}
          categories={categories}
          onClose={() => setIsQuickAddOpen(false)}
          onSubmit={handleAddExpense}
        />
      )}

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
        description={`Are you sure you want to delete "${deletingExpense?.content}"? This transaction will be removed from your cycle.`}
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
