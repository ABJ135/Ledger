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
import { Users, X, Plus, LogIn, Check, ChevronRight } from 'lucide-react-native';
import {
  useGetMySharedExpensesQuery,
  useCreateSharedExpenseMutation,
  useJoinSharedExpenseMutation,
} from '@repo/api-client';
import { SharedExpense } from '@repo/shared-types';
import { Colors } from '../../theme/colors';
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
    } catch (err: any) {
      setErrorMsg(err.data?.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await joinSharedExpense({ code: joinCode.trim() }).unwrap();
      await refetch();
      onSelectSharedExpense(res);
      setJoinCode('');
      setMode('list');
    } catch (err: any) {
      setErrorMsg(err.data?.message || 'Invalid or expired code');
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
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <IconCircle size={36} color={Colors.light.primary}>
                    <Users size={18} color={Colors.light.primary} />
                  </IconCircle>
                  <View>
                    <Text style={styles.title}>Shared Expenses</Text>
                    <Text style={styles.subtitle}>Collaborative joint ledgers</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={Colors.light.textSecondary} />
                </TouchableOpacity>
              </View>

              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {/* Mode: List */}
              {mode === 'list' && (
                <View style={styles.body}>
                  <Text style={styles.sectionHeader}>
                    Your Groups ({myGroups.length})
                  </Text>

                  <ScrollView style={styles.groupsScroll}>
                    {myGroups.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Text style={styles.emptyTitle}>No shared groups yet</Text>
                        <Text style={styles.emptySubtitle}>
                          Create a shared group or enter an 8-character code to join one.
                        </Text>
                      </View>
                    ) : (
                      myGroups.map((group) => {
                        const isSelected = selectedId === group.id;
                        return (
                          <TouchableOpacity
                            key={group.id}
                            style={[styles.groupItem, isSelected && styles.selectedGroupItem]}
                            onPress={() => onSelectSharedExpense(group)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.groupLeft}>
                              <View
                                style={[
                                  styles.groupLetterCircle,
                                  isSelected && styles.selectedLetterCircle,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.groupLetter,
                                    isSelected && styles.selectedLetter,
                                  ]}
                                >
                                  {group.name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View>
                                <Text style={styles.groupName}>{group.name}</Text>
                                <Text style={styles.groupCode}>Code: {group.code}</Text>
                              </View>
                            </View>

                            {isSelected ? (
                              <View style={styles.activeBadge}>
                                <Check size={12} color={Colors.light.primary} />
                                <Text style={styles.activeText}>Active</Text>
                              </View>
                            ) : (
                              <ChevronRight size={16} color={Colors.light.textSecondary} />
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.primaryBtn]}
                      onPress={() => setMode('create')}
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Create</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btn, styles.secondaryBtn]}
                      onPress={() => setMode('join')}
                    >
                      <LogIn size={16} color={Colors.light.textPrimary} />
                      <Text style={styles.secondaryBtnText}>Join via Code</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Mode: Create */}
              {mode === 'create' && (
                <View style={styles.body}>
                  <Text style={styles.fieldLabel}>Group Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Flatmates, Trip to Hunza"
                    placeholderTextColor={Colors.light.textSecondary}
                    value={groupName}
                    onChangeText={setGroupName}
                  />
                  <Text style={styles.helperText}>
                    An 8-character invite code will be generated automatically.
                  </Text>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.secondaryBtn]}
                      onPress={() => setMode('list')}
                    >
                      <Text style={styles.secondaryBtnText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btn, styles.primaryBtn, isSubmitting && styles.disabledBtn]}
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
                  <Text style={styles.fieldLabel}>8-Character Join Code</Text>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="e.g. AZLDNJZQ"
                    placeholderTextColor={Colors.light.textSecondary}
                    maxLength={8}
                    autoCapitalize="characters"
                    value={joinCode}
                    onChangeText={(val) => setJoinCode(val.toUpperCase())}
                  />
                  <Text style={styles.helperText}>
                    Enter the code given by the group administrator.
                  </Text>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.secondaryBtn]}
                      onPress={() => setMode('list')}
                    >
                      <Text style={styles.secondaryBtnText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btn, styles.primaryBtn, isSubmitting && styles.disabledBtn]}
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
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  errorBox: {
    backgroundColor: 'rgba(193, 84, 60, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: Colors.light.expenseAlert,
    fontWeight: '500',
  },
  body: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupsScroll: {
    maxHeight: 200,
  },
  emptyBox: {
    backgroundColor: Colors.light.surfaceRaised,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
    marginBottom: 8,
  },
  selectedGroupItem: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primarySoft,
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
    backgroundColor: Colors.light.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLetterCircle: {
    backgroundColor: Colors.light.primary,
  },
  groupLetter: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  selectedLetter: {
    color: '#FFFFFF',
  },
  groupName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textPrimary,
  },
  groupCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  fieldLabel: {
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
  codeInput: {
    fontFamily: 'monospace',
    letterSpacing: 2,
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 11.5,
    color: Colors.light.textSecondary,
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
  primaryBtn: {
    backgroundColor: Colors.light.primary,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  secondaryBtnText: {
    color: Colors.light.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
