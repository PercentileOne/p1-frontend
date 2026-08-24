import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi, type SessionResponse } from '../api/authApi';

const TOKEN_KEY = 'explain_token';
const RECRUITER_PERMISSION = 'CAN_VIEW_RECRUITER_PORTAL';

interface AuthUser {
  email:       string;
  name:        string;
  role:        string;
  permissions: string[];
}

interface AuthContextValue {
  user:       AuthUser | null;
  token:      string | null;
  isLoading:  boolean;
  /** Validates a token against the shared backend before trusting it. Throws if invalid or not a recruiter account. */
  signIn: (token: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  signIn: async () => {},
  signOut: () => {},
});

function toAuthUser(session: SessionResponse): AuthUser {
  return { email: session.email, name: session.name, role: session.role, permissions: session.permissions };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On load, re-validate whatever's in localStorage against the shared backend rather than
  // trusting a locally-decoded JWT forever — a revoked/expired token should sign you out.
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) { setIsLoading(false); return; }

    authApi.getSession(stored)
      .then(session => {
        if (!session.permissions.includes(RECRUITER_PERMISSION)) {
          localStorage.removeItem(TOKEN_KEY);
          setIsLoading(false);
          return;
        }
        setToken(stored);
        setUser(toAuthUser(session));
        setIsLoading(false);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setIsLoading(false);
      });
  }, []);

  const signIn = useCallback(async (newToken: string) => {
    const session = await authApi.getSession(newToken);
    if (!session.permissions.includes(RECRUITER_PERMISSION)) {
      throw new Error("This account isn't registered as a recruiter.");
    }
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(toAuthUser(session));
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
