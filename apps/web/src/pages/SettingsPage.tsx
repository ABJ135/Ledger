import React, { useState, FC } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  useGetMySharedExpensesQuery,
  useCreateSharedExpenseMutation,
  useJoinSharedExpenseMutation,
  useUpgradeGuestMutation,
} from '@repo/api-client';
import {
  Sun,
  Moon,
  Users,
  Copy,
  Check,
  Plus,
  ArrowRight,
  ShieldCheck,
  LogOut,
  UserCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface SettingsPageProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSharedModal?: () => void;
}

export const SettingsPage: FC<SettingsPageProps> = ({
  isDark,
  onToggleTheme,
  onOpenSharedModal,
}) => {
  const { user, logout, setAuthData } = useAuth();
  const { data: sharedGroups = [], refetch: refetchGroups } = useGetMySharedExpensesQuery();

  const [createGroup] = useCreateSharedExpenseMutation();
  const [joinGroup] = useJoinSharedExpenseMutation();
  const [upgradeGuest] = useUpgradeGuestMutation();

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [sharedError, setSharedError] = useState<string | null>(null);
  const [sharedSuccess, setSharedSuccess] = useState<string | null>(null);

  // Guest upgrade form state
  const [upgradeEmail, setUpgradeEmail] = useState('');
  const [upgradePassword, setUpgradePassword] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setSharedError(null);
    setSharedSuccess(null);

    try {
      const res = await createGroup({ name: newGroupName.trim() }).unwrap();
      setNewGroupName('');
      setSharedSuccess(`Created group "${res.name}" with code ${res.code}`);
      refetchGroups();
    } catch (err: any) {
      setSharedError(err?.data?.message || 'Failed to create group');
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setSharedError(null);
    setSharedSuccess(null);

    try {
      const res = await joinGroup({ code: joinCode.trim() }).unwrap();
      setJoinCode('');
      setSharedSuccess(`Joined "${res.name}" successfully!`);
      refetchGroups();
    } catch (err: any) {
      setSharedError(err?.data?.message || 'Invalid or expired invite code');
    }
  };

  const handleUpgradeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeEmail.trim() || !upgradePassword) return;
    setIsUpgrading(true);
    setUpgradeError(null);

    try {
      const res = await upgradeGuest({ email: upgradeEmail.trim(), password: upgradePassword }).unwrap();
      setAuthData(res.user, res.tokens.accessToken);
      setUpgradeSuccess(true);
    } catch (err: any) {
      setUpgradeError(err?.data?.message || err?.message || 'Upgrade failed. Please check credentials.');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-12">
      {/* Page Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-text-primary tracking-tight">
          Settings & Preferences
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Configure appearance, manage shared collaborative ledgers, and secure your account session.
        </p>
      </div>

      {/* Card 1: Appearance (Theme & Palette) */}
      <div className="bg-surface rounded-card p-6 border border-border shadow-card flex flex-col gap-4">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-text-primary">Appearance & Theme</h3>
            <p className="text-xs text-text-secondary">
              Deep Teal & Warm Ivory design system (Part B)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              if (isDark) onToggleTheme();
            }}
            className={`p-4 rounded-btn border flex items-center gap-3 transition-colors ${
              !isDark
                ? 'border-primary bg-primary/5 text-primary shadow-sm'
                : 'border-border bg-surface-raised/40 text-text-secondary hover:text-text-primary'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Sun className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">Warm Ivory (Light)</div>
              <div className="text-xs opacity-75">Editorial cream & deep teal</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isDark) onToggleTheme();
            }}
            className={`p-4 rounded-btn border flex items-center gap-3 transition-colors ${
              isDark
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border bg-surface-raised/40 text-text-secondary hover:text-text-primary'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-teal-400/10 text-teal-400 flex items-center justify-center">
              <Moon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">Near-Black (Dark)</div>
              <div className="text-xs opacity-75">High-contrast bright teal</div>
            </div>
          </button>
        </div>
      </div>

      {/* Card 2: Shared Expense Groups */}
      <div className="bg-surface rounded-card p-6 border border-border shadow-card flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-text-primary">Shared Expense Groups</h3>
              <p className="text-xs text-text-secondary">
                Collaborate with roommates, partners, or travel groups with 8-character invite codes
              </p>
            </div>
          </div>
          {onOpenSharedModal && (
            <button
              type="button"
              onClick={onOpenSharedModal}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Open Modal View
            </button>
          )}
        </div>

        {/* Feedback alerts */}
        {sharedSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-btn flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{sharedSuccess}</span>
          </div>
        )}
        {sharedError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-btn flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{sharedError}</span>
          </div>
        )}

        {/* Groups List */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Your Active Memberships ({sharedGroups.length})
          </span>
          {sharedGroups.length === 0 ? (
            <div className="py-6 px-4 bg-surface-raised/40 rounded-btn text-center text-xs text-text-secondary">
              You are not a member of any shared expense groups yet. Create or join one below.
            </div>
          ) : (
            <div className="border border-border rounded-btn overflow-hidden divide-y divide-border">
              {sharedGroups.map((g) => (
                <div key={g.id} className="p-3.5 flex items-center justify-between bg-surface hover:bg-surface-raised/40 transition-colors">
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{g.name}</div>
                    <div className="text-xs text-text-secondary">Group ID: {g.id.slice(0, 8)}...</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-surface-raised text-primary rounded border border-border">
                      {g.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(g.code)}
                      className="h-8 px-2.5 rounded text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors flex items-center gap-1"
                      title="Copy join code to clipboard"
                    >
                      {copiedCode === g.code ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-primary" />
                          <span className="text-primary font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create & Join Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
          {/* Create Group */}
          <form onSubmit={handleCreateGroup} className="flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-text-primary">Create New Group</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Apartment 4B"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1 h-9 px-3 rounded-btn bg-surface border border-border text-xs text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
              />
              <button
                type="submit"
                disabled={!newGroupName.trim()}
                className="h-9 px-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-btn text-xs font-semibold transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create</span>
              </button>
            </div>
          </form>

          {/* Join Group */}
          <form onSubmit={handleJoinGroup} className="flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-text-primary">Join with Code</span>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={8}
                placeholder="8-character code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="flex-1 h-9 px-3 rounded-btn bg-surface border border-border text-xs font-mono uppercase text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
              />
              <button
                type="submit"
                disabled={joinCode.trim().length !== 8}
                className="h-9 px-3 bg-surface-raised border border-border hover:bg-surface text-text-primary disabled:opacity-50 rounded-btn text-xs font-semibold transition-colors flex items-center gap-1 shrink-0"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Join</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Card 3: Account & Session */}
      <div className="bg-surface rounded-card p-6 border border-border shadow-card flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-text-primary">Account & Authentication</h3>
              <p className="text-xs text-text-secondary">
                {user?.isGuest ? 'Guest Session' : 'Registered Full Account'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="h-8 px-3 rounded-btn border border-expense-alert text-expense-alert hover:bg-expense-alert/10 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {user?.isGuest ? (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-btn flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>You are currently using a local Guest Session</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Upgrade in place to link your billing cycles, transactions, and categories to an email address.
                <strong> Zero data will be lost</strong> — your account ID is preserved.
              </p>
            </div>

            {upgradeSuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-btn text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                ✓ Account successfully upgraded! A confirmation email has been dispatched via Brevo.
              </div>
            ) : (
              <form onSubmit={handleUpgradeAccount} className="flex flex-col gap-3 max-w-md">
                {upgradeError && (
                  <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded border border-rose-200">
                    {upgradeError}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-text-secondary">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={upgradeEmail}
                    onChange={(e) => setUpgradeEmail(e.target.value)}
                    className="h-9 px-3 rounded-btn bg-surface border border-border text-xs text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-text-secondary">Password (min 8 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={upgradePassword}
                    onChange={(e) => setUpgradePassword(e.target.value)}
                    className="h-9 px-3 rounded-btn bg-surface border border-border text-xs text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpgrading}
                  className="h-9 px-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-btn text-xs font-semibold transition-colors flex items-center justify-center gap-2 mt-1 shadow-sm"
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Upgrading Session...</span>
                    </>
                  ) : (
                    <span>Save Data & Upgrade Account</span>
                  )}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="p-4 bg-surface-raised/50 rounded-btn border border-border flex items-center justify-between">
            <div>
              <div className="text-xs text-text-secondary">Registered Email</div>
              <div className="text-sm font-semibold text-text-primary mt-0.5">{user?.email}</div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Verified Session</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
