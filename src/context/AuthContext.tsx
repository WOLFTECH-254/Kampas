import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

interface User {
  id:                  string;
  name:                string;
  email:               string;
  phone?:              string;
  campus?:             string;
  role:                string;
  avatar?:             string;
  walletBalance:       number;
  isVerified:          boolean;
  onboardingCompleted: boolean;
}

interface AuthContextType {
  user:    User | null;
  token:   string | null;
  loading: boolean;
  login:   (email: string, password: string) => Promise<{ redirectTo: string }>;
  signup:  (data: SignupData) => Promise<void>;
  logout:  () => void;
  refresh: () => Promise<void>;
}

interface SignupData {
  name:         string;
  email:        string;
  phone:        string;
  campus:       string;
  password:     string;
  referralCode?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getRedirectPath(user: User): string {
  if (user.role === 'ADMIN')                          return '/admin';
  if (!user.onboardingCompleted)                      return '/onboarding';
  if (user.role === 'SELLER' || user.role === 'BOTH') return '/dashboard/seller';
  return '/explore';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(localStorage.getItem('kampas_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('kampas_token');
    if (savedToken) {
      api('/api/auth/me', { auth: true })
        .then(res => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('kampas_token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ redirectTo: string }> => {
    const res = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    const { user, token } = res.data;
    localStorage.setItem('kampas_token', token);
    setToken(token);
    setUser(user);
    return { redirectTo: getRedirectPath(user) };
  };

  const signup = async (data: SignupData) => {
    const res = await api('/api/auth/register', { method: 'POST', body: data });
    const { user, token } = res.data;
    localStorage.setItem('kampas_token', token);
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('kampas_token');
    setToken(null);
    setUser(null);
  };

  const refresh = async () => {
    const res = await api('/api/auth/me', { auth: true });
    setUser(res.data.user);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
