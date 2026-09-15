import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Users, X, Plus, LogIn, Copy, Check, ChevronRight, } from 'lucide-react';
import { useGetMySharedExpensesQuery, useCreateSharedExpenseMutation, useJoinSharedExpenseMutation, } from '@repo/api-client';
export const SharedExpenseModal = ({ isOpen, selectedId, onSelectSharedExpense, onClose, }) => {
    const { data: myGroups = [], refetch } = useGetMySharedExpensesQuery();
    const [createSharedExpense] = useCreateSharedExpenseMutation();
    const [joinSharedExpense] = useJoinSharedExpenseMutation();
    const [mode, setMode] = useState('list');
    const [groupName, setGroupName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [copiedCode, setCopiedCode] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    if (!isOpen)
        return null;
    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!groupName.trim())
            return;
        setErrorMsg(null);
        setIsSubmitting(true);
        try {
            const res = await createSharedExpense({ name: groupName.trim() }).unwrap();
            await refetch();
            onSelectSharedExpense(res);
            setGroupName('');
            setMode('list');
        }
        catch (err) {
            setErrorMsg(err.data?.message || 'Failed to create group');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleJoin = async (e) => {
        e.preventDefault();
        if (!joinCode.trim())
            return;
        setErrorMsg(null);
        setIsSubmitting(true);
        try {
            const res = await joinSharedExpense({ code: joinCode.trim() }).unwrap();
            await refetch();
            onSelectSharedExpense(res);
            setJoinCode('');
            setMode('list');
        }
        catch (err) {
            setErrorMsg(err.data?.message || 'Invalid or expired group code');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in", children: _jsxs("div", { className: "bg-surface w-full max-w-[440px] rounded-card border border-border shadow-2xl overflow-hidden animate-scale-up", children: [_jsxs("div", { className: "px-6 py-4 border-b border-border flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary", children: _jsx(Users, { className: "w-4 h-4" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-display font-semibold text-lg text-text-primary", children: "Shared Expenses" }), _jsx("p", { className: "text-xs text-text-secondary", children: "Collaborate on shared billing cycles with joint ledgers" })] })] }), _jsx("button", { type: "button", onClick: onClose, className: "p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6", children: [errorMsg && (_jsx("div", { className: "mb-4 p-3 bg-expense-alert/10 border border-expense-alert/20 rounded-md text-xs font-medium text-expense-alert", children: errorMsg })), mode === 'list' && (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("span", { className: "text-xs font-semibold uppercase tracking-wider text-text-secondary", children: ["Your Groups (", myGroups.length, ")"] }), myGroups.length === 0 ? (_jsxs("div", { className: "p-6 bg-surface-raised rounded-md text-center", children: [_jsx("p", { className: "text-sm font-medium text-text-primary mb-1", children: "No shared groups yet" }), _jsx("p", { className: "text-xs text-text-secondary", children: "Create a shared group for roommates or trips, or join with an 8-character code." })] })) : (_jsx("div", { className: "flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1", children: myGroups.map((group) => {
                                                const isSelected = selectedId === group.id;
                                                return (_jsxs("div", { className: `p-3 rounded-md border transition-all flex items-center justify-between cursor-pointer ${isSelected
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border bg-surface hover:bg-surface-raised'}`, onClick: () => onSelectSharedExpense(group), children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isSelected
                                                                        ? 'bg-primary text-white'
                                                                        : 'bg-surface-raised text-text-secondary'}`, children: group.name.charAt(0).toUpperCase() }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-semibold text-text-primary", children: group.name }), isSelected && (_jsx("span", { className: "text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded", children: "Active" }))] }), _jsxs("div", { className: "flex items-center gap-1.5 mt-0.5", children: [_jsxs("span", { className: "text-xs text-text-secondary font-mono", children: ["Code: ", group.code] }), _jsx("button", { type: "button", onClick: (e) => {
                                                                                        e.stopPropagation();
                                                                                        handleCopyCode(group.code);
                                                                                    }, className: "text-text-secondary hover:text-primary transition-colors", title: "Copy join code", children: copiedCode === group.code ? (_jsx(Check, { className: "w-3.5 h-3.5 text-income-positive" })) : (_jsx(Copy, { className: "w-3.5 h-3.5" })) })] })] })] }), _jsx(ChevronRight, { className: "w-4 h-4 text-text-secondary" })] }, group.id));
                                            }) }))] }), _jsxs("div", { className: "flex gap-2 pt-2 border-t border-border", children: [_jsxs("button", { type: "button", onClick: () => setMode('create'), className: "flex-1 h-10 rounded-input bg-primary text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors", children: [_jsx(Plus, { className: "w-4 h-4" }), "Create Group"] }), _jsxs("button", { type: "button", onClick: () => setMode('join'), className: "flex-1 h-10 rounded-input border border-border bg-surface text-text-primary text-xs font-semibold flex items-center justify-center gap-2 hover:bg-surface-raised transition-colors", children: [_jsx(LogIn, { className: "w-4 h-4" }), "Join via Code"] })] })] })), mode === 'create' && (_jsxs("form", { onSubmit: handleCreate, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-xs font-medium text-text-secondary", children: "Group Name" }), _jsx("input", { type: "text", required: true, placeholder: "e.g. Flatmates, Trip to Hunza", value: groupName, onChange: (e) => setGroupName(e.target.value), className: "h-10 px-3 rounded-input border border-border bg-surface text-text-primary text-sm focus:border-2 focus:border-primary focus:outline-none transition-all" }), _jsx("span", { className: "text-[11.5px] text-text-secondary", children: "A unique 8-character invite code will be generated automatically." })] }), _jsxs("div", { className: "flex gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: () => setMode('list'), className: "flex-1 h-10 rounded-input border border-border text-xs font-semibold text-text-primary hover:bg-surface-raised transition-colors", children: "Back" }), _jsx("button", { type: "submit", disabled: isSubmitting || !groupName.trim(), className: "flex-1 h-10 rounded-input bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors", children: isSubmitting ? 'Creating...' : 'Create Group' })] })] })), mode === 'join' && (_jsxs("form", { onSubmit: handleJoin, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-xs font-medium text-text-secondary", children: "8-Character Join Code" }), _jsx("input", { type: "text", required: true, maxLength: 8, placeholder: "e.g. AZLDNJZQ", value: joinCode, onChange: (e) => setJoinCode(e.target.value.toUpperCase()), className: "h-10 px-3 rounded-input border border-border bg-surface text-text-primary text-sm font-mono tracking-widest uppercase focus:border-2 focus:border-primary focus:outline-none transition-all" }), _jsx("span", { className: "text-[11.5px] text-text-secondary", children: "Enter the code shared by the group owner." })] }), _jsxs("div", { className: "flex gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: () => setMode('list'), className: "flex-1 h-10 rounded-input border border-border text-xs font-semibold text-text-primary hover:bg-surface-raised transition-colors", children: "Back" }), _jsx("button", { type: "submit", disabled: isSubmitting || joinCode.trim().length !== 8, className: "flex-1 h-10 rounded-input bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors", children: isSubmitting ? 'Joining...' : 'Join Group' })] })] }))] })] }) }));
};
