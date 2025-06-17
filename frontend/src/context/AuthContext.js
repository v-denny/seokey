// File: seokey/frontend/src/context/AuthContext.js
'use client';

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('seokey-token');
            if (storedToken) {
                // Here you could add a check to verify the token with the backend if needed
                setToken(storedToken);
            }
        } catch (error) {
            console.error("Could not access local storage", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const login = useCallback((newToken) => {
        localStorage.setItem('seokey-token', newToken);
        setToken(newToken);
        router.push('/'); // Redirect to dashboard after login
    }, [router]);

    const logout = useCallback(() => {
        localStorage.removeItem('seokey-token');
        setToken(null);
        router.push('/login'); // Redirect to login page after logout
    }, [router]);

    const authHeader = useCallback(() => {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }, [token]);

    const value = {
        token,
        isLoggedIn: !!token,
        loading,
        login,
        logout,
        authHeader
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
