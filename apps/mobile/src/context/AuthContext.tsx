import React, { createContext, useContext, useEffect, useState, ReactNode, FC } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import {
  setAuthTokenGetter,
  setDirectToken,
  setAuthRefreshTokenGetter,
  setDirectRefreshToken,
  setOnTokenRefreshed,
  setOnAuthFailed,
  useGuestAuthMutation,
  useLoginMutation,
  useSignupMutation,
  useUpgradeGuestMutation,
  useLogoutMutation,
  apiSlice,
} from '@repo/api-client';
import { AuthUser } from '@repo/shared-types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isGuest: boolean;
  isLoading: boolean;
  setAuthData: (user: AuthUser, token: string, refreshToken?: string) => Promise<void>;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (credentials: { email: string; password: string }) => Promise<void>;
  upgradeGuest: (credentials: { email: string; password: string }) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

let currentToken: string | null = null;
let currentRefreshToken: string | null = null;

setAuthTokenGetter(() => currentToken);
setAuthRefreshTokenGetter(() => currentRefreshToken);

const STORAGE_KEYS = {
  TOKEN: 'ledger_mobile_token',
  REFRESH_TOKEN: 'ledger_mobile_refresh_token',
  USER: 'ledger_mobile_user',
  LOGGED_OUT: 'ledger_mobile_logged_out',
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const dispatch = useDispatch();
  const [guestAuth] = useGuestAuthMutation();
  const [loginMutation] = useLoginMutation();
  const [signupMutation] = useSignupMutation();
  const [upgradeGuestMutation] = useUpgradeGuestMutation();
  const [logoutMutation] = useLogoutMutation();

  const persistSession = async (newUser: AuthUser, newToken: string, newRefreshToken?: string) => {
    currentToken = newToken;
    setDirectToken(newToken);
    setToken(newToken);
    setUser(newUser);

    if (newRefreshToken) {
      currentRefreshToken = newRefreshToken;
      setDirectRefreshToken(newRefreshToken);
    }

    try {
      const ops = [
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, newToken),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser)),
        AsyncStorage.removeItem(STORAGE_KEYS.LOGGED_OUT),
      ];
      if (newRefreshToken) {
        ops.push(AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken));
      }
      await Promise.all(ops);
    } catch (err) {
      console.warn('Failed to persist auth session to storage:', err);
    }
  };

  const clearSession = async () => {
    setDirectToken(null);
    setDirectRefreshToken(null);
    currentToken = null;
    currentRefreshToken = null;
    setToken(null);
    setUser(null);
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
        AsyncStorage.setItem(STORAGE_KEYS.LOGGED_OUT, 'true'),
      ]);
    } catch (err) {
      console.warn('Failed to clear auth session from storage:', err);
    }
  };

  const setAuthData = async (newUser: AuthUser, newToken: string, newRefreshToken?: string) => {
    await persistSession(newUser, newToken, newRefreshToken);
  };

  const login = async (credentials: { email: string; password: string }) => {
    const res = await loginMutation(credentials).unwrap();
    dispatch(apiSlice.util.resetApiState());
    await persistSession(res.user, res.tokens.accessToken, res.tokens.refreshToken);
  };

  const signup = async (credentials: { email: string; password: string }) => {
    const res = await signupMutation(credentials).unwrap();
    dispatch(apiSlice.util.resetApiState());
    await persistSession(res.user, res.tokens.accessToken, res.tokens.refreshToken);
  };

  const upgradeGuest = async (credentials: { email: string; password: string }) => {
    const res = await upgradeGuestMutation(credentials).unwrap();
    dispatch(apiSlice.util.resetApiState());
    await persistSession(res.user, res.tokens.accessToken, res.tokens.refreshToken);
  };

  const loginAsGuest = async () => {
    const res = await guestAuth({}).unwrap();
    dispatch(apiSlice.util.resetApiState());
    await persistSession(res.user, res.tokens.accessToken, res.tokens.refreshToken);
  };

  const logout = async () => {
    try {
      const refreshToken = currentRefreshToken || undefined;
      await logoutMutation({ refreshToken }).unwrap();
    } catch (err) {
      console.warn('Backend logout call failed or network issue:', err);
    }
    dispatch(apiSlice.util.resetApiState());
    await clearSession();
  };

  // Listen to silent background token rotations and 401 expiration events from apiSlice
  useEffect(() => {
    setOnTokenRefreshed(({ accessToken, refreshToken, user: refreshedUser }) => {
      currentToken = accessToken;
      currentRefreshToken = refreshToken;
      setToken(accessToken);
      if (refreshedUser) {
        setUser(refreshedUser);
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(refreshedUser)).catch(() => {});
      }
      AsyncStorage.setItem(STORAGE_KEYS.TOKEN, accessToken).catch(() => {});
      AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken).catch(() => {});
    });

    setOnAuthFailed(() => {
      logout();
    });

    return () => {
      setOnTokenRefreshed(null);
      setOnAuthFailed(null);
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const [savedToken, savedRefreshToken, savedUserJson, isLoggedOut] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.LOGGED_OUT),
        ]);

        if (savedRefreshToken) {
          currentRefreshToken = savedRefreshToken;
          setDirectRefreshToken(savedRefreshToken);
        }

        if (savedToken && savedUserJson) {
          try {
            const parsedUser = JSON.parse(savedUserJson) as AuthUser;
            currentToken = savedToken;
            setDirectToken(savedToken);
            setToken(savedToken);
            setUser(parsedUser);
            setIsLoading(false);
            return;
          } catch (e) {
            console.warn('Failed to parse saved user JSON:', e);
          }
        }

        // If user explicitly logged out, keep unauthenticated so they can log in
        if (isLoggedOut === 'true') {
          currentToken = null;
          currentRefreshToken = null;
          setToken(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Initial launch: auto-create guest session for immediate usability
        const res = await guestAuth({}).unwrap();
        await persistSession(res.user, res.tokens.accessToken, res.tokens.refreshToken);
      } catch (err) {
        console.warn('Failed to initialize mobile guest session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [guestAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isGuest: Boolean(user?.isGuest),
        isLoading,
        setAuthData,
        login,
        signup,
        upgradeGuest,
        loginAsGuest,
        logout,
      }}
    >
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
