import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { useGetTodosQuery, useCreateTodoMutation, useUpdateTodoMutation, useDeleteTodoMutation, useDeleteAllTodosMutation, usePromoteTodoMutation, usePromoteAllTodosMutation, } from '@repo/api-client';
import { CheckSquare, Plus, ArrowUpRight, Trash2, X, Sparkles, Loader2, } from 'lucide-react';
import { formatPaisa, paisaToRupees, rupeesToPaisa } from '../utils/currency';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
export const TodoPage = () => {
    const { data: todos = [], isLoading, refetch } = useGetTodosQuery();
    const [createTodo] = useCreateTodoMutation();
    const [updateTodo] = useUpdateTodoMutation();
    const [deleteTodo] = useDeleteTodoMutation();
    const [deleteAllTodos] = useDeleteAllTodosMutation();
    const [promoteTodo] = usePromoteTodoMutation();
    const [promoteAllTodos] = usePromoteAllTodosMutation();
    // Add-loop modal state
    const [isAddLoopOpen, setIsAddLoopOpen] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [newPriceRupees, setNewPriceRupees] = useState('');
    const inputRef = useRef(null);
    // Confirm dialog state
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
    const [confirmPromoteAll, setConfirmPromoteAll] = useState(false);
    const [todoToDelete, setTodoToDelete] = useState(null);
    // Inline editing state
    const [editingId, setEditingId] = useState(null);
    const [editPriceRupees, setEditPriceRupees] = useState('');
    // Keep focus on input in Add-Loop mode
    useEffect(() => {
        if (isAddLoopOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAddLoopOpen]);
    const handleAddLoopSubmit = async (e) => {
        e.preventDefault();
        if (!newContent.trim())
            return;
        const price = newPriceRupees.trim() ? rupeesToPaisa(parseFloat(newPriceRupees)) : null;
        try {
            await createTodo({
                content: newContent.trim(),
                price: !isNaN(price) && price !== null ? price : null,
            }).unwrap();
            // Spec B.8 Add-Loop: submits and resets input in place without closing/flickering
            setNewContent('');
            setNewPriceRupees('');
            inputRef.current?.focus();
        }
        catch (err) {
            console.error('Failed to create todo:', err);
        }
    };
    const handlePriceBlur = async (todo) => {
        const parsed = parseFloat(editPriceRupees);
        if (!isNaN(parsed) && parsed >= 0) {
            await updateTodo({
                id: todo.id,
                data: { price: rupeesToPaisa(parsed) },
            }).unwrap();
        }
        setEditingId(null);
    };
    const handlePromoteSingle = async (todo) => {
        try {
            await promoteTodo(todo.id).unwrap();
            await refetch();
        }
        catch (err) {
            console.error('Promote failed:', err);
        }
    };
    const handlePromoteAll = async () => {
        try {
            await promoteAllTodos().unwrap();
            await refetch();
        }
        catch (err) {
            console.error('Promote all failed:', err);
        }
        finally {
            setConfirmPromoteAll(false);
        }
    };
    const handleDeleteAll = async () => {
        try {
            await deleteAllTodos().unwrap();
            await refetch();
        }
        catch (err) {
            console.error('Delete all failed:', err);
        }
        finally {
            setConfirmDeleteAll(false);
        }
    };
    const handleDeleteSingle = async () => {
        if (!todoToDelete)
            return;
        try {
            await deleteTodo(todoToDelete.id).unwrap();
        }
        catch (err) {
            console.error('Delete single failed:', err);
        }
        finally {
            setTodoToDelete(null);
        }
    };
    if (isLoading) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center min-h-[400px] gap-3 text-text-secondary", children: [_jsx(Loader2, { className: "w-6 h-6 animate-spin text-primary" }), _jsx("span", { className: "text-sm font-medium", children: "Loading wishlist..." })] }));
    }
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "bg-surface rounded-card p-6 border border-border shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary", children: _jsx(CheckSquare, { className: "w-4 h-4" }) }), _jsx("h2", { className: "font-display text-2xl font-bold text-text-primary", children: "To-Do Wishlist" })] }), _jsx("p", { className: "text-xs text-text-secondary mt-1 ml-11", children: "Pre-expense backlog. Items can have an estimated price and be promoted directly into the active cycle." })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2.5", children: [todos.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", onClick: () => setConfirmPromoteAll(true), className: "h-10 px-3.5 rounded-btn bg-income-positive hover:bg-income-positive/90 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm", children: [_jsx(ArrowUpRight, { className: "w-4 h-4" }), _jsx("span", { children: "Add All to Active Month" })] }), _jsxs("button", { type: "button", onClick: () => setConfirmDeleteAll(true), className: "h-10 px-3.5 rounded-btn border border-expense-alert/30 text-expense-alert hover:bg-expense-alert/10 text-xs font-semibold flex items-center gap-2 transition-colors", children: [_jsx(Trash2, { className: "w-4 h-4" }), _jsx("span", { children: "Clear All" })] })] })), _jsxs("button", { type: "button", onClick: () => setIsAddLoopOpen(true), className: "h-10 px-4 rounded-btn bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsx("span", { children: "Add Item" })] })] })] }), _jsxs("div", { className: "bg-surface rounded-card border border-border shadow-card overflow-hidden", children: [_jsx("div", { className: "px-5 py-4 border-b border-border flex items-center justify-between", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-[15px] font-semibold text-text-primary tracking-tight", children: "Wishlist Backlog" }), _jsxs("span", { className: "text-xs text-text-secondary", children: ["(", todos.length, " items)"] })] }) }), todos.length === 0 ? (_jsxs("div", { className: "p-12 text-center flex flex-col items-center justify-center", children: [_jsx("div", { className: "w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3", children: _jsx(Sparkles, { className: "w-6 h-6" }) }), _jsx("h4", { className: "font-display text-base font-semibold text-text-primary mb-1", children: "No tasks yet" }), _jsx("p", { className: "text-xs text-text-secondary max-w-sm mb-4", children: "Keep track of future purchases or potential expenses before deciding to charge them to your monthly cycle." }), _jsxs("button", { type: "button", onClick: () => setIsAddLoopOpen(true), className: "h-10 px-4 rounded-btn bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-2 transition-colors", children: [_jsx(Plus, { className: "w-4 h-4" }), "Add Wishlist Item"] })] })) : (_jsx("div", { className: "divide-y divide-border", children: todos.map((todo) => (_jsxs("div", { className: "h-[52px] px-5 flex items-center justify-between hover:bg-surface-raised transition-colors group", children: [_jsxs("div", { className: "flex items-center gap-3 flex-1 mr-4 min-w-0", children: [_jsx("div", { className: "w-6 h-6 rounded-full border border-border flex items-center justify-center text-text-secondary group-hover:border-primary transition-colors", children: _jsx("span", { className: "text-[10px] font-bold", children: "\u2022" }) }), _jsx("span", { className: "text-sm font-medium text-text-primary truncate", children: todo.content })] }), _jsxs("div", { className: "flex items-center gap-4", children: [editingId === todo.id ? (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-xs text-text-secondary", children: "Rs" }), _jsx("input", { type: "number", autoFocus: true, value: editPriceRupees, onChange: (e) => setEditPriceRupees(e.target.value), onBlur: () => handlePriceBlur(todo), onKeyDown: (e) => {
                                                        if (e.key === 'Enter')
                                                            handlePriceBlur(todo);
                                                        if (e.key === 'Escape')
                                                            setEditingId(null);
                                                    }, className: "w-24 h-8 px-2 text-right text-xs font-mono font-semibold border border-primary rounded bg-surface focus:outline-none" })] })) : (_jsx("button", { type: "button", onClick: () => {
                                                setEditingId(todo.id);
                                                setEditPriceRupees(todo.price !== null ? paisaToRupees(todo.price).toString() : '');
                                            }, className: "px-2 py-1 rounded text-right hover:bg-surface border border-transparent hover:border-border transition-all", title: "Click to set or edit estimated price", children: todo.price !== null ? (_jsx("span", { className: "text-xs font-mono font-semibold text-text-primary", children: formatPaisa(todo.price) })) : (_jsx("span", { className: "text-xs text-text-secondary/70 italic", children: "+ Add price" })) })), _jsxs("div", { className: "flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity", children: [_jsx("button", { type: "button", onClick: () => handlePromoteSingle(todo), className: "p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors", title: "Promote to current month", children: _jsx(ArrowUpRight, { className: "w-4 h-4" }) }), _jsx("button", { type: "button", onClick: () => setTodoToDelete(todo), className: "p-1.5 rounded-md text-expense-alert hover:bg-expense-alert/10 transition-colors", title: "Delete item", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] })] }, todo.id))) }))] }), isAddLoopOpen && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in", children: _jsxs("div", { className: "bg-surface w-full max-w-[380px] rounded-card border border-border shadow-2xl p-6 animate-scale-up", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary", children: _jsx(Plus, { className: "w-4 h-4" }) }), _jsx("h3", { className: "font-display font-semibold text-base text-text-primary", children: "Quick Add Wishlist" })] }), _jsx("button", { type: "button", onClick: () => setIsAddLoopOpen(false), className: "p-1 rounded-md text-text-secondary hover:text-text-primary", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("form", { onSubmit: handleAddLoopSubmit, className: "flex flex-col gap-3.5", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-xs font-medium text-text-secondary", children: "Item Name" }), _jsx("input", { ref: inputRef, type: "text", required: true, placeholder: "e.g. Ergonomic chair, Monitor stand", value: newContent, onChange: (e) => setNewContent(e.target.value), className: "h-10 px-3 rounded-input border border-border bg-surface text-sm text-text-primary focus:border-2 focus:border-primary focus:outline-none" })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-xs font-medium text-text-secondary", children: "Estimated Price in PKR (Optional)" }), _jsx("input", { type: "number", placeholder: "e.g. 15000", value: newPriceRupees, onChange: (e) => setNewPriceRupees(e.target.value), className: "h-10 px-3 rounded-input border border-border bg-surface text-sm text-text-primary focus:border-2 focus:border-primary focus:outline-none" })] }), _jsxs("div", { className: "p-2.5 bg-surface-raised rounded-md text-[11px] text-text-secondary", children: ["\uD83D\uDCA1 ", _jsx("strong", { children: "Add-Loop enabled" }), ": Pressing Enter or clicking Add adds the item immediately and keeps the cursor focused so you can type the next item without reopening."] }), _jsxs("div", { className: "flex gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: () => setIsAddLoopOpen(false), className: "flex-1 h-10 rounded-input border border-border text-xs font-semibold text-text-primary hover:bg-surface-raised transition-colors", children: "Done" }), _jsx("button", { type: "submit", disabled: !newContent.trim(), className: "flex-1 h-10 rounded-input bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors", children: "Add Item" })] })] })] }) })), _jsx(ConfirmDialog, { isOpen: !!todoToDelete, title: "Delete Wishlist Item", description: `Are you sure you want to remove "${todoToDelete?.content}"?`, confirmLabel: "Delete", onConfirm: handleDeleteSingle, onCancel: () => setTodoToDelete(null) }), _jsx(ConfirmDialog, { isOpen: confirmDeleteAll, title: "Clear Wishlist", description: "Are you sure you want to delete all items from your wishlist? This cannot be undone.", confirmLabel: "Delete All", onConfirm: handleDeleteAll, onCancel: () => setConfirmDeleteAll(false) }), _jsx(ConfirmDialog, { isOpen: confirmPromoteAll, title: "Promote All to Active Month", description: "This will convert all wishlist items into real expenses in your current active billing cycle and remove them from your backlog.", confirmLabel: "Promote All", onConfirm: handlePromoteAll, onCancel: () => setConfirmPromoteAll(false) })] }));
};
