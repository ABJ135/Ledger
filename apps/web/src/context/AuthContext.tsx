import { createContext, useContext, useEffect, useState, ReactNode, FC } from 'react';
import { useDispatch } from 'react-redux';
import {
  setAuthTokenGetter,
  setDirectToken,
  setAuthRefreshTokenGetter,
  setDirectRefreshToken,
  setOnTokenRefreshed,
  setOnAuthFailed,
  api,
  useGuestAuthMutation,
  useLoginMutation,
  useSignupMutation,
  useUpgradeGuestMutation,
  useLogoutMutation,
} from '@repo/api-client';
import { AuthUser, LoginDto, SignupDto, UpgradeGuestDto } from '@repo/shared-types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  signup: (credentials: SignupDto) => Promise<void>;
  upgradeGuest: (credentials: UpgradeGuestDto) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  setAuthData: (user: AuthUser, token: string, refreshToken?: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

let currentToken: string | null = localStorage.getItem('ledger_access_token');
let currentRefreshToken: string | null = localStorage.getItem('ledger_refresh_token');

setAuthTokenGetter(() => currentToken);
if (currentToken) {
  setDirectToken(currentToken);
}

setAuthRefreshTokenGetter(() => currentRefreshToken);
if (currentRefreshToken) {
  setDirectRefreshToken(currentRefreshToken);
}

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const [token, setToken] = useState<string | null>(currentToken);
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('ledger_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [guestAuth] = useGuestAuthMutation();
  const [loginMutation] = useLoginMutation();
  const [signupMutation] = useSignupMutation();
  const [upgradeGuestMutation] = useUpgradeGuestMutation();
  const [logoutMutation] = useLogoutMutation();

  const setAuthData = (newUser: AuthUser, newToken: string, newRefreshToken?: string) => {
    currentToken = newToken;
    setDirectToken(newToken);
    setToken(newToken);
    setUser(newUser);
    localStorage.removeItem('ledger_logged_out');
    localStorage.setItem('ledger_access_token', newToken);
    localStorage.setItem('ledger_user', JSON.stringify(newUser));

    if (newRefreshToken) {
      currentRefreshToken = newRefreshToken;
      setDirectRefreshToken(newRefreshToken);
      localStorage.setItem('ledger_refresh_token', newRefreshToken);
    }
  };

  const login = async (credentials: LoginDto) => {
    const res = await loginMutation(credentials).unwrap();
    setAuthData(res.user, res.tokens.accessToken, res.tokens.refreshToken);
    dispatch(api.util.resetApiState());
  };

  const signup = async (credentials: SignupDto) => {
    const res = await signupMutation(credentials).unwrap();
    setAuthData(res.user, res.tokens.accessToken, res.tokens.refreshToken);
    dispatch(api.util.resetApiState());
  };

  const upgradeGuest = async (credentials: UpgradeGuestDto) => {
    const res = await upgradeGuestMutation(credentials).unwrap();
    setAuthData(res.user, res.tokens.accessToken, res.tokens.refreshToken);
    dispatch(api.util.resetApiState());
  };

  const loginAsGuest = async () => {
    setIsLoading(true);
    try {
      const res = await guestAuth({}).unwrap();
      setAuthData(res.user, res.tokens.accessToken, res.tokens.refreshToken);
      dispatch(api.util.resetApiState());
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = currentRefreshToken || localStorage.getItem('ledger_refresh_token') || undefined;
      await logoutMutation({ refreshToken }).unwrap();
    } catch {
      // Continue clearing local state even if network logout fails
    }
    setDirectToken(null);
    setDirectRefreshToken(null);
    currentToken = null;
    currentRefreshToken = null;
    setToken(null);
    setUser(null);
    localStorage.setItem('ledger_logged_out', 'true');
    localStorage.removeItem('ledger_access_token');
    localStorage.removeItem('ledger_refresh_token');
    localStorage.removeItem('ledger_user');
    dispatch(api.util.resetApiState());
  };

  // Listen to silent background token rotations and 401 expiration events from apiSlice
  useEffect(() => {
    setOnTokenRefreshed(({ accessToken, refreshToken, user: refreshedUser }) => {
      currentToken = accessToken;
      currentRefreshToken = refreshToken;
      setToken(accessToken);
      if (refreshedUser) {
        setUser(refreshedUser);
        localStorage.setItem('ledger_user', JSON.stringify(refreshedUser));
      }
      localStorage.setItem('ledger_access_token', accessToken);
      localStorage.setItem('ledger_refresh_token', refreshToken);
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
      // 1. If saved token and user exist in storage, use them
      if (currentToken && user) {
        setIsLoading(false);
        return;
      }

      // 2. If user explicitly logged out in past session, stay logged out
      const isLoggedOut = localStorage.getItem('ledger_logged_out') === 'true';
      if (isLoggedOut) {
        setIsLoading(false);
        return;
      }

      // 3. First time visitor: automatically provide a guest session
      try {
        const res = await guestAuth({}).unwrap();
        setAuthData(res.user, res.tokens.accessToken, res.tokens.refreshToken);
      } catch (err) {
        console.error('Failed to initialize guest session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const isGuest = Boolean(user?.isGuest);
  const isAuthenticated = Boolean(user && !user.isGuest);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isGuest,
        isAuthenticated,
        login,
        signup,
        upgradeGuest,
        loginAsGuest,
        logout,
        setAuthData,
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
