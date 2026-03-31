import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppButton } from 'src/components/AppButton';
import { AppInput } from 'src/components/AppInput';
import { colors } from 'src/theme/colors';
import { spacing } from 'src/theme/spacing';
import { fontSize, fontWeight } from 'src/theme/fonts';
import { register } from 'src/services/authNecessity';
import type { AuthStackParamList } from 'src/navigation/types';

const schema = yup.object({
    name: yup.string().required('Full name is required'),
    email: yup.string().required('Email is required').email('Enter a valid email'),
    phone: yup
        .string()
        .required('Phone number is required')
        .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits'),
    businessName: yup.string().required('Business name is required'),
    gstNumber: yup
        .string()
        .required('GST number is required')
        .matches(
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
            'Enter a valid GST number'
        ),
    panNumber: yup
        .string()
        .required('PAN number is required')
        .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Enter a valid PAN number'),
    password: yup
        .string()
        .required('Password is required')
        .min(6, 'Password must be at least 6 characters'),
});

type RegisterFormData = yup.InferType<typeof schema>;

export const RegisterScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({
        resolver: yupResolver(schema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            businessName: '',
            gstNumber: '',
            panNumber: '',
            password: '',
        },
    });

    const onSubmit = async (data: RegisterFormData) => {
        try {
            const response = await register(data);
            if (response.success) {
                Alert.alert(
                    'Registration Successful',
                    response.message || 'Your account is pending admin approval.',
                    [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
                );
            }
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Registration failed',
                text2: err.message || 'Something went wrong',
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
            >
                <View style={styles.topSection}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-left" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.iconCircle}>
                        <Icon name="store-plus" size={40} color={colors.white} />
                    </View>
                    <Text style={styles.title}>Register Business</Text>
                    <Text style={styles.subtitle}>Join the NECESSITY B2B Marketplace</Text>
                </View>

                <View style={styles.card}>
                    <Controller
                        control={control}
                        name="name"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <AppInput
                                label="FULL NAME *"
                                leftIcon="account-outline"
                                placeholder="John Doe"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                error={errors.name?.message}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="email"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <AppInput
                                label="BUSINESS EMAIL *"
                                leftIcon="email-outline"
                                placeholder="partner@business.com"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                error={errors.email?.message}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="phone"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <AppInput
                                label="PHONE NUMBER *"
                                leftIcon="phone-outline"
                                placeholder="9876543210"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                error={errors.phone?.message}
                                keyboardType="phone-pad"
                                maxLength={10}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="businessName"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <AppInput
                                label="BUSINESS NAME *"
                                leftIcon="office-building-outline"
                                placeholder="ABC Enterprise Pvt Ltd"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                error={errors.businessName?.message}
                            />
                        )}
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: spacing.sm }}>
                            <Controller
                                control={control}
                                name="gstNumber"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <AppInput
                                        label="GSTIN *"
                                        placeholder="27ABCDE1234F1Z5"
                                        value={value}
                                        onChangeText={(text) => onChange(text.toUpperCase())}
                                        onBlur={onBlur}
                                        error={errors.gstNumber?.message}
                                        autoCapitalize="characters"
                                    />
                                )}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: spacing.sm }}>
                            <Controller
                                control={control}
                                name="panNumber"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <AppInput
                                        label="PAN *"
                                        placeholder="ABCDE1234F"
                                        value={value}
                                        onChangeText={(text) => onChange(text.toUpperCase())}
                                        onBlur={onBlur}
                                        error={errors.panNumber?.message}
                                        autoCapitalize="characters"
                                    />
                                )}
                            />
                        </View>
                    </View>

                    <Controller
                        control={control}
                        name="password"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <AppInput
                                label="PASSWORD *"
                                leftIcon="lock-outline"
                                placeholder="Create secure password"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                secureTextEntry
                                error={errors.password?.message}
                            />
                        )}
                    />

                    <AppButton
                        title="SUBMIT APPLICATION"
                        onPress={handleSubmit(onSubmit)}
                        loading={isSubmitting}
                        style={styles.submitButton}
                    />

                    <View style={styles.loginLink}>
                        <Text style={styles.loginText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginActionText}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.infoSection}>
                    <Icon name="information-outline" size={20} color={colors.primary} />
                    <Text style={styles.infoText}>
                        All B2B registrations are subject to verification. Please ensure all documents are valid.
                    </Text>
                </View>
            </ScrollView>
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
        paddingHorizontal: spacing.lg,
        paddingTop: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
        paddingBottom: spacing.xxxl,
    },
    topSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    backButton: {
        position: 'absolute',
        left: 0,
        top: 0,
        padding: spacing.sm,
        zIndex: 1,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
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
    },
    subtitle: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.accent,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    submitButton: {
        marginTop: spacing.lg,
    },
    loginLink: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.xl,
    },
    loginText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    loginActionText: {
        fontSize: fontSize.sm,
        color: colors.primary,
        fontWeight: fontWeight.bold,
    },
    infoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(228, 214, 198, 0.45)',
        padding: spacing.md,
        borderRadius: 8,
        marginTop: spacing.xl,
    },
    infoText: {
        flex: 1,
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
        lineHeight: 16,
    },
});
