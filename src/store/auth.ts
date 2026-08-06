import { create } from 'zustand';
import { api } from '@/api/client';
import { Endpoints } from '@/api/endpoints';
import { clearTokens, loadTokens, setTokens } from '@/api/tokens';
import { storage, StorageKeys } from '@/lib/storage';
import type { AuthSession, GenreSlug, OAuthProvider, User, UserRole } from '@/types';

export type AuthStatus = 'loading' | 'authenticated' | 'guest';

interface AuthState {
  status: AuthStatus;
  user: User | null;

  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (input: {
    name: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<User>;
  loginWithProvider: (provider: OAuthProvider) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
  updateProfile: (patch: Partial<Pick<User, 'name' | 'bio' | 'username' | 'avatarUrl'>>) => Promise<User>;
  savePreferences: (input: {
    favoriteGenres: GenreSlug[];
    favoriteAuthorIds: string[];
  }) => Promise<void>;
  setGoal: (target: number) => Promise<void>;
  /** Demo-only: switch between reader / publisher / moderator views. */
  setDemoRole: (role: UserRole) => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,

  /**
   * Restores a session on cold start. A stored token is trusted only as far as
   * `/auth/me` confirms it — if that call fails the tokens are dropped and the
   * app opens on the sign-in screen.
   */
  bootstrap: async () => {
    const { access } = await loadTokens();
    if (!access) {
      set({ status: 'guest', user: null });
      return;
    }
    try {
      const user = await api.get<User>(Endpoints.auth.me);
      set({ status: 'authenticated', user });
    } catch {
      await clearTokens();
      set({ status: 'guest', user: null });
    }
  },

  login: async (email, password) => {
    const session = await api.post<AuthSession>(
      Endpoints.auth.login,
      { email, password },
      { auth: false },
    );
    await setTokens(session.accessToken, session.refreshToken);
    set({ status: 'authenticated', user: session.user });
    return session.user;
  },

  register: async (input) => {
    const session = await api.post<AuthSession>(Endpoints.auth.register, input, { auth: false });
    await setTokens(session.accessToken, session.refreshToken);
    set({ status: 'authenticated', user: session.user });
    return session.user;
  },

  loginWithProvider: async (provider) => {
    // A real build hands off to expo-auth-session here and posts the returned
    // id_token; the contract for that exchange is in backend-guide/AUTH.md.
    const session = await api.post<AuthSession>(
      Endpoints.auth.oauth(provider),
      { idToken: 'demo' },
      { auth: false },
    );
    await setTokens(session.accessToken, session.refreshToken);
    set({ status: 'authenticated', user: session.user });
    return session.user;
  },

  logout: async () => {
    try {
      await api.post(Endpoints.auth.logout);
    } catch {
      // Signing out locally must succeed even if the server call fails.
    }
    await clearTokens();
    await storage.remove(StorageKeys.session);
    set({ status: 'guest', user: null });
  },

  refresh: async () => {
    if (get().status !== 'authenticated') return;
    try {
      const user = await api.get<User>(Endpoints.auth.me);
      set({ user });
    } catch {
      /* keep the cached user; the query layer surfaces the error */
    }
  },

  setUser: (user) => set({ user }),

  updateProfile: async (patch) => {
    const user = await api.patch<User>(Endpoints.users.updateMe, patch);
    set({ user });
    return user;
  },

  savePreferences: async (input) => {
    const user = await api.patch<User>(Endpoints.users.preferences, input);
    set({ user });
  },

  setGoal: async (target) => {
    await api.patch(Endpoints.users.goal, { target });
    await get().refresh();
  },

  setDemoRole: async (role) => {
    const user = await api.post<User>('/_demo/role', { role });
    set({ user });
  },
}));

/** Convenience selectors, so components subscribe to the narrowest slice. */
export const useCurrentUser = () => useAuth((s) => s.user);
export const useAuthStatus = () => useAuth((s) => s.status);
export const useIsAuthenticated = () => useAuth((s) => s.status === 'authenticated');
