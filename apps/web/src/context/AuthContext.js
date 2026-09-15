import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { setAuthTokenGetter, useGuestAuthMutation } from '@repo/api-client';
const AuthContext = createContext(undefined);
let currentToken = localStorage.getItem('ledger_access_token');
setAuthTokenGetter(() => currentToken);
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(currentToken);
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('ledger_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [isLoading, setIsLoading] = useState(!token);
    const [guestAuth] = useGuestAuthMutation();
    const setAuthData = (newUser, newToken) => {
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
                }
                catch (err) {
                    console.error('Failed to initialize guest session:', err);
                }
                finally {
                    setIsLoading(false);
                }
            }
            else {
                setIsLoading(false);
            }
        };
        initAuth();
    }, [token, guestAuth]);
    return (_jsx(AuthContext.Provider, { value: { user, token, isLoading, setAuthData, logout }, children: children }));
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
