import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { useGetMonthsQuery, useGetMonthByIdQuery, useGetCategoriesQuery, useCreateExpenseMutation, useUpdateExpenseMutation, useDeleteExpenseMutation, downloadMonthCsv, } from '@repo/api-client';
import { formatPaisa, paisaToRupees, rupeesToPaisa } from '../utils/currency';
import { formatPktDateTime } from '../utils/date';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Download, Plus, Trash2, Loader2, TableProperties, ArrowLeft, ChevronDown, } from 'lucide-react';
export const ExcelEditPage = ({ context = 'personal', sharedExpenseId, onBack, }) => {
    const { data: months, isLoading: monthsLoading } = useGetMonthsQuery({
        context,
        sharedExpenseId,
    });
    const [selectedMonthId, setSelectedMonthId] = useState('');
    useEffect(() => {
        if (months && months.length > 0 && !selectedMonthId) {
            const active = months.find((m) => m.isCurrent) || months[0];
            setSelectedMonthId(active.id);
        }
    }, [months, selectedMonthId]);
    const { data: monthDetail, isLoading: detailLoading } = useGetMonthByIdQuery(selectedMonthId, { skip: !selectedMonthId });
    const { data: categories = [] } = useGetCategoriesQuery();
    const [createExpense] = useCreateExpenseMutation();
    const [updateExpense] = useUpdateExpenseMutation();
    const [deleteExpense] = useDeleteExpenseMutation();
    // Active cell coordinate: [rowIndex, colIndex]
    // Columns: 0: occurredAt, 1: content, 2: categoryId, 3: amount
    const [activeCell, setActiveCell] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [deletingExpense, setDeletingExpense] = useState(null);
    const inputRef = useRef(null);
    const expenses = monthDetail?.expenses || [];
    const currentMonth = months?.find((m) => m.id === selectedMonthId);
    const columns = ['occurredAt', 'content', 'categoryId', 'amount'];
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);
    const startEditing = (row, col) => {
        const exp = expenses[row];
        if (!exp)
            return;
        setActiveCell({ row, col });
        setIsEditing(true);
        const field = columns[col];
        if (field === 'amount') {
            setEditValue(String(paisaToRupees(exp.amount)));
        }
        else if (field === 'occurredAt') {
            const d = new Date(exp.occurredAt);
            d.setMinutes(d.getMinutes() + 300); // PKT (+5:00)
            setEditValue(d.toISOString().slice(0, 16));
        }
        else if (field === 'categoryId') {
            setEditValue(exp.categoryId || '');
        }
        else {
            setEditValue(exp.content);
        }
    };
    const commitEdit = async () => {
        if (!activeCell)
            return;
        const exp = expenses[activeCell.row];
        if (!exp)
            return;
        const field = columns[activeCell.col];
        const updateData = {};
        if (field === 'content') {
            if (editValue.trim() && editValue !== exp.content) {
                updateData.content = editValue.trim();
            }
        }
        else if (field === 'amount') {
            const parsed = parseFloat(editValue);
            if (!isNaN(parsed) && parsed >= 0) {
                const paisa = rupeesToPaisa(parsed);
                if (paisa !== exp.amount) {
                    updateData.amount = paisa;
                }
            }
        }
        else if (field === 'categoryId') {
            const newCat = editValue || null;
            if (newCat !== exp.categoryId) {
                updateData.categoryId = newCat;
            }
        }
        else if (field === 'occurredAt') {
            if (editValue) {
                const chosenWallClock = new Date(editValue);
                const utcInstant = new Date(chosenWallClock.getTime() - 5 * 60 * 60 * 1000);
                updateData.occurredAt = utcInstant.toISOString();
            }
        }
        if (Object.keys(updateData).length > 0 && selectedMonthId) {
            await updateExpense({ id: exp.id, data: updateData, monthId: selectedMonthId }).unwrap();
        }
        setIsEditing(false);
    };
    const cancelEdit = () => {
        setIsEditing(false);
    };
    // Keyboard navigation across the ledger table
    const handleKeyDown = (e) => {
        if (!activeCell)
            return;
        if (isEditing) {
            if (e.key === 'Enter') {
                e.preventDefault();
                commitEdit();
                if (activeCell.row < expenses.length - 1) {
                    setActiveCell({ row: activeCell.row + 1, col: activeCell.col });
                }
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
            else if (e.key === 'Tab') {
                e.preventDefault();
                commitEdit();
                if (e.shiftKey) {
                    if (activeCell.col > 0) {
                        setActiveCell({ row: activeCell.row, col: activeCell.col - 1 });
                    }
                    else if (activeCell.row > 0) {
                        setActiveCell({ row: activeCell.row - 1, col: columns.length - 1 });
                    }
                }
                else {
                    if (activeCell.col < columns.length - 1) {
                        setActiveCell({ row: activeCell.row, col: activeCell.col + 1 });
                    }
                    else if (activeCell.row < expenses.length - 1) {
                        setActiveCell({ row: activeCell.row + 1, col: 0 });
                    }
                }
            }
            return;
        }
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (activeCell.row > 0) {
                    setActiveCell({ row: activeCell.row - 1, col: activeCell.col });
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (activeCell.row < expenses.length - 1) {
                    setActiveCell({ row: activeCell.row + 1, col: activeCell.col });
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (activeCell.col > 0) {
                    setActiveCell({ row: activeCell.row, col: activeCell.col - 1 });
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (activeCell.col < columns.length - 1) {
                    setActiveCell({ row: activeCell.row, col: activeCell.col + 1 });
                }
                break;
            case 'Tab':
                e.preventDefault();
                if (e.shiftKey) {
                    if (activeCell.col > 0) {
                        setActiveCell({ row: activeCell.row, col: activeCell.col - 1 });
                    }
                    else if (activeCell.row > 0) {
                        setActiveCell({ row: activeCell.row - 1, col: columns.length - 1 });
                    }
                }
                else {
                    if (activeCell.col < columns.length - 1) {
                        setActiveCell({ row: activeCell.row, col: activeCell.col + 1 });
                    }
                    else if (activeCell.row < expenses.length - 1) {
                        setActiveCell({ row: activeCell.row + 1, col: 0 });
                    }
                }
                break;
            case 'Enter':
                e.preventDefault();
                startEditing(activeCell.row, activeCell.col);
                break;
            case 'Delete':
            case 'Backspace':
                // If content cell, start editing cleared
                if (columns[activeCell.col] === 'content') {
                    startEditing(activeCell.row, activeCell.col);
                    setEditValue('');
                }
                break;
        }
    };
    const handleAddNewRow = async () => {
        if (!selectedMonthId)
            return;
        await createExpense({
            monthId: selectedMonthId,
            content: 'New Expense',
            amount: rupeesToPaisa(100),
            occurredAt: new Date().toISOString(),
            categoryId: categories[0]?.id || null,
        }).unwrap();
        // Focus on new row
        setTimeout(() => {
            setActiveCell({ row: expenses.length, col: 1 });
            startEditing(expenses.length, 1);
        }, 100);
    };
    if (monthsLoading || detailLoading) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center min-h-[400px] gap-3 text-text-secondary", children: [_jsx(Loader2, { className: "w-6 h-6 animate-spin text-primary" }), _jsx("span", { className: "text-sm font-medium", children: "Loading ledger spreadsheet..." })] }));
    }
    return (_jsxs("div", { className: "flex flex-col gap-5", onKeyDown: handleKeyDown, tabIndex: 0, children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-card border border-border shadow-card", children: [_jsxs("div", { className: "flex items-center gap-3", children: [onBack && (_jsx("button", { type: "button", onClick: onBack, className: "w-8 h-8 rounded-btn flex items-center justify-center hover:bg-surface-raised text-text-secondary hover:text-text-primary transition-colors", title: "Back to Active Cycle", children: _jsx(ArrowLeft, { className: "w-4 h-4" }) })), _jsx("div", { className: "w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary", children: _jsx(TableProperties, { className: "w-4 h-4" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h2", { className: "font-display text-xl font-semibold text-text-primary tracking-tight", children: currentMonth?.label || 'Excel Edit View' }), currentMonth?.isCurrent && (_jsx("span", { className: "px-2 py-0.5 rounded-pill text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20", children: "Active Cycle" }))] }), _jsx("p", { className: "text-xs text-text-secondary", children: "Inline cell editing \u2022 Arrow / Tab / Enter keyboard navigation" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "relative", children: [_jsx("select", { value: selectedMonthId, onChange: (e) => {
                                            setSelectedMonthId(e.target.value);
                                            setActiveCell(null);
                                            setIsEditing(false);
                                        }, className: "h-9 pl-3 pr-8 rounded-btn bg-surface-raised border border-border text-xs font-semibold text-text-primary appearance-none cursor-pointer focus-visible:outline-2 focus-visible:outline-primary", children: months?.map((m) => (_jsxs("option", { value: m.id, children: [m.label, " ", m.isCurrent ? '• Active' : ''] }, m.id))) }), _jsx(ChevronDown, { className: "w-3.5 h-3.5 absolute right-2.5 top-3 text-text-secondary pointer-events-none" })] }), selectedMonthId && (_jsxs("button", { type: "button", onClick: () => downloadMonthCsv(selectedMonthId), className: "h-9 px-3 bg-surface border border-border hover:bg-surface-raised rounded-btn text-xs font-semibold text-text-primary transition-colors flex items-center gap-1.5 shadow-sm", title: "Stream CSV export file", children: [_jsx(Download, { className: "w-3.5 h-3.5 text-primary" }), _jsx("span", { children: "Export CSV" })] })), _jsxs("button", { type: "button", onClick: handleAddNewRow, className: "h-9 px-3.5 bg-primary hover:bg-primary-hover text-white rounded-btn text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Add Row" })] })] })] }), monthDetail?.totals && (_jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsxs("div", { className: "bg-surface p-3.5 rounded-card border border-border flex flex-col", children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wider text-text-secondary", children: "Budget" }), _jsx("span", { className: "font-display text-lg font-bold text-text-primary tabular-nums mt-0.5", children: formatPaisa(monthDetail.totals.budget) })] }), _jsxs("div", { className: "bg-surface p-3.5 rounded-card border border-border flex flex-col", children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wider text-text-secondary", children: "Spent" }), _jsx("span", { className: "font-display text-lg font-bold text-expense-alert tabular-nums mt-0.5", children: formatPaisa(monthDetail.totals.used) })] }), _jsxs("div", { className: "bg-surface p-3.5 rounded-card border border-border flex flex-col", children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wider text-text-secondary", children: "Remaining" }), _jsx("span", { className: `font-display text-lg font-bold tabular-nums mt-0.5 ${monthDetail.totals.remaining < 0 ? 'text-expense-alert' : 'text-primary'}`, children: formatPaisa(monthDetail.totals.remaining) })] })] })), _jsx("div", { className: "bg-surface rounded-card border border-border shadow-card overflow-x-auto focus:outline-none", children: _jsxs("table", { className: "w-full text-left border-collapse select-none", children: [_jsx("thead", { children: _jsxs("tr", { className: "h-10 bg-surface-raised border-b border-border text-[11px] font-semibold text-text-secondary uppercase tracking-wider", children: [_jsx("th", { className: "w-12 text-center px-2", children: "#" }), _jsx("th", { className: "w-48 px-3", children: "Date / Time (PKT)" }), _jsx("th", { className: "px-3", children: "Description" }), _jsx("th", { className: "w-44 px-3", children: "Category" }), _jsx("th", { className: "w-36 px-3 text-right", children: "Amount (PKR)" }), _jsx("th", { className: "w-16 text-center px-2", children: "Action" })] }) }), _jsx("tbody", { children: expenses.length === 0 ? (_jsx("tr", { children: _jsxs("td", { colSpan: 6, className: "text-center py-12 text-sm text-text-secondary", children: ["No transactions recorded in this cycle. Click", ' ', _jsx("strong", { className: "text-primary font-semibold", children: "Add Row" }), " to create one."] }) })) : (expenses.map((exp, rowIndex) => {
                                const isRowActive = activeCell?.row === rowIndex;
                                return (_jsxs("tr", { className: "h-11 border-b border-border hover:bg-surface-raised/40 transition-colors group", children: [_jsx("td", { className: "text-center text-xs text-text-secondary/70 font-mono", children: rowIndex + 1 }), _jsx("td", { onClick: () => {
                                                setActiveCell({ row: rowIndex, col: 0 });
                                                startEditing(rowIndex, 0);
                                            }, className: `px-3 text-xs text-text-secondary cursor-pointer relative ${isRowActive && activeCell?.col === 0
                                                ? 'shadow-[inset_0_0_0_2px_var(--primary)] bg-primary-soft'
                                                : ''}`, children: isRowActive && activeCell?.col === 0 && isEditing ? (_jsx("input", { ref: inputRef, type: "datetime-local", value: editValue, onChange: (e) => setEditValue(e.target.value), onBlur: commitEdit, className: "w-full h-8 px-1.5 text-xs bg-surface text-text-primary rounded border border-primary outline-none" })) : (_jsx("span", { children: formatPktDateTime(exp.occurredAt) })) }), _jsx("td", { onClick: () => {
                                                setActiveCell({ row: rowIndex, col: 1 });
                                                startEditing(rowIndex, 1);
                                            }, className: `px-3 text-sm font-medium text-text-primary cursor-pointer relative ${isRowActive && activeCell?.col === 1
                                                ? 'shadow-[inset_0_0_0_2px_var(--primary)] bg-primary-soft'
                                                : ''}`, children: isRowActive && activeCell?.col === 1 && isEditing ? (_jsx("input", { ref: inputRef, type: "text", value: editValue, onChange: (e) => setEditValue(e.target.value), onBlur: commitEdit, className: "w-full h-8 px-2 text-sm bg-surface text-text-primary rounded border border-primary outline-none" })) : (_jsx("span", { children: exp.content })) }), _jsx("td", { onClick: () => {
                                                setActiveCell({ row: rowIndex, col: 2 });
                                                startEditing(rowIndex, 2);
                                            }, className: `px-3 text-xs text-text-secondary cursor-pointer relative ${isRowActive && activeCell?.col === 2
                                                ? 'shadow-[inset_0_0_0_2px_var(--primary)] bg-primary-soft'
                                                : ''}`, children: isRowActive && activeCell?.col === 2 && isEditing ? (_jsxs("select", { ref: inputRef, value: editValue, onChange: (e) => setEditValue(e.target.value), onBlur: commitEdit, className: "w-full h-8 px-2 text-xs bg-surface text-text-primary rounded border border-primary outline-none", children: [_jsx("option", { value: "", children: "Uncategorized" }), categories.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id)))] })) : (_jsx("span", { className: "inline-block px-2 py-0.5 rounded-pill bg-surface-raised text-[11px] font-medium text-text-secondary", children: exp.category?.name || 'Uncategorized' })) }), _jsx("td", { onClick: () => {
                                                setActiveCell({ row: rowIndex, col: 3 });
                                                startEditing(rowIndex, 3);
                                            }, className: `px-3 text-right text-sm font-semibold tabular-nums text-text-primary cursor-pointer relative ${isRowActive && activeCell?.col === 3
                                                ? 'shadow-[inset_0_0_0_2px_var(--primary)] bg-primary-soft'
                                                : ''}`, children: isRowActive && activeCell?.col === 3 && isEditing ? (_jsx("input", { ref: inputRef, type: "number", step: "any", value: editValue, onChange: (e) => setEditValue(e.target.value), onBlur: commitEdit, className: "w-full h-8 px-2 text-right text-sm font-semibold tabular-nums bg-surface text-text-primary rounded border border-primary outline-none" })) : (_jsx("span", { children: formatPaisa(exp.amount) })) }), _jsx("td", { className: "text-center px-2", children: _jsx("button", { type: "button", onClick: () => setDeletingExpense(exp), className: "w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:text-expense-alert hover:bg-surface-raised transition-colors opacity-0 group-hover:opacity-100", title: "Delete expense entry", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) }) })] }, exp.id));
                            })) })] }) }), deletingExpense && (_jsx(ConfirmDialog, { isOpen: true, title: "Delete Transaction", description: `Are you sure you want to permanently delete "${deletingExpense.content}"?`, confirmLabel: "Delete", onConfirm: async () => {
                    if (selectedMonthId) {
                        await deleteExpense({ id: deletingExpense.id, monthId: selectedMonthId });
                    }
                    setDeletingExpense(null);
                }, onCancel: () => setDeletingExpense(null) }))] }));
};
