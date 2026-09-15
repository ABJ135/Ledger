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
} from 'react-native';
import { Month } from '@repo/shared-types';
import {
  useGetMonthsQuery,
  useSetCurrentMonthMutation,
  useCreateMonthMutation,
} from '@repo/api-client';
import {
  Calendar,
  CheckCircle2,
  Plus,
  Clock,
  ArrowRight,
  X,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { formatPaisa, rupeesToPaisa } from '../utils/currency';
import { formatPktDate } from '../utils/date';
import { IconCircle } from '../components/common/IconCircle';

interface MonthViewScreenProps {
  onSelectMonth?: (month: Month) => void;
}

export const MonthViewScreen: FC<MonthViewScreenProps> = ({ onSelectMonth }) => {
  const { data: months, isLoading, refetch } = useGetMonthsQuery({});
  const [setCurrentMonth] = useSetCurrentMonthMutation();
  const [createMonth] = useCreateMonthMutation();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [budgetRupees, setBudgetRupees] = useState('100000');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <Text style={styles.title}>Billing Cycles</Text>
          <Text style={styles.subtitle}>Manage your personal financial cycles</Text>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setIsCreateModalOpen(true)}
          activeOpacity={0.7}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.createButtonText}>New</Text>
        </TouchableOpacity>
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
                style={[styles.card, isCurrent && styles.activeCard]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <IconCircle
                      size={32}
                      color={isCurrent ? Colors.light.primary : Colors.light.textSecondary}
                    >
                      <Calendar
                        size={16}
                        color={isCurrent ? Colors.light.primary : Colors.light.textSecondary}
                      />
                    </IconCircle>
                    <View>
                      <Text style={styles.cardTitle}>{month.label}</Text>
                      <View style={styles.dateRow}>
                        <Clock size={11} color={Colors.light.textSecondary} />
                        <Text style={styles.dateText}>{dateRange}</Text>
                      </View>
                    </View>
                  </View>

                  {isCurrent ? (
                    <View style={styles.activePill}>
                      <CheckCircle2 size={12} color={Colors.light.primary} />
                      <Text style={styles.activePillText}>Active</Text>
                    </View>
                  ) : null}
                </View>

                {/* Card Stats */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Budget</Text>
                    <Text style={styles.statValue}>{formatPaisa(month.budget)}</Text>
                  </View>
                </View>

                {/* Card Footer Actions */}
                <View style={styles.cardFooter}>
                  {!isCurrent ? (
                    <TouchableOpacity
                      style={styles.setCurrentBtn}
                      onPress={() => handleSetCurrent(month.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.setCurrentText}>Set as Active Cycle</Text>
                      <ArrowRight size={14} color={Colors.light.primary} />
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.activeNote}>Currently tracking expenses</Text>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No billing cycles found.</Text>
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
        <TouchableWithoutFeedback onPress={() => setIsCreateModalOpen(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>New Billing Cycle</Text>
                  <TouchableOpacity
                    onPress={() => setIsCreateModalOpen(false)}
                    style={styles.modalClose}
                  >
                    <X size={20} color={Colors.light.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Cycle Label</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. October 2026 or Cycle 3"
                      placeholderTextColor={Colors.light.textSecondary}
                      value={label}
                      onChangeText={setLabel}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Budget (in PKR)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 100000"
                      placeholderTextColor={Colors.light.textSecondary}
                      keyboardType="numeric"
                      value={budgetRupees}
                      onChangeText={setBudgetRupees}
                    />
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalCancelBtn]}
                      onPress={() => setIsCreateModalOpen(false)}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalSubmitBtn]}
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.primary,
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
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 12,
  },
  activeCard: {
    borderColor: Colors.light.primary,
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
    color: Colors.light.textPrimary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  statsContainer: {
    backgroundColor: Colors.light.surfaceRaised,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {},
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.textPrimary,
    marginTop: 2,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
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
    color: Colors.light.primary,
  },
  activeNote: {
    fontSize: 12,
    color: Colors.light.incomePositive,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
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
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
