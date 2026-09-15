import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useGetMonthsQuery, useSetCurrentMonthMutation, useDeleteMonthMutation, useUpdateMonthMutation, useCreateMonthMutation, downloadMonthCsv, } from '@repo/api-client';
import { formatPaisa, paisaToRupees, rupeesToPaisa } from '../utils/currency';
import { formatPktDate } from '../utils/date';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Calendar, Check, Edit2, Trash2, Plus, Loader2, CalendarDays, X, Download, } from 'lucide-react';
export const MonthViewPage = ({ context = 'personal', sharedExpenseId, }) => {
    const { data: months = [], isLoading } = useGetMonthsQuery({
        context,
        sharedExpenseId,
    });
    const [setCurrentMonth] = useSetCurrentMonthMutation();
    const [deleteMonth] = useDeleteMonthMutation();
    const [updateMonth] = useUpdateMonthMutation();
    const [createMonth] = useCreateMonthMutation();
    const [deletingMonth, setDeletingMonth] = useState(null);
    const [editingMonth, setEditingMonth] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    // Form states
    const [editLabel, setEditLabel] = useState('');
    const [editRupees, setEditRupees] = useState('');
    const [createLabel, setCreateLabel] = useState('');
    const [createRupees, setCreateRupees] = useState('100000');
    const handleOpenEdit = (month) => {
        setEditingMonth(month);
        setEditLabel(month.label);
        setEditRupees(paisaToRupees(month.budget).toString());
    };
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingMonth)
            return;
        const parsed = parseFloat(editRupees);
        if (!editLabel.trim() || isNaN(parsed) || parsed < 0)
            return;
        await updateMonth({
            id: editingMonth.id,
            data: {
                label: editLabel.trim(),
                budget: rupeesToPaisa(parsed),
            },
        }).unwrap();
        setEditingMonth(null);
    };
    const handleCreateMonth = async (e) => {
        e.preventDefault();
        const parsed = parseFloat(createRupees);
        if (!createLabel.trim() || isNaN(parsed) || parsed < 0)
            return;
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
        if (!deletingMonth)
            return;
        try {
            await deleteMonth(deletingMonth.id).unwrap();
        }
        finally {
            setDeletingMonth(null);
        }
    };
    if (isLoading) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center min-h-[400px] gap-3 text-text-secondary", children: [_jsx(Loader2, { className: "w-6 h-6 animate-spin text-primary" }), _jsx("span", { className: "text-sm font-medium", children: "Loading cycles..." })] }));
    }
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold tracking-tight text-text-primary", children: "Billing Cycles" }), _jsx("p", { className: "text-sm text-text-secondary mt-0.5", children: "User-controlled expense cycles and custom budget allowances." })] }), _jsxs("button", { type: "button", onClick: () => setIsCreateOpen(true), className: "h-10 px-4 rounded-btn bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm focus-visible:outline-2 focus-visible:outline-primary", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsx("span", { children: "New Cycle" })] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: months.map((month) => {
                    const startDate = formatPktDate(month.startAt);
                    const endDate = month.endAt ? formatPktDate(month.endAt) : 'Present';
                    return (_jsxs("div", { className: `group bg-surface rounded-card p-5 border transition-all duration-160 shadow-card flex flex-col justify-between ${month.isCurrent ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'}`, children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `w-9 h-9 rounded-full flex items-center justify-center ${month.isCurrent
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'bg-surface-raised text-text-secondary'}`, children: _jsx(CalendarDays, { className: "w-4 h-4" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-display text-lg font-semibold text-text-primary tracking-tight", children: month.label }), _jsxs("div", { className: "flex items-center gap-1.5 text-xs text-text-secondary mt-0.5", children: [_jsx(Calendar, { className: "w-3.5 h-3.5" }), _jsxs("span", { children: [startDate, " \u2014 ", endDate] })] })] })] }), month.isCurrent && (_jsx("span", { className: "px-2.5 py-0.5 rounded-pill text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20", children: "Active Cycle" }))] }), _jsx("div", { className: "mt-5 pt-4 border-t border-border flex items-baseline justify-between", children: _jsxs("div", { children: [_jsx("span", { className: "text-[11px] font-medium uppercase tracking-wider text-text-secondary block", children: "Cycle Budget" }), _jsx("span", { className: "font-display text-2xl font-semibold text-text-primary mt-0.5 block tabular-nums", children: formatPaisa(month.budget) })] }) })] }), _jsxs("div", { className: "mt-5 pt-3 border-t border-border flex items-center justify-between", children: [!month.isCurrent ? (_jsxs("button", { type: "button", onClick: () => setCurrentMonth(month.id), className: "text-xs font-semibold text-primary hover:underline flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-primary", children: [_jsx(Check, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Set as Active Cycle" })] })) : (_jsx("span", { className: "text-xs font-medium text-text-secondary", children: "Currently Active" })), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { type: "button", onClick: () => downloadMonthCsv(month.id), "aria-label": `Export CSV for ${month.label}`, title: `Export ${month.label} to CSV`, className: "w-8 h-8 rounded-[6px] flex items-center justify-center text-text-secondary hover:text-primary hover:bg-surface-raised transition-colors", children: _jsx(Download, { className: "w-3.5 h-3.5" }) }), _jsx("button", { type: "button", onClick: () => handleOpenEdit(month), "aria-label": `Edit ${month.label}`, className: "w-8 h-8 rounded-[6px] flex items-center justify-center text-text-secondary hover:text-primary hover:bg-surface-raised transition-colors", children: _jsx(Edit2, { className: "w-3.5 h-3.5" }) }), !month.isCurrent && (_jsx("button", { type: "button", onClick: () => setDeletingMonth(month), "aria-label": `Delete ${month.label}`, className: "w-8 h-8 rounded-[6px] flex items-center justify-center text-text-secondary hover:text-expense-alert hover:bg-surface-raised transition-colors", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) }))] })] })] }, month.id));
                }) }), editingMonth && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141311]/45 backdrop-blur-[2px]", onClick: () => setEditingMonth(null), children: _jsxs("div", { className: "w-full max-w-[380px] bg-surface border border-border rounded-modal p-6 shadow-modal dark:shadow-modal-dark", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-semibold text-text-primary", children: "Edit Cycle" }), _jsx("button", { type: "button", onClick: () => setEditingMonth(null), className: "w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-raised", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("form", { onSubmit: handleSaveEdit, className: "flex flex-col gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-[13px] font-medium text-text-secondary mb-1 block", children: "Cycle Label" }), _jsx("input", { type: "text", value: editLabel, onChange: (e) => setEditLabel(e.target.value), className: "w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[13px] font-medium text-text-secondary mb-1 block", children: "Budget (Rs)" }), _jsx("input", { type: "number", min: "0", step: "any", value: editRupees, onChange: (e) => setEditRupees(e.target.value), className: "w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary", required: true })] }), _jsxs("div", { className: "flex items-center justify-end gap-3 mt-2", children: [_jsx("button", { type: "button", onClick: () => setEditingMonth(null), className: "h-10 px-4 rounded-btn border border-border bg-surface text-text-primary text-sm font-semibold", children: "Cancel" }), _jsx("button", { type: "submit", className: "h-10 px-5 rounded-btn bg-primary hover:bg-primary-hover text-white text-sm font-semibold", children: "Save" })] })] })] }) })), isCreateOpen && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141311]/45 backdrop-blur-[2px]", onClick: () => setIsCreateOpen(false), children: _jsxs("div", { className: "w-full max-w-[380px] bg-surface border border-border rounded-modal p-6 shadow-modal dark:shadow-modal-dark", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-semibold text-text-primary", children: "Create Billing Cycle" }), _jsx("button", { type: "button", onClick: () => setIsCreateOpen(false), className: "w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-raised", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("form", { onSubmit: handleCreateMonth, className: "flex flex-col gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-[13px] font-medium text-text-secondary mb-1 block", children: "Cycle Label" }), _jsx("input", { type: "text", placeholder: "e.g. October 2026, Summer Cycle", value: createLabel, onChange: (e) => setCreateLabel(e.target.value), className: "w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[13px] font-medium text-text-secondary mb-1 block", children: "Budget (Rs)" }), _jsx("input", { type: "number", min: "0", step: "any", value: createRupees, onChange: (e) => setCreateRupees(e.target.value), className: "w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary", required: true })] }), _jsxs("div", { className: "flex items-center justify-end gap-3 mt-2", children: [_jsx("button", { type: "button", onClick: () => setIsCreateOpen(false), className: "h-10 px-4 rounded-btn border border-border bg-surface text-text-primary text-sm font-semibold", children: "Cancel" }), _jsx("button", { type: "submit", className: "h-10 px-5 rounded-btn bg-primary hover:bg-primary-hover text-white text-sm font-semibold", children: "Create" })] })] })] }) })), _jsx(ConfirmDialog, { isOpen: !!deletingMonth, title: "Delete Billing Cycle", description: `Are you sure you want to delete "${deletingMonth?.label}" and all its expenses? This action is permanent and cannot be undone.`, confirmLabel: "Delete", onConfirm: handleConfirmDelete, onCancel: () => setDeletingMonth(null) })] }));
};
