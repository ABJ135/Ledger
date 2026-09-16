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
} from 'react-native';
import { Month } from '@repo/shared-types';
import {
  useGetMonthsQuery,
  useSetCurrentMonthMutation,
  useCreateMonthMutation,
  useUpdateMonthMutation,
} from '@repo/api-client';
import {
  Calendar,
  CheckCircle2,
  Plus,
  Clock,
  ArrowRight,
  X,
  Pencil,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { formatPaisa, rupeesToPaisa } from '../utils/currency';
import { formatPktDate } from '../utils/date';
import { IconCircle } from '../components/common/IconCircle';
import { EditCycleModal } from '../components/expense/EditCycleModal';

interface MonthViewScreenProps {
  onSelectMonth?: (month: Month) => void;
}

export const MonthViewScreen: FC<MonthViewScreenProps> = ({ onSelectMonth }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { data: months, isLoading, refetch } = useGetMonthsQuery({});
  const [setCurrentMonth] = useSetCurrentMonthMutation();
  const [createMonth] = useCreateMonthMutation();
  const [updateMonth] = useUpdateMonthMutation();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMonth, setEditingMonth] = useState<Month | null>(null);
  const [label, setLabel] = useState('');
  const [budgetRupees, setBudgetRupees] = useState('100000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveEdit = async (data: { id?: string; label: string; budget: number }) => {
    if (!data.id) return;
    try {
      await updateMonth({
        id: data.id,
        data: {
          label: data.label,
          budget: data.budget,
        },
      }).unwrap();
      await refetch();
      setEditingMonth(null);
    } catch (err) {
      console.error('Failed to update month:', err);
    }
  };

  const handleSetCurrent = async (monthId: string) => {
    try {
      await setCurrentMonth(monthId).unwrap();
      await refetch();
    } catch (err) {
      console.error('Failed to set current month:', err);
    }
  };

  const handleCreateMonth = async () => {
    const parsedRupees = parseFloat(budgetRupees);
    if (!label.trim() || isNaN(parsedRupees) || parsedRupees <= 0) return;

    try {
      setIsSubmitting(true);
      await createMonth({
        label: label.trim(),
        budget: rupeesToPaisa(parsedRupees),
      }).unwrap();
      setIsCreateModalOpen(false);
      setLabel('');
      setBudgetRupees('100000');
      await refetch();
    } catch (err) {
      console.error('Failed to create month:', err);
    } finally {
      setIsSubmitting(false);
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
          <Text style={[styles.title, { color: colors.textPrimary }]}>Billing Cycles</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Manage your personal financial cycles</Text>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={[styles.themeToggleBtn, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isDark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {isDark ? <Sun size={15} color={colors.primary} /> : <Moon size={15} color={colors.primary} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={() => setIsCreateModalOpen(true)}
            activeOpacity={0.7}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.createButtonText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {months && months.length > 0 ? (
          months.map((month) => {
            const isCurrent = month.isCurrent;
            const dateRange = `${formatPktDate(month.startAt)} - ${
              month.endAt ? formatPktDate(month.endAt) : 'Present'
            }`;

            return (
              <View
                key={month.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isCurrent && [styles.activeCard, { borderColor: colors.primary }],
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <IconCircle
                      size={32}
                      color={isCurrent ? colors.primary : colors.textSecondary}
                    >
                      <Calendar
                        size={16}
                        color={isCurrent ? colors.primary : colors.textSecondary}
                      />
                    </IconCircle>
                    <View style={styles.headerTitleArea}>
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{month.label}</Text>
                      <View style={styles.dateRow}>
                        <Clock size={11} color={colors.textSecondary} />
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{dateRange}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.headerRight}>
                    {isCurrent ? (
                      <View style={[styles.activePill, { backgroundColor: colors.primarySoft }]}>
                        <CheckCircle2 size={12} color={colors.primary} />
                        <Text style={[styles.activePillText, { color: colors.primary }]}>Active</Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.editPencilBtn, { backgroundColor: colors.primarySoft }]}
                      onPress={() => setEditingMonth(month)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Edit ${month.label}`}
                    >
                      <Pencil size={12} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Card Stats */}
                <View style={[styles.statsContainer, { backgroundColor: colors.surfaceRaised }]}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cycle Budget</Text>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatPaisa(month.budget)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.editBudgetBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setEditingMonth(month)}
                    activeOpacity={0.7}
                  >
                    <Pencil size={11} color={colors.primary} />
                    <Text style={[styles.editBudgetText, { color: colors.primary }]}>Edit Budget</Text>
                  </TouchableOpacity>
                </View>

                {/* Card Footer Actions */}
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  {!isCurrent ? (
                    <TouchableOpacity
                      style={styles.setCurrentBtn}
                      onPress={() => handleSetCurrent(month.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.setCurrentText, { color: colors.primary }]}>Set as Active Cycle</Text>
                      <ArrowRight size={14} color={colors.primary} />
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.activeNote, { color: colors.incomePositive }]}>Currently tracking expenses</Text>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No billing cycles found.</Text>
          </View>
        )}
      </ScrollView>

      {/* New Cycle Modal */}
      <Modal
        transparent
        visible={isCreateModalOpen}
        animationType="fade"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsCreateModalOpen(false)}
          />

          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>New Billing Cycle</Text>
              <TouchableOpacity
                onPress={() => setIsCreateModalOpen(false)}
                style={styles.modalClose}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Cycle Label</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. October 2026 or Cycle 3"
                  placeholderTextColor={colors.textSecondary}
                  value={label}
                  onChangeText={setLabel}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Budget (in PKR)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. 100000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={budgetRupees}
                  onChangeText={setBudgetRupees}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setIsCreateModalOpen(false)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreateMonth}
                  disabled={isSubmitting || !label.trim()}
                >
                  <Text style={styles.modalSubmitText}>
                    {isSubmitting ? 'Creating...' : 'Create Cycle'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Cycle & Budget Modal */}
      <EditCycleModal
        isOpen={Boolean(editingMonth)}
        cycle={
          editingMonth
            ? {
                id: editingMonth.id,
                label: editingMonth.label,
                budget: editingMonth.budget,
              }
            : null
        }
        onClose={() => setEditingMonth(null)}
        onSave={handleSaveEdit}
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
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  activeCard: {
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitleArea: {
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editPencilBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsContainer: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editBudgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBudgetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statItem: {},
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
  },
  setCurrentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setCurrentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeNote: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 19, 17, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    zIndex: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
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
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
