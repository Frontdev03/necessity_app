import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthData } from 'src/types/auth';

const AUTH_KEY = '@necessity_auth';

function normalizeStoredAuth(data: AuthData): AuthData {
  const token =
    typeof data.token === 'string' ? data.token.trim().replace(/^Bearer\s+/i, '') : data.token;
  return { ...data, token };
}

export async function getStoredAuth(): Promise<AuthData | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AuthData;
    if (!data?.token || !data?.user) return null;
    return normalizeStoredAuth(data);
  } catch {
    return null;
  }
}

export async function setStoredAuth(data: AuthData): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(normalizeStoredAuth(data)));
}

export async function clearStoredAuth(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}
