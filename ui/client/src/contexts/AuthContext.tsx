import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  agentId: string;
  riskProfile: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

// Token stored in memory only (localStorage blocked in sandboxed iframe)
let _memToken: string | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try to restore session from in-memory token
  useEffect(() => {
    const stored = _memToken;
    if (!stored) {
      setIsLoading(false);
      return;
    }
    // Verify token with server
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((userData: AuthUser) => {
        setToken(stored);
        setUser(userData);
      })
      .catch(() => {
        _memToken = null;
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    _memToken = newToken;
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    _memToken = null;
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
