import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode
} from 'react';
import api from '../lib/api';

type UserRole = 'patient' | 'dentist' | 'admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isValidating: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function readUserFromStorage(): User | null {
  try {
    const id = localStorage.getItem('user_id');
    const name = localStorage.getItem('full_name');
    const roleStr = localStorage.getItem('user_role');
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token && id && name) {
      const role: UserRole = roleStr === 'dentist' ? 'dentist' : roleStr === 'admin' ? 'admin' : 'patient';
      return { id, name, email: '', role };
    }
  } catch {}
  return null;
}

const STORAGE_KEYS = ['access_token', 'refresh_token', 'token', 'user_id', 'full_name', 'user_role', 'pcdent_user'];

function clearStorage() {
  STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const storedUser = readUserFromStorage();
  const [user, setUser] = useState<User | null>(storedUser);
  // If there was a stored session, validate it before trusting it.
  const [isValidating, setIsValidating] = useState(storedUser !== null);

  useEffect(() => {
    if (!storedUser) return;

    // Validate the stored token by hitting /me/. The api interceptor will
    // auto-refresh an expired access token. If both tokens are dead it
    // redirects to /login, so we never reach the catch here with a live
    // refresh token. We still handle the error case defensively.
    api.get('me/')
      .then((res) => {
        const roleStr = localStorage.getItem('user_role');
        const role: UserRole = roleStr === 'dentist' ? 'dentist' : roleStr === 'admin' ? 'admin' : 'patient';
        setUser({
          id: res.data.user_id,
          name: res.data.full_name,
          email: res.data.email,
          role,
        });
      })
      .catch(() => {
        setUser(null);
        clearStorage();
      })
      .finally(() => setIsValidating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount

  const login = useCallback(async (usernameOrEmail: string, password: string): Promise<boolean> => {
    try {
      const { data } = await api.post('login/', { username: usernameOrEmail, password });
      const { access, refresh, user_id, full_name, is_dentist } = data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('token', access);
      localStorage.setItem('user_id', user_id);
      localStorage.setItem('full_name', full_name);
      localStorage.setItem('user_role', is_dentist ? 'dentist' : 'patient');

      const role: UserRole = is_dentist ? 'dentist' : 'patient';
      setUser({ id: user_id, name: full_name, email: usernameOrEmail, role });
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearStorage();
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isValidating,
    login,
    logout,
  }), [user, isValidating, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
