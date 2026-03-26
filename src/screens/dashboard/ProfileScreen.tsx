import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppButton } from 'src/components/AppButton';
import { logoutThunk } from 'src/store/authSlice';

import { RootState, AppDispatch } from 'src/store';
import { colors } from 'src/theme/colors';
import { spacing } from 'src/theme/spacing';
import { fontSize, fontWeight } from 'src/theme/fonts';
import { NECESSITY_BASE_URL } from 'src/config/necessity';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const ProfileScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.auth.user);
  const logoutLoading = useSelector((state: RootState) => state.auth.logoutLoading);

  const displayName = user?.full_name ?? 'Partner';
  const designation = user?.role ? String(user.role) : 'Business Manager';
  const initials = user?.full_name ? getInitials(user.full_name) : 'BN';

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => dispatch(logoutThunk()),
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.headerSpacer} onPress={handleLogout}>
          <Icon name="logout" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.avatar}>
              {user?.photo_url ? (
                <Image
                  source={{ uri: `${NECESSITY_BASE_URL}/necessity/files/${user.photo_url}` }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.designation}>{designation}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PersonalInformation')}
            >
              <Icon name="account-outline" size={22} color={colors.primary} />
              <Text style={styles.rowLabel}>Personal information</Text>
              <Icon name="chevron-right" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Security')}
            >
              <Icon name="shield-account-outline" size={22} color={colors.primary} />
              <Text style={styles.rowLabel}>Security</Text>
              <Icon name="chevron-right" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="bell-outline" size={22} color={colors.primary} />
              <Text style={styles.rowLabel}>Notifications</Text>
              <Icon name="chevron-right" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View> */}

          <View style={styles.logoutSection}>
            <AppButton
              title="Sign out"
              onPress={handleLogout}
              variant="outline"
              loading={logoutLoading}
            />
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
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semiBold,
    color: colors.white,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
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
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  designation: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  rowLabel: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  logoutSection: {
    marginTop: spacing.lg,
  },
});
