import { useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import { Category } from '@repo/shared-types';
import { getPktNowForInput, pktInputToUtcIso } from '../../utils/date';
import { rupeesToPaisa } from '../../utils/currency';

interface ExpenseEntryFormProps {
  monthId: string;
  categories: Category[];
  onSubmit: (data: {
    monthId: string;
    categoryId?: string | null;
    content: string;
    amount: number; // in paisa
    occurredAt: string; // UTC ISO string
  }) => Promise<void>;
}

export const ExpenseEntryForm: React.FC<ExpenseEntryFormProps> = ({
  monthId,
  categories,
  onSubmit,
}) => {
  const [content, setContent] = useState('');
  const [rupees, setRupees] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [pktDateTime, setPktDateTime] = useState<string>(getPktNowForInput());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedContent = content.trim();
    const parsedRupees = parseFloat(rupees);

    if (!trimmedContent) {
      setError('Please enter an expense description');
      return;
    }

    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    try {
      setIsSubmitting(true);
      const amountInPaisa = rupeesToPaisa(parsedRupees);
      const occurredAtUtc = pktInputToUtcIso(pktDateTime);

      await onSubmit({
        monthId,
        categoryId: categoryId || null,
        content: trimmedContent,
        amount: amountInPaisa,
        occurredAt: occurredAtUtc,
      });

      // Reset fields
      setContent('');
      setRupees('');
      setPktDateTime(getPktNowForInput());
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface rounded-card p-5 border border-border shadow-card flex flex-col gap-3"
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3">
        {/* Date/Time field (PKT) */}
        <div className="w-full md:w-[175px] shrink-0">
          <label className="text-[13px] font-medium text-text-secondary mb-1 block">
            Date & Time (PKT)
          </label>
          <input
            type="datetime-local"
            value={pktDateTime}
            onChange={(e) => setPktDateTime(e.target.value)}
            className="w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            required
          />
        </div>

        {/* Content Field */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-[13px] font-medium text-text-secondary mb-1 block">
            Description
          </label>
          <input
            type="text"
            placeholder="e.g. Weekly grocery, Petrol, Internet bill"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            required
          />
        </div>

        {/* Category Selector */}
        <div className="w-full md:w-[160px] shrink-0">
          <label className="text-[13px] font-medium text-text-secondary mb-1 block">
            Category
          </label>
          <div className="relative">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 pl-8 pr-3 rounded-btn border border-border bg-surface text-text-primary text-sm appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer"
            >
              <option value="">General / Other</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <Tag className="w-4 h-4 text-text-secondary absolute left-2.5 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Price Field in PKR */}
        <div className="w-full md:w-[130px] shrink-0">
          <label className="text-[13px] font-medium text-text-secondary mb-1 block">
            Price (Rs)
          </label>
          <input
            type="number"
            min="1"
            step="any"
            placeholder="0"
            value={rupees}
            onChange={(e) => setRupees(e.target.value)}
            className="w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            required
          />
        </div>

        {/* Submit Button */}
        <div className="shrink-0">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto h-10 px-5 rounded-btn bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {error && (
        <span className="text-xs text-expense-alert font-medium mt-1">
          {error}
        </span>
      )}
    </form>
  );
};
