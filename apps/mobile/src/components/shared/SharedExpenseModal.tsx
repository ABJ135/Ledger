import React, { FC, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Users, X, Plus, LogIn, Check, ChevronRight } from 'lucide-react-native';
import {
  useGetMySharedExpensesQuery,
  useCreateSharedExpenseMutation,
  useJoinSharedExpenseMutation,
} from '@repo/api-client';
import { SharedExpense } from '@repo/shared-types';
import { useTheme } from '../../context/ThemeContext';
import { IconCircle } from '../common/IconCircle';

interface SharedExpenseModalProps {
  isOpen: boolean;
  selectedId: string | null;
  onSelectSharedExpense: (group: SharedExpense) => void;
  onClose: () => void;
}

export const SharedExpenseModal: FC<SharedExpenseModalProps> = ({
  isOpen,
  selectedId,
  onSelectSharedExpense,
  onClose,
}) => {
  const { colors } = useTheme();
  const { data: myGroups = [], refetch } = useGetMySharedExpensesQuery();
  const [createSharedExpense] = useCreateSharedExpenseMutation();
  const [joinSharedExpense] = useJoinSharedExpenseMutation();

  const [mode, setMode] = useState<'list' | 'create' | 'join'>('list');
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!groupName.trim()) return;

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await createSharedExpense({ name: groupName.trim() }).unwrap();
      await refetch();
      onSelectSharedExpense(res);
      setGroupName('');
      setMode('list');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (joinCode.trim().length !== 8) return;

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await joinSharedExpense({ code: joinCode.trim().toUpperCase() }).unwrap();
      await refetch();
      onSelectSharedExpense(res);
      setJoinCode('');
      setMode('list');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Invalid or expired invite code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <IconCircle size={36} color={colors.primary}>
                <Users size={18} color={colors.primary} />
              </IconCircle>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Shared Expenses</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Collaborative joint ledgers</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <View style={[styles.errorBox, { backgroundColor: colors.expenseAlert + '15' }]}>
              <Text style={[styles.errorText, { color: colors.expenseAlert }]}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Mode: List */}
          {mode === 'list' && (
            <View style={styles.body}>
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                Your Groups ({myGroups.length})
              </Text>

              <ScrollView style={styles.groupsScroll}>
                {myGroups.length === 0 ? (
                  <View style={[styles.emptyBox, { backgroundColor: colors.surfaceRaised }]}>
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No shared groups yet</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                      Create a shared group or enter an 8-character code to join one.
                    </Text>
                  </View>
                ) : (
                  myGroups.map((group) => {
                    const isSelected = selectedId === group.id;
                    return (
                      <TouchableOpacity
                        key={group.id}
                        style={[
                          styles.groupItem,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                          isSelected && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                        ]}
                        onPress={() => onSelectSharedExpense(group)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.groupLeft}>
                          <View
                            style={[
                              styles.groupLetterCircle,
                              { backgroundColor: colors.surfaceRaised },
                              isSelected && { backgroundColor: colors.primary },
                            ]}
                          >
                            <Text
                              style={[
                                styles.groupLetter,
                                { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                              ]}
                            >
                              {group.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={[styles.groupName, { color: colors.textPrimary }]}>{group.name}</Text>
                            <Text style={[styles.groupCode, { color: colors.textSecondary }]}>Code: {group.code}</Text>
                          </View>
                        </View>

                        {isSelected ? (
                          <View style={[styles.activeBadge, { backgroundColor: colors.surface }]}>
                            <Check size={12} color={colors.primary} />
                            <Text style={[styles.activeText, { color: colors.primary }]}>Active</Text>
                          </View>
                        ) : (
                          <ChevronRight size={16} color={colors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => setMode('join')}
                  activeOpacity={0.7}
                >
                  <LogIn size={15} color={colors.textPrimary} />
                  <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>Join with Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  onPress={() => setMode('create')}
                  activeOpacity={0.7}
                >
                  <Plus size={15} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Create Group</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Mode: Create */}
          {mode === 'create' && (
            <View style={styles.body}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Group Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="e.g. Vacation Trip, Apartment"
                placeholderTextColor={colors.textSecondary}
                value={groupName}
                onChangeText={setGroupName}
                autoFocus
              />
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                A unique 8-character invite code will be automatically generated.
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => setMode('list')}
                >
                  <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary }, isSubmitting && styles.disabledBtn]}
                  onPress={handleCreate}
                  disabled={isSubmitting || !groupName.trim()}
                >
                  <Text style={styles.primaryBtnText}>
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Mode: Join */}
          {mode === 'join' && (
            <View style={styles.body}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>8-Character Group Code</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.codeInput,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.border, color: colors.textPrimary },
                ]}
                placeholder="XXXXXXXX"
                placeholderTextColor={colors.textSecondary}
                maxLength={8}
                autoCapitalize="characters"
                value={joinCode}
                onChangeText={(val) => setJoinCode(val.toUpperCase())}
              />
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Enter the code given by the group administrator.
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => setMode('list')}
                >
                  <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary }, isSubmitting && styles.disabledBtn]}
                  onPress={handleJoin}
                  disabled={isSubmitting || joinCode.trim().length !== 8}
                >
                  <Text style={styles.primaryBtnText}>
                    {isSubmitting ? 'Joining...' : 'Join Group'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 19, 17, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  errorBox: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  body: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupsScroll: {
    maxHeight: 200,
  },
  emptyBox: {
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  groupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupLetterCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupLetter: {
    fontSize: 13,
    fontWeight: '700',
  },
  groupName: {
    fontSize: 14,
    fontWeight: '600',
  },
  groupCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  fieldLabel: {
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
  codeInput: {
    fontFamily: 'monospace',
    letterSpacing: 2,
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 11.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryBtn: {
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
