import { ApiError } from "@/types/auth";

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let onAuthFailureCallback: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setOnAuthFailure(callback: () => void) {
  onAuthFailureCallback = callback;
}

export function validateSameOriginRedirect(nextPath: string | null | undefined): string {
  if (!nextPath) return "/dashboard";
  const trimmed = nextPath.trim();
  // Must start with '/' and NOT with '//' or '\' to prevent open redirect vulnerabilities
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    return trimmed;
  }
  return "/dashboard";
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  }

  let errorData: any = null;
  try {
    errorData = await res.json();
  } catch {
    // Non-JSON response
  }

  const retryAfterHeader = res.headers.get("Retry-After");
  const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

  if (errorData && errorData.error) {
    const errObj: ApiError = {
      code: errorData.error.code || "unknown_error",
      message: errorData.error.message || "An unexpected error occurred",
      fields: errorData.error.fields,
      retryAfter,
    };
    throw errObj;
  }

  throw {
    code: `http_${res.status}`,
    message: res.statusText || "Request failed",
    retryAfter,
  } as ApiError;
}

export async function fetchWithAuth<T>(
  url: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("X-Requested-With", "fetch");

  if (inMemoryAccessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${inMemoryAccessToken}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers, credentials: options.credentials || "same-origin" });

  // 401 Unauthorized handling with single-flight refresh token rotation
  if (response.status === 401 && !isRetry && !url.includes("/auth/login") && !url.includes("/auth/refresh")) {
    try {
      const newToken = await executeSingleFlightRefresh();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        return fetchWithAuth<T>(url, { ...options, headers }, true);
      }
    } catch {
      // Refresh failed
    }

    setAccessToken(null);
    if (typeof document !== "undefined") {
      document.cookie = "ls_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
    }
    if (onAuthFailureCallback) onAuthFailureCallback();

    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      if (!currentPath.includes("/login")) {
        const nextUrl = encodeURIComponent(currentPath);
        window.location.href = `/login?next=${nextUrl}`;
      }
    }
  }

  return handleResponse<T>(response);
}

export async function executeSingleFlightRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: {
          "X-Requested-With": "fetch",
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
      });

      if (!res.ok) {
        if (typeof document !== "undefined") {
          document.cookie = "ls_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
        }
        throw new Error("Refresh failed");
      }

      const data = await res.json();
      const token = data.access_token;
      setAccessToken(token);
      return token;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
