import React, { FC, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Category } from '@repo/shared-types';
import { Plus, Calendar, Tag, DollarSign, Edit3 } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { getNowPktString, pktToUtcIso } from '../../utils/date';
import { rupeesToPaisa } from '../../utils/currency';

interface QuickExpenseFormProps {
  categories: Category[];
  onSubmit: (data: {
    content: string;
    amount: number;
    categoryId?: string;
    occurredAt: string;
  }) => Promise<void>;
}

export const QuickExpenseForm: FC<QuickExpenseFormProps> = ({
  categories,
  onSubmit,
}) => {
  const { colors } = useTheme();
  const [content, setContent] = useState('');
  const [rupees, setRupees] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
    categories[0]?.id,
  );
  const [pktDateTime, setPktDateTime] = useState(getNowPktString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const parsedRupees = parseFloat(rupees);
    if (!content.trim() || isNaN(parsedRupees) || parsedRupees <= 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const utcOccurredAt = pktToUtcIso(pktDateTime);
      const amountInPaisa = rupeesToPaisa(parsedRupees);

      await onSubmit({
        content: content.trim(),
        amount: amountInPaisa,
        categoryId: selectedCategoryId,
        occurredAt: utcOccurredAt,
      });

      setContent('');
      setRupees('');
      setPktDateTime(getNowPktString());
    } catch (err) {
      console.error('Failed to submit expense:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Quick Entry</Text>

      {/* Description / Content */}
      <View style={styles.inputGroup}>
        <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <Edit3 size={16} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="Expense description (e.g. Lunch with team)"
            placeholderTextColor={colors.textSecondary}
            value={content}
            onChangeText={setContent}
          />
        </View>
      </View>

      {/* Amount in PKR & Date */}
      <View style={styles.row}>
        <View style={[styles.inputWrapper, { flex: 1, backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <DollarSign size={16} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="Amount in PKR"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={rupees}
            onChangeText={setRupees}
          />
        </View>

        <View style={[styles.inputWrapper, { flex: 1, backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <Calendar size={16} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="YYYY-MM-DDTHH:mm"
            placeholderTextColor={colors.textSecondary}
            value={pktDateTime}
            onChangeText={setPktDateTime}
          />
        </View>
      </View>

      {/* Categories chips */}
      <View style={styles.categorySection}>
        <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                  isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedCategoryId(cat.id)}
                activeOpacity={0.7}
              >
                <Tag
                  size={12}
                  color={isSelected ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.textPrimary },
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          { backgroundColor: colors.primary },
          (!content.trim() || !rupees || isSubmitting) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!content.trim() || !rupees || isSubmitting}
        activeOpacity={0.8}
        accessibilityLabel="Add Expense"
      >
        <Plus size={18} color="#FFFFFF" />
        <Text style={styles.submitButtonText}>
          {isSubmitting ? 'Adding...' : 'Add Expense'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  categorySection: {
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  chipText: {
    fontSize: 12,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitButton: {
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
