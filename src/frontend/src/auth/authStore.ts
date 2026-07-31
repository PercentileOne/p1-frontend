// ─────────────────────────────────────────────────────────────────────────────
// Auth Store — Zustand store for session state.
//
// Token is persisted in localStorage. On app load, the PermissionProvider
// calls bootstrap() which validates the token against /auth/session and
// hydrates the store with live permissions from the .NET backend.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { authApi, type AuthUser, type SessionResponse } from '../api/authApi';

const TOKEN_KEY = 'explain_auth_token';

interface AuthState {
  token:           string | null;
  user:            AuthUser | null;
  permissions:     Set<string>;
  isAuthenticated: boolean;
  isLoading:       boolean;

  // Actions
  login:     (token: string, user: AuthUser, permissions: string[]) => void;
  logout:    () => Promise<void>;
  bootstrap: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token:           localStorage.getItem(TOKEN_KEY),
  user:            null,
  permissions:     new Set(),
  isAuthenticated: false,
  isLoading:       true,

  login(token, user, permissions) {
    localStorage.setItem(TOKEN_KEY, token);
    set({
      token,
      user,
      permissions:     new Set(permissions),
      isAuthenticated: true,
      isLoading:       false,
    });
  },

  async logout() {
    const { token } = get();
    if (token) {
      try { await authApi.logout(token); } catch { /* best-effort */ }
    }
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null, permissions: new Set(), isAuthenticated: false, isLoading: false });
  },

  async bootstrap() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const session: SessionResponse = await authApi.getSession(token);
      set({
        token,
        user: {
          id:        session.userId,
          email:     session.email,
          name:      session.name,
          firstName: session.firstName,
          role:      session.role,
        },
        permissions:     new Set(session.permissions),
        isAuthenticated: true,
        isLoading:       false,
      });
    } catch {
      // Token expired or invalid — clear it
      localStorage.removeItem(TOKEN_KEY);
      set({ token: null, user: null, permissions: new Set(), isAuthenticated: false, isLoading: false });
    }
  },
}));
