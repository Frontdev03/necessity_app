import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { forgotPassword } from 'src/services/authNecessity';
import { AppInput } from 'src/components/AppInput';
import { AppButton } from 'src/components/AppButton';
import { colors } from 'src/theme/colors';
import { spacing } from 'src/theme/spacing';
import { fontSize, fontWeight } from 'src/theme/fonts';

const schema = yup.object({
  email: yup.string().required('Email is required').email('Enter a valid email'),
});

type ForgotPasswordFormData = yup.InferType<typeof schema>;

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: '' },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      const response = await forgotPassword({ email: data.email });

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Reset Email Sent',
          text2: response.message || 'Check your email for instructions',
        });
        handleClose();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Request Failed',
          text2: response.message || 'Something went wrong',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to send reset email',
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlayTouchable} />
        </TouchableWithoutFeedback>
        <View style={styles.cardWrapper}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>Forgot Password</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.subtitle}>
                Enter your registered business email and we'll send you
                instructions to reset your password.
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
                    containerStyle={styles.input}
                  />
                )}
              />

              <AppButton
                title="SEND RESET LINK"
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                style={styles.submitButton}
              />

              <TouchableOpacity onPress={handleClose} style={styles.cancelLink}>
                <Text style={styles.cancelLinkText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  cardWrapper: {
    width: '100%',
  },
  keyboardView: {
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.base,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  cancelLink: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  cancelLinkText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semiBold,
  },
});
