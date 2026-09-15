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
} from '@repo/api-client';
import { Todo } from '@repo/shared-types';
import {
  CheckSquare,
  Plus,
  ArrowUpRight,
  Trash2,
  X,
  Sparkles,
  DollarSign,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { formatPaisa, rupeesToPaisa } from '../utils/currency';
import { IconCircle } from '../components/common/IconCircle';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const TodoScreen: FC = () => {
  const { data: todos = [], isLoading, refetch } = useGetTodosQuery();
  const [createTodo] = useCreateTodoMutation();
  const [deleteTodo] = useDeleteTodoMutation();
  const [deleteAllTodos] = useDeleteAllTodosMutation();
  const [promoteTodo] = usePromoteTodoMutation();
  const [promoteAllTodos] = usePromoteAllTodosMutation();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newPriceRupees, setNewPriceRupees] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Confirm dialogs
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmPromoteAll, setConfirmPromoteAll] = useState(false);

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
      }).unwrap();

      // Spec B.8 Add-Loop: resets inputs in place without closing so user can add another
      setNewContent('');
      setNewPriceRupees('');
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Wishlist</Text>
          <Text style={styles.subtitle}>{todos.length} pre-expense tasks</Text>
        </View>

        <View style={styles.topActions}>
          {todos.length > 0 && (
            <TouchableOpacity
              style={styles.promoteAllBtn}
              onPress={() => setConfirmPromoteAll(true)}
              activeOpacity={0.7}
            >
              <ArrowUpRight size={15} color="#FFFFFF" />
              <Text style={styles.promoteAllText}>Promote All</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.addBtn}
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
            colors={[Colors.light.primary]}
          />
        }
      >
        {todos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconCircle size={48} color={Colors.light.primary}>
              <Sparkles size={24} color={Colors.light.primary} />
            </IconCircle>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptySubtitle}>
              Keep a backlog of desired purchases with estimated prices, then promote them into active monthly cycles.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => setIsAddOpen(true)}
              activeOpacity={0.7}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>Add Wishlist Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ledgerCard}>
            {todos.map((todo) => (
              <View key={todo.id} style={styles.todoRow}>
                {/* Left: Circle icon + content */}
                <View style={styles.todoLeft}>
                  <IconCircle size={28} color={Colors.light.primary}>
                    <CheckSquare size={14} color={Colors.light.primary} />
                  </IconCircle>
                  <View style={styles.todoInfo}>
                    <Text style={styles.todoContent} numberOfLines={1}>
                      {todo.content}
                    </Text>
                    {todo.price !== null ? (
                      <Text style={styles.todoPrice}>{formatPaisa(todo.price)}</Text>
                    ) : (
                      <Text style={styles.todoUnpriced}>Unpriced estimate</Text>
                    )}
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
                    <ArrowUpRight size={17} color={Colors.light.incomePositive} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => setTodoToDelete(todo)}
                    activeOpacity={0.6}
                    accessibilityLabel={`Delete ${todo.content}`}
                  >
                    <Trash2 size={16} color={Colors.light.expenseAlert} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {todos.length > 0 && (
          <TouchableOpacity
            style={styles.clearAllBtn}
            onPress={() => setConfirmDeleteAll(true)}
            activeOpacity={0.7}
          >
            <Trash2 size={14} color={Colors.light.expenseAlert} />
            <Text style={styles.clearAllText}>Clear Entire Wishlist</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Add-Loop Modal (Spec B.8) */}
      <Modal
        transparent
        visible={isAddOpen}
        animationType="fade"
        onRequestClose={() => setIsAddOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsAddOpen(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <IconCircle size={32} color={Colors.light.primary}>
                      <Plus size={16} color={Colors.light.primary} />
                    </IconCircle>
                    <Text style={styles.modalTitle}>Quick Add Wishlist</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsAddOpen(false)}
                    style={styles.modalClose}
                  >
                    <X size={20} color={Colors.light.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Item Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Ergonomic Chair"
                      placeholderTextColor={Colors.light.textSecondary}
                      value={newContent}
                      onChangeText={setNewContent}
                      autoFocus
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Estimated Price in PKR (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 15000"
                      placeholderTextColor={Colors.light.textSecondary}
                      keyboardType="numeric"
                      value={newPriceRupees}
                      onChangeText={setNewPriceRupees}
                    />
                  </View>

                  <View style={styles.loopNote}>
                    <Text style={styles.loopNoteText}>
                      💡 Add-Loop: Tapping Add adds the item immediately and keeps the input ready for the next item.
                    </Text>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalCancelBtn]}
                      onPress={() => setIsAddOpen(false)}
                    >
                      <Text style={styles.modalCancelText}>Done</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modalBtn,
                        styles.modalSubmitBtn,
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
    backgroundColor: Colors.light.background,
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
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  promoteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.incomePositive,
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
    backgroundColor: Colors.light.primary,
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
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  todoRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingHorizontal: 4,
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
    color: Colors.light.textPrimary,
    marginBottom: 2,
  },
  todoPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  todoUnpriced: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
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
    color: Colors.light.expenseAlert,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 19, 17, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.light.surface,
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
    color: Colors.light.textPrimary,
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
    color: Colors.light.textPrimary,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.surfaceRaised,
    fontSize: 14,
    color: Colors.light.textPrimary,
  },
  loopNote: {
    backgroundColor: Colors.light.surfaceRaised,
    borderRadius: 8,
    padding: 10,
  },
  loopNoteText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
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
    borderColor: Colors.light.border,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textPrimary,
  },
  modalSubmitBtn: {
    backgroundColor: Colors.light.primary,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
