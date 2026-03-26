import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { RootState } from 'src/store';
import { colors } from 'src/theme/colors';
import type { RootStackParamList } from './types';

const LOADING_TIMEOUT_MS = 5_000;

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const { isAuthenticated, authHydrated, userEmail } = useSelector((state: RootState) => ({
    isAuthenticated: state.auth.isAuthenticated,
    authHydrated: state.auth._hydrated,
    userEmail: state.auth.user?.email ?? '',
  }));

  useEffect(() => {
    if (authHydrated) return;
    const t = setTimeout(() => setLoadingTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [authHydrated]);

  const ready = authHydrated || loadingTimedOut;

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen
          name="Main"
          component={MainNavigator}
          key={userEmail}
        />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
