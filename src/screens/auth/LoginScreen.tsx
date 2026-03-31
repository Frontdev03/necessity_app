import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import { loginThunk, refreshAuthProfileThunk } from 'src/store/authSlice';

import type { AppDispatch } from 'src/store';
import type { AuthStackParamList } from 'src/navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppButton } from 'src/components/AppButton';
import { AppInput } from 'src/components/AppInput';
import { ForgotPasswordModal } from 'src/components/ForgotPasswordModal';
import { colors } from 'src/theme/colors';
import { spacing } from 'src/theme/spacing';
import { fontSize, fontWeight } from 'src/theme/fonts';

const schema = yup.object({
  email: yup.string().required('Email is required').email('Enter a valid email'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = yup.InferType<typeof schema>;

export const LoginScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await dispatch(
        loginThunk({ email: data.email, password: data.password })
      ).unwrap();

      try {
        await dispatch(refreshAuthProfileThunk()).unwrap();
      } catch {
        // Profile refresh is best-effort; login already returned segment from /login when available
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Login failed',
        text2: err.message,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <View style={styles.topSpacer} />
        <View style={styles.centeredBlock}>
          <View style={styles.topSection}>
            <View style={styles.iconCircle}>
              <Icon name="shopping" size={40} color={colors.white} />
            </View>
            <Text style={styles.title}>NECESSITY B2B Marketplace</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Business Login</Text>
            <Text style={styles.cardSubtitle}>
              Access your bulk deals and orders
            </Text>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label="BUSINESS EMAIL"
                  leftIcon="email-outline"
                  placeholder="partner@necessity.com"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label="PASSWORD"
                  leftIcon="lock-outline"
                  placeholder="Enter password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  error={errors.password?.message}
                />
              )}
            />

            <AppButton
              title="LOGIN"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
            />
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => setForgotPasswordVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.securityNotice}>
            <Icon name="shield-check" size={20} color={colors.primary} style={styles.securityIcon} />
            <Text style={styles.securityText}>
              B2B Partner Portal. Registered businesses only. All transactions are secured with enterprise-grade encryption.
            </Text>
          </View>
        </View>
      </ScrollView>
      <ForgotPasswordModal
        visible={forgotPasswordVisible}
        onClose={() => setForgotPasswordVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    justifyContent: 'space-between',
  },
  topSpacer: {
    flex: 1,
    minHeight: spacing.xl,
  },
  centeredBlock: {
    flexShrink: 0,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
  },
  badgeIcon: {
    marginRight: spacing.xs,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semiBold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  forgotPasswordText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semiBold,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  registerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(228, 214, 198, 0.45)',
    borderRadius: 8,
    padding: spacing.md,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xl,
  },
  securityIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  securityText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  footerSection: {
    flexShrink: 0,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  footerLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  footerValue: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semiBold,
  },
  footerValueBold: {
    fontWeight: fontWeight.bold,
  },
  versionInfoIcon: {
    marginLeft: spacing.xs,
  },
  footerDeveloped: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16,
  },
});
