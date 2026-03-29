import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  login as loginNecessity,
  logout as logoutNecessity,
  updateUser as updateUserNecessity,
} from 'src/services/authNecessity';
import type { LoginPayload, UpdateUserPayload } from 'src/services/authNecessity';
import {
  getStoredAuth,
  setStoredAuth,
  clearStoredAuth,
} from 'src/services/authStorage';
import type { User } from 'src/types/auth';

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  _hydrated: boolean;
  logoutLoading: boolean;
}

const initialState: AuthState = {
  token: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  _hydrated: false,
  logoutLoading: false,
};

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (payload: LoginPayload) => {
    const data = await loginNecessity(payload);
    await setStoredAuth({
      token: data.token,
      refresh_token: data.refresh_token,
      user: data.user,
    });
    return data;
  }
);

export const hydrateAuthThunk = createAsyncThunk(
  'auth/hydrate',
  async (_arg, { rejectWithValue }) => {
    const stored = await getStoredAuth();
    if (!stored) return null;
    return stored;
  }
);

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  try {
    await logoutNecessity();
  } finally {
    await clearStoredAuth();
  }
});

export const updateUserThunk = createAsyncThunk(
  'auth/updateUser',
  async (payload: UpdateUserPayload, { getState }) => {
    const state = getState() as { auth: AuthState };
    const user = state.auth.user;
    const token = state.auth.token;
    const refreshToken = state.auth.refreshToken;

    if (!user?.uuid) {
      throw new Error('User not found');
    }

    const updatedUser = await updateUserNecessity(user.uuid, payload);

    if (token) {
      await setStoredAuth({
        token,
        refresh_token: refreshToken ?? undefined,
        user: updatedUser,
      });
    }

    return updatedUser;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: { payload: { token: string; refreshToken: string; user: User } }) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.refreshToken = action.payload.refresh_token || null;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(hydrateAuthThunk.fulfilled, (state, action) => {
        state._hydrated = true;
        if (action.payload) {
          state.token = action.payload.token;
          state.refreshToken = action.payload.refresh_token || null;
          state.user = action.payload.user;
          state.isAuthenticated = true;
        }
      })
      .addCase(hydrateAuthThunk.rejected, (state) => {
        state._hydrated = true;
      })
      .addCase(logoutThunk.pending, (state) => {
        state.logoutLoading = true;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.token = null;
        state.refreshToken = null;
        state.user = null;
        state.isAuthenticated = false;
        state.logoutLoading = false;
      })
      .addCase(logoutThunk.rejected, (state) => {
        state.token = null;
        state.refreshToken = null;
        state.user = null;
        state.isAuthenticated = false;
        state.logoutLoading = false;
      })
      .addCase(updateUserThunk.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
