import { useState, FC, FormEvent } from 'react';
import {
  Users,
  X,
  Plus,
  LogIn,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  useGetMySharedExpensesQuery,
  useCreateSharedExpenseMutation,
  useJoinSharedExpenseMutation,
} from '@repo/api-client';
import { SharedExpense } from '@repo/shared-types';

interface SharedExpenseModalProps {
  isOpen: boolean;
  selectedId: string | null;
  onSelectSharedExpense: (group: SharedExpense) => void;
  onClose: () => void;
}

export const SharedExpenseModal: FC<SharedExpenseModalProps> = ({
  isOpen,
  selectedId,
  onSelectSharedExpense,
  onClose,
}) => {
  const { data: myGroups = [], refetch } = useGetMySharedExpensesQuery();
  const [createSharedExpense] = useCreateSharedExpenseMutation();
  const [joinSharedExpense] = useJoinSharedExpenseMutation();

  const [mode, setMode] = useState<'list' | 'create' | 'join'>('list');
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await createSharedExpense({ name: groupName.trim() }).unwrap();
      await refetch();
      onSelectSharedExpense(res);
      setGroupName('');
      setMode('list');
    } catch (err: any) {
      setErrorMsg(err.data?.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await joinSharedExpense({ code: joinCode.trim() }).unwrap();
      await refetch();
      onSelectSharedExpense(res);
      setJoinCode('');
      setMode('list');
    } catch (err: any) {
      setErrorMsg(err.data?.message || 'Invalid or expired group code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface w-full max-w-[440px] rounded-card border border-border shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-text-primary">
                Shared Expenses
              </h3>
              <p className="text-xs text-text-secondary">
                Collaborate on shared billing cycles with joint ledgers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 bg-expense-alert/10 border border-expense-alert/20 rounded-md text-xs font-medium text-expense-alert">
              {errorMsg}
            </div>
          )}

          {mode === 'list' && (
            <div className="flex flex-col gap-4">
              {/* Groups List */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Your Groups ({myGroups.length})
                </span>

                {myGroups.length === 0 ? (
                  <div className="p-6 bg-surface-raised rounded-md text-center">
                    <p className="text-sm font-medium text-text-primary mb-1">
                      No shared groups yet
                    </p>
                    <p className="text-xs text-text-secondary">
                      Create a shared group for roommates or trips, or join with an 8-character code.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {myGroups.map((group) => {
                      const isSelected = selectedId === group.id;
                      return (
                        <div
                          key={group.id}
                          className={`p-3 rounded-md border transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-surface hover:bg-surface-raised'
                          }`}
                          onClick={() => onSelectSharedExpense(group)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                isSelected
                                  ? 'bg-primary text-white'
                                  : 'bg-surface-raised text-text-secondary'
                              }`}
                            >
                              {group.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-text-primary">
                                  {group.name}
                                </span>
                                {isSelected && (
                                  <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-text-secondary font-mono">
                                  Code: {group.code}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyCode(group.code);
                                  }}
                                  className="text-text-secondary hover:text-primary transition-colors"
                                  title="Copy join code"
                                >
                                  {copiedCode === group.code ? (
                                    <Check className="w-3.5 h-3.5 text-income-positive" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-text-secondary" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className="flex-1 h-10 rounded-input bg-primary text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Group
                </button>
                <button
                  type="button"
                  onClick={() => setMode('join')}
                  className="flex-1 h-10 rounded-input border border-border bg-surface text-text-primary text-xs font-semibold flex items-center justify-center gap-2 hover:bg-surface-raised transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Join via Code
                </button>
              </div>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flatmates, Trip to Hunza"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="h-10 px-3 rounded-input border border-border bg-surface text-text-primary text-sm focus:border-2 focus:border-primary focus:outline-none transition-all"
                />
                <span className="text-[11.5px] text-text-secondary">
                  A unique 8-character invite code will be generated automatically.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="flex-1 h-10 rounded-input border border-border text-xs font-semibold text-text-primary hover:bg-surface-raised transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !groupName.trim()}
                  className="flex-1 h-10 rounded-input bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">
                  8-Character Join Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  placeholder="e.g. AZLDNJZQ"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="h-10 px-3 rounded-input border border-border bg-surface text-text-primary text-sm font-mono tracking-widest uppercase focus:border-2 focus:border-primary focus:outline-none transition-all"
                />
                <span className="text-[11.5px] text-text-secondary">
                  Enter the code shared by the group owner.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="flex-1 h-10 rounded-input border border-border text-xs font-semibold text-text-primary hover:bg-surface-raised transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || joinCode.trim().length !== 8}
                  className="flex-1 h-10 rounded-input bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Joining...' : 'Join Group'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
