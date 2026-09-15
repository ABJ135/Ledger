import { createContext, useContext, useEffect, useState, ReactNode, FC } from 'react';
import { setAuthTokenGetter, useGuestAuthMutation } from '@repo/api-client';
import { AuthUser } from '@repo/shared-types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  setAuthData: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

let currentToken: string | null = localStorage.getItem('ledger_access_token');
setAuthTokenGetter(() => currentToken);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(currentToken);
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('ledger_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!token);

  const [guestAuth] = useGuestAuthMutation();

  const setAuthData = (newUser: AuthUser, newToken: string) => {
    currentToken = newToken;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('ledger_access_token', newToken);
    localStorage.setItem('ledger_user', JSON.stringify(newUser));
  };

  const logout = () => {
    currentToken = null;
    setToken(null);
    setUser(null);
    localStorage.removeItem('ledger_access_token');
    localStorage.removeItem('ledger_user');
  };

  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        try {
          const res = await guestAuth({}).unwrap();
          setAuthData(res.user, res.tokens.accessToken);
        } catch (err) {
          console.error('Failed to initialize guest session:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [token, guestAuth]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, setAuthData, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
