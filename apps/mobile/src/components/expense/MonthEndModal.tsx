import React, { FC, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Month, MonthSummary } from '@repo/shared-types';
import { CalendarCheck, X, CheckCircle2, ArrowRight } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { formatPaisa, paisaToRupees, rupeesToPaisa } from '../../utils/currency';
import { IconCircle } from '../common/IconCircle';

interface MonthEndModalProps {
  isOpen: boolean;
  currentMonth: Month | null;
  onClose: () => void;
  onEndMonth: (nextBudgetInPaisa: number) => Promise<MonthSummary>;
}

export const MonthEndModal: FC<MonthEndModalProps> = ({
  isOpen,
  currentMonth,
  onClose,
  onEndMonth,
}) => {
  const [nextRupees, setNextRupees] = useState(() =>
    currentMonth ? paisaToRupees(currentMonth.budget).toString() : '100000',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<MonthSummary | null>(null);

  if (!isOpen || !currentMonth) return null;

  const handleSubmit = async () => {
    const parsed = parseFloat(nextRupees);
    if (isNaN(parsed) || parsed < 0) return;

    try {
      setIsSubmitting(true);
      const nextBudgetInPaisa = rupeesToPaisa(parsed);
      const res = await onEndMonth(nextBudgetInPaisa);
      setSummary(res);
    } catch (err) {
      console.error('Failed to end cycle:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSummary(null);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <IconCircle
                    size={36}
                    color={summary ? Colors.light.incomePositive : Colors.light.primary}
                  >
                    {summary ? (
                      <CheckCircle2 size={20} color={Colors.light.incomePositive} />
                    ) : (
                      <CalendarCheck size={20} color={Colors.light.primary} />
                    )}
                  </IconCircle>
                  <View>
                    <Text style={styles.title}>
                      {summary ? 'Cycle Completed!' : `End ${currentMonth.label}`}
                    </Text>
                    <Text style={styles.subtitle}>
                      {summary
                        ? 'Here is your final financial breakdown'
                        : 'Close this cycle and open your next billing period'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <X size={20} color={Colors.light.textSecondary} />
                </TouchableOpacity>
              </View>

              {!summary ? (
                <View style={styles.content}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Current Total Budget</Text>
                    <Text style={styles.statValue}>{formatPaisa(currentMonth.budget)}</Text>
                    <Text style={styles.statNote}>
                      Closing this cycle sets its end date to now and rolls your ledger forward
                      seamlessly with 0 gap (Spec A.6).
                    </Text>
                  </View>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Next Cycle Budget (in PKR)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={nextRupees}
                      onChangeText={setNextRupees}
                      placeholder="e.g. 100000"
                      placeholderTextColor={Colors.light.textSecondary}
                    />
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelBtn]}
                      onPress={handleClose}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.primaryBtn, isSubmitting && styles.disabledBtn]}
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.primaryBtnText}>
                        {isSubmitting ? 'Closing...' : 'Close & Rollover'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <ScrollView style={styles.summaryContent}>
                  <View style={styles.summaryStatsRow}>
                    <View style={styles.summaryStat}>
                      <Text style={styles.statLabel}>Total Spent</Text>
                      <Text style={[styles.statValue, { color: Colors.light.expenseAlert }]}>
                        {formatPaisa(summary.totalSpent)}
                      </Text>
                    </View>
                    <View style={styles.summaryStat}>
                      <Text style={styles.statLabel}>Remaining</Text>
                      <Text
                        style={[
                          styles.statValue,
                          {
                            color:
                              summary.remaining < 0
                                ? Colors.light.expenseAlert
                                : Colors.light.incomePositive,
                          },
                        ]}
                      >
                        {formatPaisa(summary.remaining)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.breakdownHeader}>Category Breakdown</Text>
                  {summary.categoryBreakdown.map((cat) => (
                    <View key={cat.categoryId} style={styles.categoryRow}>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.catName}>{cat.categoryName}</Text>
                        <Text style={styles.catSpent}>{formatPaisa(cat.total)}</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(cat.percentage, 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.catPercentage}>{cat.percentage.toFixed(1)}%</Text>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                    <Text style={styles.doneButtonText}>Done</Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 19, 17, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    gap: 14,
  },
  statBox: {
    backgroundColor: Colors.light.surfaceRaised,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.textPrimary,
    marginTop: 4,
    marginBottom: 6,
  },
  statNote: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 16,
  },
  inputSection: {
    gap: 6,
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
    fontSize: 15,
    color: Colors.light.textPrimary,
    backgroundColor: Colors.light.surfaceRaised,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textPrimary,
  },
  primaryBtn: {
    backgroundColor: Colors.light.primary,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryContent: {
    marginTop: 4,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryStat: {
    flex: 1,
    backgroundColor: Colors.light.surfaceRaised,
    borderRadius: 10,
    padding: 10,
  },
  breakdownHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textPrimary,
    marginBottom: 8,
  },
  categoryRow: {
    marginBottom: 10,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catName: {
    fontSize: 13,
    color: Colors.light.textPrimary,
  },
  catSpent: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textPrimary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.light.surfaceRaised,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
  },
  catPercentage: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  doneButton: {
    height: 44,
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 10,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
