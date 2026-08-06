import { createContext, useContext, useState, useCallback } from 'react';

const TOKEN_KEY = 'explain_token';

interface AuthUser {
  email: string;
  name: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  signIn: (token: string, email: string, name: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  signIn: () => {},
  signOut: () => {},
});

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return { email: payload.email, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}

function getStored(): { token: string; user: AuthUser } | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const user = decodeToken(token);
  if (!user) { localStorage.removeItem(TOKEN_KEY); return null; }
  return { token, user };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const stored = getStored();
  const [token, setToken] = useState<string | null>(stored?.token ?? null);
  const [user, setUser] = useState<AuthUser | null>(stored?.user ?? null);

  const signIn = useCallback((newToken: string, email: string, name: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser({ email, name, role: 'recruiter' });
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
