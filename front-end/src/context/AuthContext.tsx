import { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useMemo,
  type ReactNode 
} from 'react';
import { useLocalStorage } from '../hooks';

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
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock users for demo
const MOCK_USERS: Record<UserRole, User> = {
  patient: {
    id: 'p1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'patient',
  },
  dentist: {
    id: 'd1',
    name: 'Dr. Sarah Chen',
    email: 'sarah@clinic.com',
    role: 'dentist',
  },
  admin: {
    id: 'a1',
    name: 'Admin User',
    email: 'admin@clinic.com',
    role: 'admin',
  },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [storedUser, setStoredUser] = useLocalStorage<User | null>('pcdent_user', null);
  const [user, setUser] = useState<User | null>(storedUser);

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // For demo, accept any email and default to patient
    const role = email.includes('admin') ? 'admin' 
      : email.includes('dentist') || email.includes('dr') ? 'dentist' 
      : 'patient';
    
    const mockUser = { ...MOCK_USERS[role], email };
    setUser(mockUser);
    setStoredUser(mockUser);
    return true;
  }, [setStoredUser]);

  const logout = useCallback(() => {
    setUser(null);
    setStoredUser(null);
  }, [setStoredUser]);

  const switchRole = useCallback((role: UserRole) => {
    const newUser = MOCK_USERS[role];
    setUser(newUser);
    setStoredUser(newUser);
  }, [setStoredUser]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    login,
    logout,
    switchRole,
  }), [user, login, logout, switchRole]);

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
