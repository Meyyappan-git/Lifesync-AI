"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, TokenResponse } from "@/types/auth";
import { setAccessToken, executeSingleFlightRefresh, setOnAuthFailure } from "@/lib/api/client";
import { getMeApi, logoutApi, logoutAllApi } from "@/lib/api/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  loginSuccess: (tokenData: TokenResponse) => void;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refetchUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const handleAuthFailure = useCallback(() => {
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    setOnAuthFailure(handleAuthFailure);

    // Initial mount session restoration via httpOnly cookie refresh
    let isMounted = true;

    async function restoreSession() {
      try {
        const token = await executeSingleFlightRefresh();
        if (token && isMounted) {
          const userData = await getMeApi();
          if (isMounted) {
            setUser(userData);
            setStatus("authenticated");
          }
        } else if (isMounted) {
          setStatus("unauthenticated");
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setStatus("unauthenticated");
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [handleAuthFailure]);

  const loginSuccess = useCallback((tokenData: TokenResponse) => {
    setAccessToken(tokenData.access_token);
    setUser(tokenData.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await logoutAllApi();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const refetchUser = useCallback(async (): Promise<User | null> => {
    try {
      const updatedUser = await getMeApi();
      setUser(updatedUser);
      return updatedUser;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        loginSuccess,
        logout,
        logoutAll,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
