"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "./api-client";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async () => {
    try {
      const data = await apiClient.get<User>("/api/v1/auth/me");
      setUser(data);
    } catch (err) {
      try {
        await apiClient.post("/api/v1/auth/refresh", {});
        const data = await apiClient.get<User>("/api/v1/auth/me");
        setUser(data);
      } catch {
        localStorage.removeItem("accessToken");
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (token: string | { access_token?: string; refresh_token?: string; requires_verification?: boolean }) => {
    const accessToken = typeof token === "string" ? token : token.access_token;
    if (!accessToken) {
      throw new Error("No access token received");
    }

    localStorage.setItem("accessToken", accessToken);
    await fetchUser();
    router.push("/dashboard");
  };

  const logout = async () => {
    try {
      await apiClient.post("/api/v1/auth/logout", {});
    } catch {
      // Ignore logout errors and clear local state.
    }
    localStorage.removeItem("accessToken");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
