import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface UserProfile {
  email: string;
  role: UserRole;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthReady: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  isAuthReady: false,
};

export const getRoleFromEmail = (emailStr: string): UserRole => {
  const e = emailStr.toLowerCase().trim();
  if (e.startsWith('admin')) return 'admin';
  if (e.startsWith('operator') || e.startsWith('staff')) return 'operator';
  return 'viewer';
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<UserProfile | null>) {
      state.user = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setAuthReady(state, action: PayloadAction<boolean>) {
      state.isAuthReady = action.payload;
    },
    logout(state) {
      state.user = null;
    },
  },
});

export const { setUser, setLoading, setAuthReady, logout } = authSlice.actions;
export default authSlice.reducer;
