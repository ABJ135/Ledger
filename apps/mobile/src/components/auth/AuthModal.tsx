import React, { useState, useEffect, FC } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Sparkles,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export type MobileAuthMode = 'login' | 'signup' | 'upgrade';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: MobileAuthMode;
  canDismiss?: boolean;
}

export const AuthModal: FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  canDismiss = true,
}) => {
  const { isGuest, login, signup, upgradeGuest, loginAsGuest } = useAuth();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(
    initialMode === 'upgrade' ? 'signup' : initialMode
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (canDismiss) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode === 'upgrade' ? 'signup' : initialMode);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError(null);
      setShowPassword(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (activeTab === 'signup' && confirmPassword && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (activeTab === 'login') {
        await login({ email: trimmedEmail, password });
      } else if (isGuest) {
        // Automatically upgrades guest session preserving all data
        await upgradeGuest({ email: trimmedEmail, password });
      } else {
        await signup({ email: trimmedEmail, password });
      }
      onClose();
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.message ||
        (activeTab === 'login'
          ? 'Invalid email or password. Please try again.'
          : 'Failed to process request. Please check credentials.');
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestDemo = async () => {
    try {
      setIsSubmitting(true);
      await loginAsGuest();
      onClose();
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to start guest session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        {canDismiss && (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        )}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={styles.titleRow}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  {activeTab === 'signup' && isGuest ? (
                    <Sparkles size={20} color={colors.primary} />
                  ) : (
                    <UserCheck size={20} color={colors.primary} />
                  )}
                </View>

                <View style={styles.headerText}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {activeTab === 'login' && 'Sign in to Ledger'}
                    {activeTab === 'signup' && 'Create your Account'}
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {activeTab === 'login' && 'Access your active cycles and expenses.'}
                    {activeTab === 'signup' &&
                      (isGuest
                        ? 'Save your active cycles and sync across devices.'
                        : 'Permanent cloud account across devices.')}
                  </Text>
                </View>

                {canDismiss && (
                  <TouchableOpacity
                    style={[styles.closeButton, { backgroundColor: colors.surfaceRaised }]}
                    onPress={handleClose}
                    activeOpacity={0.7}
                  >
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Clean 2-Tab Switcher: Sign In & Sign Up */}
              <View
                style={[
                  styles.tabBar,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                ]}
              >
                    <TouchableOpacity
                      style={[
                        styles.tabItem,
                        activeTab === 'login' && [
                          styles.tabItemActive,
                          { backgroundColor: colors.surface },
                        ],
                      ]}
                      onPress={() => {
                        setActiveTab('login');
                        setError(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          {
                            color:
                              activeTab === 'login'
                                ? colors.primary
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        Sign In
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.tabItem,
                        activeTab === 'signup' && [
                          styles.tabItemActive,
                          { backgroundColor: colors.surface },
                        ],
                      ]}
                      onPress={() => {
                        setActiveTab('signup');
                        setError(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          {
                            color:
                              activeTab === 'signup'
                                ? colors.primary
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        Sign Up
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Form Content */}
                <ScrollView
                  style={styles.scrollBody}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Reassurance banner for guest users on sign up tab */}
                  {activeTab === 'signup' && isGuest && (
                    <View
                      style={[
                        styles.infoAlert,
                        {
                          backgroundColor: isDark
                            ? 'rgba(184, 134, 46, 0.15)'
                            : '#FEF9EE',
                          borderColor: isDark
                            ? 'rgba(184, 134, 46, 0.3)'
                            : '#F4DE9C',
                        },
                      ]}
                    >
                      <ShieldCheck size={16} color={colors.warning} />
                      <Text
                        style={[
                          styles.infoAlertText,
                          { color: isDark ? '#F5D38A' : '#7D5A12' },
                        ]}
                      >
                        Zero data will be lost. All current cycles and expenses will be saved to your new account.
                      </Text>
                    </View>
                  )}

                  {/* Error display */}
                  {error && (
                    <View
                      style={[
                        styles.errorAlert,
                        {
                          backgroundColor: isDark
                            ? 'rgba(232, 120, 95, 0.15)'
                            : '#FDF2F0',
                          borderColor: isDark
                            ? 'rgba(232, 120, 95, 0.3)'
                            : '#F7C6BD',
                        },
                      ]}
                    >
                      <AlertCircle size={16} color={colors.expenseAlert} />
                      <Text
                        style={[
                          styles.errorAlertText,
                          { color: colors.expenseAlert },
                        ]}
                      >
                        {error}
                      </Text>
                    </View>
                  )}

                  {/* Email Input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                      EMAIL ADDRESS
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: colors.surfaceRaised,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Mail size={16} color={colors.textSecondary} />
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        placeholder="name@example.com"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={email}
                        onChangeText={setEmail}
                      />
                    </View>
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                      PASSWORD
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: colors.surfaceRaised,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Lock size={16} color={colors.textSecondary} />
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        placeholder="••••••••"
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        value={password}
                        onChangeText={setPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeBtn}
                      >
                        {showPassword ? (
                          <EyeOff size={16} color={colors.textSecondary} />
                        ) : (
                          <Eye size={16} color={colors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
                      Must be at least 8 characters.
                    </Text>
                  </View>

                  {/* Confirm Password (Signup only) */}
                  {activeTab === 'signup' && (
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                        CONFIRM PASSWORD
                      </Text>
                      <View
                        style={[
                          styles.inputWrapper,
                          {
                            backgroundColor: colors.surfaceRaised,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Lock size={16} color={colors.textSecondary} />
                        <TextInput
                          style={[styles.input, { color: colors.textPrimary }]}
                          placeholder="••••••••"
                          placeholderTextColor={colors.textSecondary}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                        />
                      </View>
                    </View>
                  )}

                  {/* Submit CTA */}
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      { backgroundColor: colors.primary },
                      isSubmitting && { opacity: 0.6 },
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={styles.btnContent}>
                        <Text style={styles.submitButtonText}>
                          {activeTab === 'login'
                            ? 'Sign In'
                            : isGuest
                              ? 'Create Account & Save Ledger'
                              : 'Create Account'}
                        </Text>
                        <ArrowRight size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Mode switch helper */}
                  <View style={styles.switchRow}>
                    {activeTab === 'login' ? (
                      <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                        Don't have an account?{' '}
                        <Text
                          style={{ color: colors.primary, fontWeight: '700' }}
                          onPress={() => {
                            setActiveTab('signup');
                            setError(null);
                          }}
                        >
                          Sign Up
                        </Text>
                      </Text>
                    ) : (
                      <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                        Already have an account?{' '}
                        <Text
                          style={{ color: colors.primary, fontWeight: '700' }}
                          onPress={() => {
                            setActiveTab('login');
                            setError(null);
                          }}
                        >
                          Sign In
                        </Text>
                      </Text>
                    )}
                  </View>

                  {/* Guest Fallback */}
                  {!isGuest && (
                    <TouchableOpacity
                      onPress={handleGuestDemo}
                      disabled={isSubmitting}
                      style={styles.guestLink}
                    >
                      <Text style={[styles.guestLinkText, { color: colors.textSecondary }]}>
                        Or explore without an account (Guest Mode)
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
          </KeyboardAvoidingView>
        </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 19, 17, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    marginTop: 14,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 16,
  },
  tabItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollBody: {
    maxHeight: 460,
  },
  scrollContent: {
    padding: 20,
    gap: 14,
  },
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoAlertText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorAlertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  eyeBtn: {
    padding: 4,
  },
  inputHint: {
    fontSize: 11,
  },
  submitButton: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  switchRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  switchText: {
    fontSize: 12,
  },
  guestLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  guestLinkText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
