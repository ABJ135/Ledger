import React, { createContext, useContext, useEffect, useState, ReactNode, FC } from 'react';
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

let currentToken: string | null = null;
setAuthTokenGetter(() => currentToken);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [guestAuth] = useGuestAuthMutation();

  const setAuthData = (newUser: AuthUser, newToken: string) => {
    currentToken = newToken;
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    currentToken = null;
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await guestAuth({}).unwrap();
        setAuthData(res.user, res.tokens.accessToken);
      } catch (err) {
        console.warn('Failed to initialize mobile guest session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [guestAuth]);

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
