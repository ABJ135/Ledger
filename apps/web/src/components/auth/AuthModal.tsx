import React, { useState, useEffect, FC } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export type AuthModalMode = 'login' | 'signup' | 'upgrade';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthModalMode;
  canDismiss?: boolean;
}

export const AuthModal: FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  canDismiss = true,
}) => {
  const { isGuest, login, signup, upgradeGuest, loginAsGuest } = useAuth();

  // Normalize mode to either 'login' or 'signup'
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(
    initialMode === 'upgrade' ? 'signup' : initialMode
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode === 'upgrade' ? 'signup' : initialMode);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError(null);
      setShowPassword(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (activeTab === 'signup' && confirmPassword && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (activeTab === 'login') {
        await login({ email: trimmedEmail, password });
      } else if (isGuest) {
        // For guest users, signing up automatically upgrades their guest data so zero data is lost
        await upgradeGuest({ email: trimmedEmail, password });
      } else {
        await signup({ email: trimmedEmail, password });
      }
      onClose();
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.message ||
        (activeTab === 'login'
          ? 'Invalid email or password. Please try again.'
          : 'Failed to process request. Please check your details.');
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueAsGuest = async () => {
    try {
      setIsSubmitting(true);
      await loginAsGuest();
      onClose();
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to start guest session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface rounded-modal border border-border shadow-modal w-full max-w-md overflow-hidden flex flex-col relative">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {activeTab === 'signup' && isGuest ? (
                  <Sparkles className="w-5 h-5 text-primary" />
                ) : (
                  <UserCheck className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-text-primary tracking-tight">
                  {activeTab === 'login' && 'Sign in to Ledger'}
                  {activeTab === 'signup' && (isGuest ? 'Create your Account' : 'Create your Account')}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {activeTab === 'login' && 'Access your active cycles, expenses, and todos.'}
                  {activeTab === 'signup' &&
                    (isGuest
                      ? 'Save your active cycles and expenses permanently.'
                      : 'Start fresh with a permanent cloud-backed account.')}
                </p>
              </div>
            </div>

            {canDismiss && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Clean Two-Tab Mode Switcher: Sign In & Sign Up */}
          <div className="flex items-center p-1 bg-surface-raised rounded-pill border border-border mt-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError(null);
              }}
              className={`flex-1 py-1 text-xs font-semibold rounded-pill transition-colors ${
                activeTab === 'login'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setError(null);
              }}
              className={`flex-1 py-1 text-xs font-semibold rounded-pill transition-colors ${
                activeTab === 'signup'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Informative reassurance banner for guest users on the sign up view */}
        {activeTab === 'signup' && isGuest && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs rounded-btn flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Zero data will be lost.</strong> All your current billing cycles, expenses, and categories will be permanently saved to your new account.
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-btn flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-[0.06em]">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-10 pl-9 pr-3 rounded-btn border border-border bg-surface-raised text-text-primary text-sm focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-[0.06em]">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-9 pr-10 rounded-btn border border-border bg-surface-raised text-text-primary text-sm focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[11px] text-text-secondary">
              Must be at least 8 characters.
            </span>
          </div>

          {/* Confirm Password (Signup only) */}
          {activeTab === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-[0.06em]">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-9 pr-3 rounded-btn border border-border bg-surface-raised text-text-primary text-sm focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>
          )}

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-4 mt-2 rounded-btn bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {activeTab === 'login'
                    ? 'Sign In'
                    : isGuest
                      ? 'Create Account & Save Ledger'
                      : 'Create Account'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info & Guest switch */}
        <div className="px-6 py-4 bg-surface-raised/50 border-t border-border flex flex-col gap-2.5 text-center">
          {activeTab === 'login' ? (
            <div className="text-xs text-text-secondary">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setError(null);
                }}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div className="text-xs text-text-secondary">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                }}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}

          {!isGuest && (
            <button
              type="button"
              onClick={handleContinueAsGuest}
              disabled={isSubmitting}
              className="text-xs text-text-secondary hover:text-text-primary underline cursor-pointer"
            >
              Or explore without an account (Guest Demo)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
