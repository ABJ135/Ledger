import React, { FC, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  RefreshControl,
} from 'react-native';
import {
  useGetTodosQuery,
  useCreateTodoMutation,
  useDeleteTodoMutation,
  useDeleteAllTodosMutation,
  usePromoteTodoMutation,
  usePromoteAllTodosMutation,
  useGetCategoriesQuery,
} from '@repo/api-client';
import { Todo } from '@repo/shared-types';
import {
  CheckSquare,
  Plus,
  ArrowUpRight,
  Trash2,
  X,
  Sparkles,
  Tag,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { formatPaisa, rupeesToPaisa } from '../utils/currency';
import { IconCircle } from '../components/common/IconCircle';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const TodoScreen: FC = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { data: todos = [], isLoading, refetch } = useGetTodosQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const [createTodo] = useCreateTodoMutation();
  const [deleteTodo] = useDeleteTodoMutation();
  const [deleteAllTodos] = useDeleteAllTodosMutation();
  const [promoteTodo] = usePromoteTodoMutation();
  const [promoteAllTodos] = usePromoteAllTodosMutation();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newPriceRupees, setNewPriceRupees] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Confirm dialogs
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmPromoteAll, setConfirmPromoteAll] = useState(false);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAddSubmit = async () => {
    if (!newContent.trim()) return;

    const parsedPrice = newPriceRupees.trim() ? parseFloat(newPriceRupees) : null;
    const price = parsedPrice !== null && !isNaN(parsedPrice) ? rupeesToPaisa(parsedPrice) : null;

    try {
      setIsSubmitting(true);
      await createTodo({
        content: newContent.trim(),
        price,
        categoryId: selectedCategoryId ?? undefined,
      }).unwrap();

      // Spec B.8 Add-Loop: resets inputs in place without closing so user can add another
      setNewContent('');
      setNewPriceRupees('');
      setSelectedCategoryId(null);
      await refetch();
    } catch (err) {
      console.error('Failed to create todo:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromoteSingle = async (todo: Todo) => {
    try {
      await promoteTodo(todo.id).unwrap();
      await refetch();
    } catch (err) {
      console.error('Failed to promote todo:', err);
    }
  };

  const handlePromoteAll = async () => {
    try {
      await promoteAllTodos().unwrap();
      await refetch();
    } catch (err) {
      console.error('Failed to promote all todos:', err);
    } finally {
      setConfirmPromoteAll(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!todoToDelete) return;
    try {
      await deleteTodo(todoToDelete.id).unwrap();
      await refetch();
    } catch (err) {
      console.error('Failed to delete todo:', err);
    } finally {
      setTodoToDelete(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllTodos().unwrap();
      await refetch();
    } catch (err) {
      console.error('Failed to delete all todos:', err);
    } finally {
      setConfirmDeleteAll(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Wishlist</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{todos.length} pre-expense tasks</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={[styles.themeToggleBtn, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isDark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {isDark ? <Sun size={15} color={colors.primary} /> : <Moon size={15} color={colors.primary} />}
          </TouchableOpacity>

          {todos.length > 0 && (
            <TouchableOpacity
              style={[styles.promoteAllBtn, { backgroundColor: colors.incomePositive }]}
              onPress={() => setConfirmPromoteAll(true)}
              activeOpacity={0.7}
            >
              <ArrowUpRight size={15} color="#FFFFFF" />
              <Text style={styles.promoteAllText}>Promote All</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setIsAddOpen(true)}
            activeOpacity={0.7}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {todos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconCircle size={48} color={colors.primary}>
              <Sparkles size={24} color={colors.primary} />
            </IconCircle>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No tasks yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Keep a backlog of desired purchases with estimated prices, then promote them into active monthly cycles.
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
              onPress={() => setIsAddOpen(true)}
              activeOpacity={0.7}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>Add Wishlist Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.ledgerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {todos.map((todo) => {
              const cat = categories.find((c) => c.id === todo.categoryId);
              return (
                <View key={todo.id} style={[styles.todoRow, { borderBottomColor: colors.border }]}>
                  {/* Left: Circle icon + content */}
                  <View style={styles.todoLeft}>
                    <IconCircle size={28} color={colors.primary}>
                      <CheckSquare size={14} color={colors.primary} />
                    </IconCircle>
                    <View style={styles.todoInfo}>
                      <Text style={[styles.todoContent, { color: colors.textPrimary }]} numberOfLines={1}>
                        {todo.content}
                      </Text>
                      <View style={styles.todoMeta}>
                        {todo.price !== null ? (
                          <Text style={[styles.todoPrice, { color: colors.primary }]}>{formatPaisa(todo.price)}</Text>
                        ) : (
                          <Text style={[styles.todoUnpriced, { color: colors.textSecondary }]}>Unpriced estimate</Text>
                        )}
                        {cat && (
                          <View style={[styles.categoryBadge, { backgroundColor: colors.primarySoft }]}>
                            <Tag size={9} color={colors.primary} />
                            <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>{cat.name}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Right: Actions */}
                  <View style={styles.todoActions}>
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => handlePromoteSingle(todo)}
                      activeOpacity={0.6}
                      accessibilityLabel={`Promote ${todo.content}`}
                    >
                      <ArrowUpRight size={17} color={colors.incomePositive} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => setTodoToDelete(todo)}
                      activeOpacity={0.6}
                      accessibilityLabel={`Delete ${todo.content}`}
                    >
                      <Trash2 size={16} color={colors.expenseAlert} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {todos.length > 0 && (
          <TouchableOpacity
            style={[styles.clearAllBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setConfirmDeleteAll(true)}
            activeOpacity={0.7}
          >
            <Trash2 size={14} color={colors.expenseAlert} />
            <Text style={[styles.clearAllText, { color: colors.expenseAlert }]}>Clear Entire Wishlist</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Add-Loop Modal */}
      <Modal
        transparent
        visible={isAddOpen}
        animationType="fade"
        onRequestClose={() => setIsAddOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsAddOpen(false)}
          />

          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <IconCircle size={32} color={colors.primary}>
                  <Plus size={16} color={colors.primary} />
                </IconCircle>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Quick Add Wishlist</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAddOpen(false)}
                style={styles.modalClose}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Item Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. Ergonomic Chair"
                  placeholderTextColor={colors.textSecondary}
                  value={newContent}
                  onChangeText={setNewContent}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Estimated Price in PKR (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. 15000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={newPriceRupees}
                  onChangeText={setNewPriceRupees}
                />
              </View>

              {/* Category picker */}
              {categories.length > 0 && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Category (Optional)</Text>
                  <TouchableOpacity
                    style={[styles.categoryPicker, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
                    onPress={() => setIsCategoryOpen(true)}
                    activeOpacity={0.7}
                  >
                    {selectedCategory ? (
                      <View style={styles.categoryPickerSelected}>
                        <Tag size={13} color={colors.primary} />
                        <Text style={[styles.categoryPickerSelectedText, { color: colors.primary }]}>
                          {selectedCategory.name}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.categoryPickerPlaceholder, { color: colors.textSecondary }]}>Select a category…</Text>
                    )}
                    <ChevronDown size={15} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.loopNote, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.loopNoteText, { color: colors.primary }]}>
                  💡 Add-Loop: Tapping Add adds the item immediately and keeps the input ready for the next item.
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setIsAddOpen(false)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textPrimary }]}>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    styles.modalSubmitBtn,
                    { backgroundColor: colors.primary },
                    (!newContent.trim() || isSubmitting) && styles.disabledBtn,
                  ]}
                  onPress={handleAddSubmit}
                  disabled={!newContent.trim() || isSubmitting}
                >
                  <Text style={styles.modalSubmitText}>
                    {isSubmitting ? 'Adding...' : 'Add Item'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Picker Sheet */}
      <Modal
        transparent
        visible={isCategoryOpen}
        animationType="slide"
        onRequestClose={() => setIsCategoryOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsCategoryOpen(false)}
          />

          <View style={[styles.sheetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Select Category</Text>
              <TouchableOpacity onPress={() => setIsCategoryOpen(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll}>
              <TouchableOpacity
                style={[
                  styles.sheetOption,
                  !selectedCategoryId && [styles.sheetOptionSelected, { backgroundColor: colors.primarySoft }],
                ]}
                onPress={() => {
                  setSelectedCategoryId(null);
                  setIsCategoryOpen(false);
                }}
              >
                <Text style={[styles.sheetOptionText, { color: colors.textPrimary }]}>No category</Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.sheetOption,
                    selectedCategoryId === cat.id && [styles.sheetOptionSelected, { backgroundColor: colors.primarySoft }],
                  ]}
                  onPress={() => {
                    setSelectedCategoryId(cat.id);
                    setIsCategoryOpen(false);
                  }}
                >
                  <View style={styles.sheetOptionRow}>
                    <Tag size={14} color={colors.primary} />
                    <Text style={[styles.sheetOptionText, { color: colors.textPrimary }]}>{cat.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Single Confirm */}
      <ConfirmModal
        isOpen={!!todoToDelete}
        title="Delete Item"
        description={`Remove "${todoToDelete?.content}" from your wishlist?`}
        confirmLabel="Delete"
        onConfirm={handleDeleteSingle}
        onCancel={() => setTodoToDelete(null)}
      />

      {/* Delete All Confirm */}
      <ConfirmModal
        isOpen={confirmDeleteAll}
        title="Clear Wishlist"
        description="Are you sure you want to delete all items from your wishlist? This action cannot be undone."
        confirmLabel="Clear All"
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmDeleteAll(false)}
      />

      {/* Promote All Confirm */}
      <ConfirmModal
        isOpen={confirmPromoteAll}
        title="Promote All to Current Cycle"
        description="Convert all wishlist backlog items into real expenses in your active billing cycle?"
        confirmLabel="Promote All"
        isDestructive={false}
        onConfirm={handlePromoteAll}
        onCancel={() => setConfirmPromoteAll(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  themeToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  promoteAllText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  ledgerCard: {
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  todoRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  todoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  todoInfo: {
    flex: 1,
  },
  todoContent: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 3,
  },
  todoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  todoPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  todoUnpriced: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  todoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 12,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Add Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 19, 17, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    gap: 12,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  categoryPicker: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPickerSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryPickerSelectedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryPickerPlaceholder: {
    fontSize: 14,
  },
  loopNote: {
    borderRadius: 8,
    padding: 10,
  },
  loopNoteText: {
    fontSize: 11,
    lineHeight: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubmitBtn: {},
  disabledBtn: {
    opacity: 0.5,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Category bottom sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 19, 17, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sheetScroll: {
    paddingTop: 4,
  },
  sheetOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetOptionSelected: {},
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetOptionText: {
    fontSize: 15,
  },
});
