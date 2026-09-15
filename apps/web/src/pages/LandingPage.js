import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useGetMonthsQuery, useGetMonthByIdQuery, useGetCategoriesQuery, useCreateExpenseMutation, useUpdateExpenseMutation, useDeleteExpenseMutation, downloadMonthCsv, } from '@repo/api-client';
import { StatCallouts } from '../components/expense/StatCallouts';
import { ExpenseEntryForm } from '../components/expense/ExpenseEntryForm';
import { LedgerRow } from '../components/expense/LedgerRow';
import { EditExpenseModal } from '../components/expense/EditExpenseModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ReceiptText, Loader2, Download } from 'lucide-react';
export const LandingPage = ({ context = 'personal', sharedExpenseId, }) => {
    // Fetch months list to get the active current month
    const { data: months, isLoading: monthsLoading } = useGetMonthsQuery({
        context,
        sharedExpenseId,
    });
    const currentMonth = months?.find((m) => m.isCurrent) || months?.[0];
    // Fetch month detail with server-computed totals
    const { data: monthDetail, isLoading: detailLoading } = useGetMonthByIdQuery(currentMonth?.id || '', { skip: !currentMonth?.id });
    // Fetch categories
    const { data: categories = [] } = useGetCategoriesQuery();
    // Mutations
    const [createExpense] = useCreateExpenseMutation();
    const [updateExpense] = useUpdateExpenseMutation();
    const [deleteExpense] = useDeleteExpenseMutation();
    // Dialog and Modal state
    const [editingExpense, setEditingExpense] = useState(null);
    const [deletingExpense, setDeletingExpense] = useState(null);
    const handleAddExpense = async (data) => {
        await createExpense(data).unwrap();
    };
    const handleUpdateExpense = async (data) => {
        if (!currentMonth)
            return;
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
        if (!deletingExpense || !currentMonth)
            return;
        try {
            await deleteExpense({
                id: deletingExpense.id,
                monthId: currentMonth.id,
            }).unwrap();
        }
        finally {
            setDeletingExpense(null);
        }
    };
    if (monthsLoading || (currentMonth && detailLoading)) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center min-h-[400px] gap-3 text-text-secondary", children: [_jsx(Loader2, { className: "w-6 h-6 animate-spin text-primary" }), _jsx("span", { className: "text-sm font-medium", children: "Loading active cycle..." })] }));
    }
    const expenses = monthDetail?.expenses || [];
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(StatCallouts, { totals: monthDetail?.totals }), currentMonth && (_jsx(ExpenseEntryForm, { monthId: currentMonth.id, categories: categories, onSubmit: handleAddExpense })), _jsxs("div", { className: "bg-surface rounded-card border border-border shadow-card overflow-hidden", children: [_jsxs("div", { className: "px-5 py-4 border-b border-border flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-[15px] font-semibold text-text-primary tracking-tight", children: "Cycle Transactions" }), _jsx("span", { className: "px-2 py-0.5 rounded-pill text-[11px] font-semibold bg-surface-raised text-text-secondary border border-border", children: expenses.length })] }), currentMonth && expenses.length > 0 && (_jsxs("button", { type: "button", onClick: () => downloadMonthCsv(currentMonth.id), className: "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors border border-primary/20", title: "Download transactions as CSV file", children: [_jsx(Download, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Export CSV" })] }))] }), expenses.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 px-4 text-center", children: [_jsx("div", { className: "w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3", children: _jsx(ReceiptText, { className: "w-6 h-6" }) }), _jsx("h4", { className: "text-base font-semibold text-text-primary", children: "No transactions recorded yet" }), _jsx("p", { className: "text-sm text-text-secondary max-w-sm mt-1", children: "Add your first expense above to start tracking your spending in this billing cycle." })] })) : (_jsx("div", { className: "divide-y divide-border", children: expenses.map((expense) => (_jsx(LedgerRow, { expense: expense, onEdit: setEditingExpense, onDelete: setDeletingExpense }, expense.id))) }))] }), _jsx(EditExpenseModal, { isOpen: !!editingExpense, expense: editingExpense, categories: categories, onClose: () => setEditingExpense(null), onSave: handleUpdateExpense }), _jsx(ConfirmDialog, { isOpen: !!deletingExpense, title: "Delete Expense", description: `Are you sure you want to delete "${deletingExpense?.content}"? This action cannot be undone.`, confirmLabel: "Delete", onConfirm: handleConfirmDelete, onCancel: () => setDeletingExpense(null) })] }));
};
