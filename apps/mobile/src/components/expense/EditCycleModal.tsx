import React, { FC, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Calendar, DollarSign, Sparkles, X, Plus, Minus } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
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

export const EditCycleModal: FC<EditCycleModalProps> = ({
  isOpen,
  onClose,
  cycle,
  onSave,
}) => {
  const { colors } = useTheme();
  const [label, setLabel] = useState('');
  const [budgetPkr, setBudgetPkr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLabel(cycle?.label || '');
      setBudgetPkr(
        cycle?.budget !== undefined ? String(paisaToRupees(cycle.budget)) : '100000'
      );
      setError('');
    }
  }, [isOpen, cycle]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
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

  const adjustBudget = (deltaPkr: number) => {
    const current = parseFloat(budgetPkr) || 0;
    const updated = Math.max(0, current + deltaPkr);
    setBudgetPkr(String(updated));
    setError('');
  };

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Touch outside to dismiss */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
                  <Calendar size={18} color={colors.primary} />
                </View>
                <View style={styles.titleContainer}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Cycle & Budget</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Adjust cycle name and budget limit.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityLabel="Close"
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.body}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {error ? (
                <View style={[styles.errorBox, { backgroundColor: colors.expenseAlert + '15', borderColor: colors.expenseAlert + '40' }]}>
                  <Text style={[styles.errorText, { color: colors.expenseAlert }]}>{error}</Text>
                </View>
              ) : null}

              {/* Cycle Label */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Cycle Label / Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, color: colors.textPrimary }]}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="e.g. September 2026, Week 3"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  Name it whatever fits your schedule (Monthly, Bi-weekly, Custom).
                </Text>
              </View>

              {/* Budget in PKR */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Cycle Budget Allowance (PKR)</Text>
                <View style={[styles.currencyInputWrapper, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
                  <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>Rs</Text>
                  <TextInput
                    style={[styles.currencyInput, { color: colors.textPrimary }]}
                    value={budgetPkr}
                    onChangeText={setBudgetPkr}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                {/* Quick adjustments (+10k, +5k, -5k) */}
                <View style={styles.adjustRow}>
                  <TouchableOpacity
                    style={[styles.adjustPill, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
                    onPress={() => adjustBudget(10000)}
                    activeOpacity={0.7}
                  >
                    <Plus size={11} color={colors.primary} />
                    <Text style={[styles.adjustPillText, { color: colors.primary }]}>Rs 10,000</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adjustPill, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
                    onPress={() => adjustBudget(5000)}
                    activeOpacity={0.7}
                  >
                    <Plus size={11} color={colors.primary} />
                    <Text style={[styles.adjustPillText, { color: colors.primary }]}>Rs 5,000</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adjustPill, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
                    onPress={() => adjustBudget(-5000)}
                    activeOpacity={0.7}
                  >
                    <Minus size={11} color={colors.expenseAlert} />
                    <Text style={[styles.adjustPillText, { color: colors.expenseAlert }]}>Rs 5,000</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick presets */}
                <View style={styles.presetsSection}>
                  <View style={styles.presetsHeader}>
                    <Sparkles size={13} color={colors.primary} />
                    <Text style={[styles.presetsTitle, { color: colors.textSecondary }]}>Standard Presets:</Text>
                  </View>
                  <View style={styles.presetsGrid}>
                    {[
                      { label: 'Weekly (Rs 25k)', amount: 25000 },
                      { label: 'Bi-Weekly (Rs 50k)', amount: 50000 },
                      { label: 'Standard (Rs 100k)', amount: 100000 },
                      { label: 'Upper (Rs 150k)', amount: 150000 },
                    ].map((preset) => {
                      const isActive = budgetPkr === String(preset.amount);
                      return (
                        <TouchableOpacity
                          key={preset.amount}
                          style={[
                            styles.presetBtn,
                            { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                            isActive && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                          ]}
                          onPress={() => applyPreset(preset.amount)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.presetBtnText,
                              { color: colors.textSecondary },
                              isActive && { color: colors.primary, fontWeight: '700' },
                            ]}
                          >
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Footer buttons */}
            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }, isSubmitting && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <DollarSign size={15} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save Budget</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardAvoid: {
    width: '100%',
    maxWidth: 420,
    zIndex: 10,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  errorBox: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 11,
    marginTop: 4,
  },
  currencyInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  currencyInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '700',
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  adjustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  adjustPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  presetsSection: {
    marginTop: 12,
  },
  presetsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  presetsTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  presetBtnText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
