export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "user" | "admin";
  is_active: boolean;
  email_verified: boolean;
  email_verified_at?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  is_current?: boolean;
}

export interface ActivityLog {
  id: string;
  event: string;
  ip: string | null;
  user_agent: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
  retryAfter?: number;
}
