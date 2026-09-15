import { useState, FC, FormEvent, useRef, useEffect } from 'react';
import {
  useGetTodosQuery,
  useGetCategoriesQuery,
  useCreateTodoMutation,
  useUpdateTodoMutation,
  useDeleteTodoMutation,
  useDeleteAllTodosMutation,
  usePromoteTodoMutation,
  usePromoteAllTodosMutation,
} from '@repo/api-client';
import { Todo } from '@repo/shared-types';
import {
  CheckSquare,
  Plus,
  ArrowUpRight,
  Trash2,
  X,
  Sparkles,
  Loader2,
  Tag,
} from 'lucide-react';
import { formatPaisa, paisaToRupees, rupeesToPaisa } from '../utils/currency';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const TodoPage: FC = () => {
  const { data: todos = [], isLoading, refetch } = useGetTodosQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
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
  const [newCategoryId, setNewCategoryId] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Confirm dialog state
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmPromoteAll, setConfirmPromoteAll] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriceRupees, setEditPriceRupees] = useState('');

  // Keep focus on input in Add-Loop mode
  useEffect(() => {
    if (isAddLoopOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddLoopOpen]);

  const handleAddLoopSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const price = newPriceRupees.trim() ? rupeesToPaisa(parseFloat(newPriceRupees)) : null;

    try {
      await createTodo({
        content: newContent.trim(),
        price: !isNaN(price as number) && price !== null ? price : null,
        categoryId: newCategoryId || null,
      }).unwrap();

      // Spec B.8 Add-Loop: submits and resets input in place without closing/flickering
      setNewContent('');
      setNewPriceRupees('');
      setNewCategoryId('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to create todo:', err);
    }
  };

  const handlePriceBlur = async (todo: Todo) => {
    const parsed = parseFloat(editPriceRupees);
    if (!isNaN(parsed) && parsed >= 0) {
      await updateTodo({
        id: todo.id,
        data: { price: rupeesToPaisa(parsed) },
      }).unwrap();
    }
    setEditingId(null);
  };

  const handlePromoteSingle = async (todo: Todo) => {
    try {
      await promoteTodo(todo.id).unwrap();
      await refetch();
    } catch (err) {
      console.error('Promote failed:', err);
    }
  };

  const handlePromoteAll = async () => {
    try {
      await promoteAllTodos().unwrap();
      await refetch();
    } catch (err) {
      console.error('Promote all failed:', err);
    } finally {
      setConfirmPromoteAll(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllTodos().unwrap();
      await refetch();
    } catch (err) {
      console.error('Delete all failed:', err);
    } finally {
      setConfirmDeleteAll(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!todoToDelete) return;
    try {
      await deleteTodo(todoToDelete.id).unwrap();
    } catch (err) {
      console.error('Delete single failed:', err);
    } finally {
      setTodoToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-text-secondary">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading wishlist...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Card */}
      <div className="bg-surface rounded-card p-6 border border-border shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h2 className="font-display text-2xl font-bold text-text-primary">
              To-Do Wishlist
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-1 ml-11">
            Pre-expense backlog. Items can have an estimated price and be promoted directly into the active cycle.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {todos.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setConfirmPromoteAll(true)}
                className="h-10 px-3.5 rounded-btn bg-income-positive hover:bg-income-positive/90 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Add All to Active Month</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmDeleteAll(true)}
                className="h-10 px-3.5 rounded-btn border border-expense-alert/30 text-expense-alert hover:bg-expense-alert/10 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsAddLoopOpen(true)}
            className="h-10 px-4 rounded-btn bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Wishlist Table (The Ledger Rule) */}
      <div className="bg-surface rounded-card border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-text-primary tracking-tight">
              Wishlist Backlog
            </span>
            <span className="text-xs text-text-secondary">({todos.length} items)</span>
          </div>
        </div>

        {todos.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="font-display text-base font-semibold text-text-primary mb-1">
              No tasks yet
            </h4>
            <p className="text-xs text-text-secondary max-w-sm mb-4">
              Keep track of future purchases or potential expenses before deciding to charge them to your monthly cycle.
            </p>
            <button
              type="button"
              onClick={() => setIsAddLoopOpen(true)}
              className="h-10 px-4 rounded-btn bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Wishlist Item
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className="h-[52px] px-5 flex items-center justify-between hover:bg-surface-raised transition-colors group"
              >
                {/* Left: Checkmark Circle + Content + Category Badge */}
                <div className="flex items-center gap-3 flex-1 mr-4 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {todo.category?.name ? todo.category.name.charAt(0).toUpperCase() : '•'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {todo.content}
                    </span>
                    {todo.category && (
                      <span className="text-[11px] text-text-secondary flex items-center gap-1">
                        <Tag className="w-3 h-3 text-primary" />
                        <span>{todo.category.name}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Price + Actions */}
                <div className="flex items-center gap-4">
                  {/* Price cell */}
                  {editingId === todo.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-text-secondary">Rs</span>
                      <input
                        type="number"
                        autoFocus
                        value={editPriceRupees}
                        onChange={(e) => setEditPriceRupees(e.target.value)}
                        onBlur={() => handlePriceBlur(todo)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handlePriceBlur(todo);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-24 h-8 px-2 text-right text-xs font-mono font-semibold border border-primary rounded bg-surface focus:outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(todo.id);
                        setEditPriceRupees(
                          todo.price !== null ? paisaToRupees(todo.price).toString() : '',
                        );
                      }}
                      className="px-2 py-1 rounded text-right hover:bg-surface border border-transparent hover:border-border transition-all"
                      title="Click to set or edit estimated price"
                    >
                      {todo.price !== null ? (
                        <span className="text-xs font-mono font-semibold text-text-primary">
                          {formatPaisa(todo.price)}
                        </span>
                      ) : (
                        <span className="text-xs text-text-secondary/70 italic">
                          + Add price
                        </span>
                      )}
                    </button>
                  )}

                  {/* Per-row Promote & Delete actions revealed on hover/press */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handlePromoteSingle(todo)}
                      className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors"
                      title="Promote to current month"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTodoToDelete(todo)}
                      className="p-1.5 rounded-md text-expense-alert hover:bg-expense-alert/10 transition-colors"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add-Loop Popup (Spec B.8) */}
      {isAddLoopOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-[380px] rounded-card border border-border shadow-2xl p-6 animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-display font-semibold text-base text-text-primary">
                  Quick Add Wishlist
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddLoopOpen(false)}
                className="p-1 rounded-md text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddLoopSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-secondary">Item Name</label>
                <input
                  ref={inputRef}
                  type="text"
                  required
                  placeholder="e.g. Ergonomic chair, Monitor stand"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="h-10 px-3 rounded-input border border-border bg-surface text-sm text-text-primary focus:border-2 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-secondary">
                  Estimated Price in PKR (Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={newPriceRupees}
                  onChange={(e) => setNewPriceRupees(e.target.value)}
                  className="h-10 px-3 rounded-input border border-border bg-surface text-sm text-text-primary focus:border-2 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-secondary">
                  Category (Optional)
                </label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="h-10 px-3 rounded-input border border-border bg-surface text-sm text-text-primary focus:border-2 focus:border-primary focus:outline-none"
                >
                  <option value="">No category (General)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 bg-surface-raised rounded-md text-[11px] text-text-secondary">
                💡 <strong>Add-Loop enabled</strong>: Pressing Enter or clicking Add adds the item immediately and keeps the cursor focused so you can type the next item without reopening.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddLoopOpen(false)}
                  className="flex-1 h-10 rounded-input border border-border text-xs font-semibold text-text-primary hover:bg-surface-raised transition-colors"
                >
                  Done
                </button>
                <button
                  type="submit"
                  disabled={!newContent.trim()}
                  className="flex-1 h-10 rounded-input bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Single Confirm Dialog (Spec B.8) */}
      <ConfirmDialog
        isOpen={!!todoToDelete}
        title="Delete Wishlist Item"
        description={`Are you sure you want to remove "${todoToDelete?.content}"?`}
        confirmLabel="Delete"
        onConfirm={handleDeleteSingle}
        onCancel={() => setTodoToDelete(null)}
      />

      {/* Delete All Confirm Dialog (Spec B.8) */}
      <ConfirmDialog
        isOpen={confirmDeleteAll}
        title="Clear Wishlist"
        description="Are you sure you want to delete all items from your wishlist? This cannot be undone."
        confirmLabel="Delete All"
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmDeleteAll(false)}
      />

      {/* Promote All Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmPromoteAll}
        title="Promote All to Active Month"
        description="This will convert all wishlist items into real expenses in your current active billing cycle and remove them from your backlog."
        confirmLabel="Promote All"
        onConfirm={handlePromoteAll}
        onCancel={() => setConfirmPromoteAll(false)}
      />
    </div>
  );
};
