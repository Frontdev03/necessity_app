import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { AppInput } from 'src/components/AppInput';
import { AppButton } from 'src/components/AppButton';
import { changePassword, getNecessityErrorMessage } from 'src/services/authNecessity';
import { colors } from 'src/theme/colors';
import { spacing } from 'src/theme/spacing';
import { fontSize, fontWeight } from 'src/theme/fonts';

export const SecurityScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!currentPassword.trim()) next.current = 'Current password is required';
    if (!newPassword.trim()) next.new = 'New password is required';
    else if (newPassword.length < 6) next.new = 'Password must be at least 6 characters';
    else if (newPassword === currentPassword) next.new = 'New password must be different from current password';
    if (newPassword !== confirmPassword) next.confirm = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validate() || isSubmitting) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      await changePassword({
        old_password: currentPassword,
        new_password: newPassword,
      });
      Toast.show({ type: 'success', text1: 'Password updated', text2: 'Your password has been changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Change password failed',
        text2: getNecessityErrorMessage(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="chevron-left" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Security
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.mainContent}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Change password</Text>
            <View style={styles.card}>
              <AppInput
                label="Current password"
                value={currentPassword}
                onChangeText={(t) => { setCurrentPassword(t); setErrors((e) => ({ ...e, current: undefined, new: undefined })); }}
                placeholder="Enter current password"
                leftIcon="lock-outline"
                secureTextEntry
                error={errors.current}
              />
              <AppInput
                label="New password"
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); setErrors((e) => ({ ...e, new: undefined, confirm: undefined })); }}
                placeholder="Enter new password"
                leftIcon="lock-outline"
                secureTextEntry
                error={errors.new}
              />
              <AppInput
                label="Confirm new password"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setErrors((e) => ({ ...e, confirm: undefined })); }}
                placeholder="Confirm new password"
                leftIcon="lock-outline"
                secureTextEntry
                error={errors.confirm}
              />
              <AppButton
                title="Update password"
                onPress={handleChangePassword}
                loading={isSubmitting}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Two-factor authentication</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Icon name="shield-check-outline" size={22} color={colors.primary} />
                <Text style={styles.rowLabel}>Add an extra layer of security</Text>
              </View>
              <Text style={styles.hint}>
                Two-factor authentication is not yet available. It will be enabled in a future update.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semiBold,
    color: colors.white,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  headerSpacer: {
    width: 36,
  },
  mainContent: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  rowLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
