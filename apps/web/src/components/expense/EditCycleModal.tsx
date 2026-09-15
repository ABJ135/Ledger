import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Sparkles } from 'lucide-react';
import { paisaToRupees, rupeesToPaisa } from '../../utils/currency';

interface EditCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycle?: {
    id?: string;
    label: string;
    budget: number; // in paisa
  } | null;
  onSave: (data: { id?: string; label: string; budget: number }) => Promise<void>;
}

export const EditCycleModal: React.FC<EditCycleModalProps> = ({
  isOpen,
  onClose,
  cycle,
  onSave,
}) => {
  const [label, setLabel] = useState('');
  const [budgetPkr, setBudgetPkr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLabel(cycle?.label || '');
      setBudgetPkr(cycle?.budget !== undefined ? String(paisaToRupees(cycle.budget)) : '100000');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError('Please provide a cycle name or label.');
      return;
    }

    const pkrNum = parseFloat(budgetPkr);
    if (isNaN(pkrNum) || pkrNum < 0) {
      setError('Please enter a valid budget amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSave({
        id: cycle?.id,
        label: trimmedLabel,
        budget: rupeesToPaisa(pkrNum),
      });
      onClose();
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Failed to update cycle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyPreset = (amountPkr: number) => {
    setBudgetPkr(String(amountPkr));
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface rounded-modal border border-border shadow-modal w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary tracking-tight">
                Edit Cycle & Budget
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Adjust cycle name and budget for weekly, daily, or monthly pay.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {error && (
            <div className="p-3 text-xs rounded-btn bg-expense-alert/10 text-expense-alert border border-expense-alert/20 font-medium">
              {error}
            </div>
          )}

          {/* Cycle Label */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-[0.06em]">
              Cycle Label / Name
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. September 2026, Week 3, Sep 15 - Oct 15"
              className="h-10 px-3 rounded-btn border border-border bg-surface-raised text-text-primary text-sm focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              required
            />
            <span className="text-[11px] text-text-secondary">
              Name it whatever fits your lifestyle (Monthly, Weekly, Trip, etc.).
            </span>
          </div>

          {/* Budget in PKR */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-[0.06em]">
              Cycle Budget Allowance (PKR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-secondary">
                Rs
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={budgetPkr}
                onChange={(e) => setBudgetPkr(e.target.value)}
                placeholder="0"
                className="w-full h-10 pl-9 pr-3 rounded-btn border border-border bg-surface-raised text-text-primary text-sm font-semibold focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-display"
                required
              />
            </div>

            {/* Quick frequency presets */}
            <div className="mt-2">
              <span className="text-[11px] font-semibold text-text-secondary block mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                Quick Pay Period Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(5000)}
                  className="px-2.5 py-1 text-xs rounded-pill bg-surface-raised hover:bg-primary/10 hover:text-primary text-text-secondary border border-border transition-colors font-medium"
                >
                  Daily (Rs 5k)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(25000)}
                  className="px-2.5 py-1 text-xs rounded-pill bg-surface-raised hover:bg-primary/10 hover:text-primary text-text-secondary border border-border transition-colors font-medium"
                >
                  Weekly (Rs 25k)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(50000)}
                  className="px-2.5 py-1 text-xs rounded-pill bg-surface-raised hover:bg-primary/10 hover:text-primary text-text-secondary border border-border transition-colors font-medium"
                >
                  Bi-Weekly (Rs 50k)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(100000)}
                  className="px-2.5 py-1 text-xs rounded-pill bg-surface-raised hover:bg-primary/10 hover:text-primary text-text-secondary border border-border transition-colors font-medium"
                >
                  Monthly (Rs 100k)
                </button>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-btn border border-border hover:bg-surface-raised text-text-secondary text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 rounded-btn bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
