import React, { FC, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import {
  Shield,
  LogOut,
  CheckCircle2,
  UserCheck,
  Sun,
  Moon,
  Smartphone,
  Sparkles,
  LogIn,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../theme/colors';
import { IconCircle } from '../components/common/IconCircle';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { AuthModal, MobileAuthMode } from '../components/auth/AuthModal';

export const AccountScreen: FC = () => {
  const { user, isGuest, logout } = useAuth();
  const { mode, colors, setMode, isDark, toggleTheme } = useTheme();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<MobileAuthMode>('login');
  const [isSignoutConfirmOpen, setIsSignoutConfirmOpen] = useState(false);

  const handleOpenAuth = (targetMode: MobileAuthMode) => {
    setAuthMode(targetMode);
    setIsAuthModalOpen(true);
  };

  const handleConfirmLogout = async () => {
    setIsSignoutConfirmOpen(false);
    await logout();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.topBarTitleArea}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Account & Settings</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isGuest ? 'Guest Session • Cloud Sync Inactive' : 'Connected • Multi-Device Sync Active'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.themeToggleBtn, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isDark ? "Switch to light theme" : "Switch to dark theme"}
        >
          {isDark ? <Sun size={15} color={colors.primary} /> : <Moon size={15} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Profile Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <IconCircle size={44} color={isGuest ? colors.warning : colors.primary}>
              {isGuest ? (
                <Sparkles size={22} color={isGuest ? colors.warning : colors.primary} />
              ) : (
                <UserCheck size={22} color={colors.primary} />
              )}
            </IconCircle>
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: colors.textPrimary }]}>
                {user?.email || 'Guest Explorer'}
              </Text>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isGuest
                        ? isDark
                          ? 'rgba(184, 134, 46, 0.15)'
                          : '#FEF9EE'
                        : isDark
                          ? 'rgba(31, 138, 112, 0.15)'
                          : '#EAF7F3',
                    },
                  ]}
                >
                  <CheckCircle2
                    size={12}
                    color={isGuest ? colors.warning : colors.incomePositive}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: isGuest ? colors.warning : colors.incomePositive },
                    ]}
                  >
                    {isGuest ? 'Temporary Session' : 'Verified Cloud Account'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Guest User CTA section */}
          {isGuest ? (
            <View style={styles.guestSection}>
              <View
                style={[
                  styles.guestWarningBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(184, 134, 46, 0.12)'
                      : '#FFF9E6',
                    borderColor: isDark
                      ? 'rgba(184, 134, 46, 0.3)'
                      : '#F5DE9C',
                  },
                ]}
              >
                <AlertCircle size={16} color={colors.warning} />
                <Text
                  style={[
                    styles.guestWarningText,
                    { color: isDark ? '#F5D38A' : '#7D5A12' },
                  ]}
                >
                  Your cycles and expenses are stored locally. Save them to a cloud account so you never lose your records.
                </Text>
              </View>

              <View style={styles.guestActionsRow}>
                {/* Save Data & Upgrade */}
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleOpenAuth('upgrade')}
                  activeOpacity={0.8}
                >
                  <Sparkles size={16} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>Save Ledger & Register</Text>
                  <ArrowRight size={14} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Sign In Existing */}
                <TouchableOpacity
                  style={[
                    styles.secondaryActionBtn,
                    {
                      backgroundColor: colors.surfaceRaised,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleOpenAuth('login')}
                  activeOpacity={0.7}
                >
                  <LogIn size={16} color={colors.textPrimary} />
                  <Text style={[styles.secondaryActionBtnText, { color: colors.textPrimary }]}>
                    Switch to Existing Account
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.registeredSection}>
              <View style={[styles.syncStatusRow, { borderTopColor: colors.border }]}>
                <View style={styles.syncInfo}>
                  <ShieldCheck size={16} color={colors.incomePositive} />
                  <Text style={[styles.syncText, { color: colors.textSecondary }]}>
                    Continuous cloud synchronization active
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.logoutSmallBtn,
                    { borderColor: colors.expenseAlert },
                  ]}
                  onPress={() => setIsSignoutConfirmOpen(true)}
                  activeOpacity={0.7}
                >
                  <LogOut size={14} color={colors.expenseAlert} />
                  <Text style={[styles.logoutSmallText, { color: colors.expenseAlert }]}>
                    Sign Out
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Theme Appearance Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.infoHeader}>
            <Sun size={18} color={colors.primary} />
            <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Appearance & Theme</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Deep Teal & Warm Ivory editorial theme system
          </Text>

          <View style={styles.themeSelectorRow}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: colors.surface, borderColor: colors.border },
                mode === 'light' && [
                  styles.themeOptionActive,
                  { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                ],
              ]}
              onPress={() => setMode('light')}
              activeOpacity={0.7}
            >
              <Sun size={16} color={mode === 'light' ? colors.primary : colors.textSecondary} />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: mode === 'light' ? colors.primary : colors.textSecondary },
                ]}
              >
                Light
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: colors.surface, borderColor: colors.border },
                mode === 'dark' && [
                  styles.themeOptionActive,
                  { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                ],
              ]}
              onPress={() => setMode('dark')}
              activeOpacity={0.7}
            >
              <Moon size={16} color={mode === 'dark' ? colors.primary : colors.textSecondary} />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: mode === 'dark' ? colors.primary : colors.textSecondary },
                ]}
              >
                Dark
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: colors.surface, borderColor: colors.border },
                mode === 'system' && [
                  styles.themeOptionActive,
                  { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                ],
              ]}
              onPress={() => setMode('system')}
              activeOpacity={0.7}
            >
              <Smartphone size={16} color={mode === 'system' ? colors.primary : colors.textSecondary} />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: mode === 'system' ? colors.primary : colors.textSecondary },
                ]}
              >
                System
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security & Ledger Architecture Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.infoHeader}>
            <Shield size={18} color={colors.primary} />
            <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
              Ledger Architecture & Standards
            </Text>
          </View>
          <Text style={[styles.infoBody, { color: colors.textSecondary }]}>
            • Standard Integer Paisa: zero floating-point rounding errors
            {'\n'}• Pakistan Standard Time (PKT / UTC+5): strict cycle rollover boundaries
            {'\n'}• Server-Authoritative Calculations: continuous cycles with zero timeline gaps
            {'\n'}• Cross-Platform Parity: seamless state synchronization across Web & Mobile
          </Text>
        </View>
      </ScrollView>

      {/* Sign Out Confirmation Dialog */}
      <ConfirmModal
        isOpen={isSignoutConfirmOpen}
        title="Sign Out"
        description={`Are you sure you want to sign out of ${user?.email || 'your account'}? You can sign back in anytime with your email and password.`}
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsSignoutConfirmOpen(false)}
      />

      {/* Auth Modal (Login / Signup / Upgrade) */}
      <AuthModal
        isOpen={isAuthModalOpen || !user}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
        canDismiss={Boolean(user)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  topBarTitleArea: {
    flex: 1,
    marginRight: 12,
  },
  themeToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  guestSection: {
    marginTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 14,
  },
  guestWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  guestWarningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  guestActionsRow: {
    gap: 10,
  },
  primaryActionBtn: {
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  registeredSection: {
    marginTop: 14,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 14,
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  syncText: {
    fontSize: 12,
  },
  logoutSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutSmallText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  infoBody: {
    fontSize: 13,
    lineHeight: 22,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  themeOption: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  themeOptionActive: {
    borderWidth: 1.5,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
