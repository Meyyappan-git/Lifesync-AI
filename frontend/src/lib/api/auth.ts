import { fetchWithAuth, executeSingleFlightRefresh, setAccessToken } from "./client";
import { User, AuthSession, ActivityLog, TokenResponse } from "@/types/auth";
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput, ChangePasswordInput } from "@/lib/validation/auth";

export async function loginApi(data: LoginInput): Promise<TokenResponse> {
  const res = await fetchWithAuth<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
  setAccessToken(res.access_token);
  return res;
}

export async function registerApi(data: RegisterInput): Promise<{ message: string }> {
  return fetchWithAuth<{ message: string }>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function verifyEmailApi(token: string): Promise<{ message: string }> {
  return fetchWithAuth<{ message: string }>("/api/v1/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function resendVerificationApi(email: string): Promise<{ message: string }> {
  return fetchWithAuth<{ message: string }>("/api/v1/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function forgotPasswordApi(data: ForgotPasswordInput): Promise<{ message: string }> {
  return fetchWithAuth<{ message: string }>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function resetPasswordApi(data: ResetPasswordInput): Promise<{ message: string }> {
  return fetchWithAuth<{ message: string }>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function changePasswordApi(data: ChangePasswordInput): Promise<{ message: string }> {
  return fetchWithAuth<{ message: string }>("/api/v1/auth/change-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMeApi(): Promise<User> {
  return fetchWithAuth<User>("/api/v1/users/me", { method: "GET" });
}

export async function updateMeApi(full_name: string): Promise<User> {
  return fetchWithAuth<User>("/api/v1/users/me", {
    method: "PATCH",
    body: JSON.stringify({ full_name }),
  });
}

export async function getMySessionsApi(): Promise<AuthSession[]> {
  return fetchWithAuth<AuthSession[]>("/api/v1/users/me/sessions", { method: "GET" });
}

export async function revokeMySessionApi(sessionId: string): Promise<{ message: string }> {
  return fetchWithAuth<{ message: string }>(`/api/v1/users/me/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export async function getMyActivityApi(page: number = 1, size: number = 20): Promise<{ items: ActivityLog[]; total: number; page: number; pages: number }> {
  return fetchWithAuth<{ items: ActivityLog[]; total: number; page: number; pages: number }>(
    `/api/v1/users/me/activity?page=${page}&size=${size}`,
    { method: "GET" }
  );
}

export async function logoutApi(): Promise<void> {
  try {
    await fetchWithAuth("/api/v1/auth/logout", { method: "POST" });
  } finally {
    setAccessToken(null);
  }
}

export async function logoutAllApi(): Promise<void> {
  try {
    await fetchWithAuth("/api/v1/auth/logout-all", { method: "POST" });
  } finally {
    setAccessToken(null);
  }
}

export async function getAdminUsersApi(page: number = 1, size: number = 20): Promise<{ items: User[]; total: number; page: number; pages: number }> {
  return fetchWithAuth<{ items: User[]; total: number; page: number; pages: number }>(
    `/api/v1/admin/users?page=${page}&size=${size}`,
    { method: "GET" }
  );
}
