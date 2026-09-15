import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGetMySharedExpensesQuery, useCreateSharedExpenseMutation, useJoinSharedExpenseMutation, useUpgradeGuestMutation, } from '@repo/api-client';
import { Sun, Moon, Users, Copy, Check, Plus, ArrowRight, ShieldCheck, LogOut, UserCheck, AlertCircle, Loader2, } from 'lucide-react';
export const SettingsPage = ({ isDark, onToggleTheme, onOpenSharedModal, }) => {
    const { user, logout, setAuthData } = useAuth();
    const { data: sharedGroups = [], refetch: refetchGroups } = useGetMySharedExpensesQuery();
    const [createGroup] = useCreateSharedExpenseMutation();
    const [joinGroup] = useJoinSharedExpenseMutation();
    const [upgradeGuest] = useUpgradeGuestMutation();
    const [copiedCode, setCopiedCode] = useState(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [sharedError, setSharedError] = useState(null);
    const [sharedSuccess, setSharedSuccess] = useState(null);
    // Guest upgrade form state
    const [upgradeEmail, setUpgradeEmail] = useState('');
    const [upgradePassword, setUpgradePassword] = useState('');
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [upgradeError, setUpgradeError] = useState(null);
    const [upgradeSuccess, setUpgradeSuccess] = useState(false);
    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };
    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim())
            return;
        setSharedError(null);
        setSharedSuccess(null);
        try {
            const res = await createGroup({ name: newGroupName.trim() }).unwrap();
            setNewGroupName('');
            setSharedSuccess(`Created group "${res.name}" with code ${res.code}`);
            refetchGroups();
        }
        catch (err) {
            setSharedError(err?.data?.message || 'Failed to create group');
        }
    };
    const handleJoinGroup = async (e) => {
        e.preventDefault();
        if (!joinCode.trim())
            return;
        setSharedError(null);
        setSharedSuccess(null);
        try {
            const res = await joinGroup({ code: joinCode.trim() }).unwrap();
            setJoinCode('');
            setSharedSuccess(`Joined "${res.name}" successfully!`);
            refetchGroups();
        }
        catch (err) {
            setSharedError(err?.data?.message || 'Invalid or expired invite code');
        }
    };
    const handleUpgradeAccount = async (e) => {
        e.preventDefault();
        if (!upgradeEmail.trim() || !upgradePassword)
            return;
        setIsUpgrading(true);
        setUpgradeError(null);
        try {
            const res = await upgradeGuest({ email: upgradeEmail.trim(), password: upgradePassword }).unwrap();
            setAuthData(res.user, res.tokens.accessToken);
            setUpgradeSuccess(true);
        }
        catch (err) {
            setUpgradeError(err?.data?.message || err?.message || 'Upgrade failed. Please check credentials.');
        }
        finally {
            setIsUpgrading(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-6 max-w-3xl mx-auto pb-12", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display text-2xl font-bold text-text-primary tracking-tight", children: "Settings & Preferences" }), _jsx("p", { className: "text-sm text-text-secondary mt-1", children: "Configure appearance, manage shared collaborative ledgers, and secure your account session." })] }), _jsxs("div", { className: "bg-surface rounded-card p-6 border border-border shadow-card flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center gap-3 border-b border-border pb-4", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary", children: _jsx(Sun, { className: "w-4 h-4" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-base text-text-primary", children: "Appearance & Theme" }), _jsx("p", { className: "text-xs text-text-secondary", children: "Deep Teal & Warm Ivory design system (Part B)" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("button", { type: "button", onClick: () => {
                                    if (isDark)
                                        onToggleTheme();
                                }, className: `p-4 rounded-btn border flex items-center gap-3 transition-colors ${!isDark
                                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                    : 'border-border bg-surface-raised/40 text-text-secondary hover:text-text-primary'}`, children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center", children: _jsx(Sun, { className: "w-4 h-4" }) }), _jsxs("div", { className: "text-left", children: [_jsx("div", { className: "text-sm font-semibold", children: "Warm Ivory (Light)" }), _jsx("div", { className: "text-xs opacity-75", children: "Editorial cream & deep teal" })] })] }), _jsxs("button", { type: "button", onClick: () => {
                                    if (!isDark)
                                        onToggleTheme();
                                }, className: `p-4 rounded-btn border flex items-center gap-3 transition-colors ${isDark
                                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                    : 'border-border bg-surface-raised/40 text-text-secondary hover:text-text-primary'}`, children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-teal-400/10 text-teal-400 flex items-center justify-center", children: _jsx(Moon, { className: "w-4 h-4" }) }), _jsxs("div", { className: "text-left", children: [_jsx("div", { className: "text-sm font-semibold", children: "Near-Black (Dark)" }), _jsx("div", { className: "text-xs opacity-75", children: "High-contrast bright teal" })] })] })] })] }), _jsxs("div", { className: "bg-surface rounded-card p-6 border border-border shadow-card flex flex-col gap-5", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border pb-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary", children: _jsx(Users, { className: "w-4 h-4" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-base text-text-primary", children: "Shared Expense Groups" }), _jsx("p", { className: "text-xs text-text-secondary", children: "Collaborate with roommates, partners, or travel groups with 8-character invite codes" })] })] }), onOpenSharedModal && (_jsx("button", { type: "button", onClick: onOpenSharedModal, className: "text-xs font-semibold text-primary hover:underline", children: "Open Modal View" }))] }), sharedSuccess && (_jsxs("div", { className: "p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-btn flex items-center gap-2", children: [_jsx(Check, { className: "w-4 h-4 shrink-0" }), _jsx("span", { children: sharedSuccess })] })), sharedError && (_jsxs("div", { className: "p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-btn flex items-center gap-2", children: [_jsx(AlertCircle, { className: "w-4 h-4 shrink-0" }), _jsx("span", { children: sharedError })] })), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("span", { className: "text-xs font-semibold uppercase tracking-wider text-text-secondary", children: ["Your Active Memberships (", sharedGroups.length, ")"] }), sharedGroups.length === 0 ? (_jsx("div", { className: "py-6 px-4 bg-surface-raised/40 rounded-btn text-center text-xs text-text-secondary", children: "You are not a member of any shared expense groups yet. Create or join one below." })) : (_jsx("div", { className: "border border-border rounded-btn overflow-hidden divide-y divide-border", children: sharedGroups.map((g) => (_jsxs("div", { className: "p-3.5 flex items-center justify-between bg-surface hover:bg-surface-raised/40 transition-colors", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold text-text-primary", children: g.name }), _jsxs("div", { className: "text-xs text-text-secondary", children: ["Group ID: ", g.id.slice(0, 8), "..."] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-mono text-xs font-bold px-2.5 py-1 bg-surface-raised text-primary rounded border border-border", children: g.code }), _jsx("button", { type: "button", onClick: () => handleCopyCode(g.code), className: "h-8 px-2.5 rounded text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors flex items-center gap-1", title: "Copy join code to clipboard", children: copiedCode === g.code ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "w-3.5 h-3.5 text-primary" }), _jsx("span", { className: "text-primary font-semibold", children: "Copied" })] })) : (_jsxs(_Fragment, { children: [_jsx(Copy, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Copy" })] })) })] })] }, g.id))) }))] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border", children: [_jsxs("form", { onSubmit: handleCreateGroup, className: "flex flex-col gap-2.5", children: [_jsx("span", { className: "text-xs font-semibold text-text-primary", children: "Create New Group" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", placeholder: "e.g. Apartment 4B", value: newGroupName, onChange: (e) => setNewGroupName(e.target.value), className: "flex-1 h-9 px-3 rounded-btn bg-surface border border-border text-xs text-text-primary focus-visible:outline-2 focus-visible:outline-primary" }), _jsxs("button", { type: "submit", disabled: !newGroupName.trim(), className: "h-9 px-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-btn text-xs font-semibold transition-colors flex items-center gap-1 shrink-0", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Create" })] })] })] }), _jsxs("form", { onSubmit: handleJoinGroup, className: "flex flex-col gap-2.5", children: [_jsx("span", { className: "text-xs font-semibold text-text-primary", children: "Join with Code" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", maxLength: 8, placeholder: "8-character code", value: joinCode, onChange: (e) => setJoinCode(e.target.value.toUpperCase()), className: "flex-1 h-9 px-3 rounded-btn bg-surface border border-border text-xs font-mono uppercase text-text-primary focus-visible:outline-2 focus-visible:outline-primary" }), _jsxs("button", { type: "submit", disabled: joinCode.trim().length !== 8, className: "h-9 px-3 bg-surface-raised border border-border hover:bg-surface text-text-primary disabled:opacity-50 rounded-btn text-xs font-semibold transition-colors flex items-center gap-1 shrink-0", children: [_jsx(ArrowRight, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Join" })] })] })] })] })] }), _jsxs("div", { className: "bg-surface rounded-card p-6 border border-border shadow-card flex flex-col gap-5", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border pb-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary", children: _jsx(UserCheck, { className: "w-4 h-4" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-base text-text-primary", children: "Account & Authentication" }), _jsx("p", { className: "text-xs text-text-secondary", children: user?.isGuest ? 'Guest Session' : 'Registered Full Account' })] })] }), _jsxs("button", { type: "button", onClick: logout, className: "h-8 px-3 rounded-btn border border-expense-alert text-expense-alert hover:bg-expense-alert/10 text-xs font-semibold transition-colors flex items-center gap-1.5", children: [_jsx(LogOut, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Sign Out" })] })] }), user?.isGuest ? (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-btn flex flex-col gap-1.5", children: [_jsxs("div", { className: "flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs", children: [_jsx(AlertCircle, { className: "w-4 h-4 shrink-0" }), _jsx("span", { children: "You are currently using a local Guest Session" })] }), _jsxs("p", { className: "text-xs text-amber-700 dark:text-amber-400 leading-relaxed", children: ["Upgrade in place to link your billing cycles, transactions, and categories to an email address.", _jsx("strong", { children: " Zero data will be lost" }), " \u2014 your account ID is preserved."] })] }), upgradeSuccess ? (_jsx("div", { className: "p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-btn text-xs text-emerald-800 dark:text-emerald-300 font-medium", children: "\u2713 Account successfully upgraded! A confirmation email has been dispatched via Brevo." })) : (_jsxs("form", { onSubmit: handleUpgradeAccount, className: "flex flex-col gap-3 max-w-md", children: [upgradeError && (_jsx("div", { className: "p-2.5 bg-rose-50 text-rose-700 text-xs rounded border border-rose-200", children: upgradeError })), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-xs font-semibold text-text-secondary", children: "Email Address" }), _jsx("input", { type: "email", required: true, placeholder: "name@example.com", value: upgradeEmail, onChange: (e) => setUpgradeEmail(e.target.value), className: "h-9 px-3 rounded-btn bg-surface border border-border text-xs text-text-primary focus-visible:outline-2 focus-visible:outline-primary" })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-xs font-semibold text-text-secondary", children: "Password (min 8 chars)" }), _jsx("input", { type: "password", required: true, minLength: 8, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: upgradePassword, onChange: (e) => setUpgradePassword(e.target.value), className: "h-9 px-3 rounded-btn bg-surface border border-border text-xs text-text-primary focus-visible:outline-2 focus-visible:outline-primary" })] }), _jsx("button", { type: "submit", disabled: isUpgrading, className: "h-9 px-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-btn text-xs font-semibold transition-colors flex items-center justify-center gap-2 mt-1 shadow-sm", children: isUpgrading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-3.5 h-3.5 animate-spin" }), _jsx("span", { children: "Upgrading Session..." })] })) : (_jsx("span", { children: "Save Data & Upgrade Account" })) })] }))] })) : (_jsxs("div", { className: "p-4 bg-surface-raised/50 rounded-btn border border-border flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs text-text-secondary", children: "Registered Email" }), _jsx("div", { className: "text-sm font-semibold text-text-primary mt-0.5", children: user?.email })] }), _jsxs("div", { className: "flex items-center gap-1.5 text-xs text-primary font-semibold", children: [_jsx(ShieldCheck, { className: "w-4 h-4 text-primary" }), _jsx("span", { children: "Verified Session" })] })] }))] })] }));
};
