import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthData } from 'src/types/auth';

const AUTH_KEY = '@necessity_auth';

export async function getStoredAuth(): Promise<AuthData | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AuthData;
    return data?.token && data?.user ? data : null;
  } catch {
    return null;
  }
}

export async function setStoredAuth(data: AuthData): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

export async function clearStoredAuth(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}
