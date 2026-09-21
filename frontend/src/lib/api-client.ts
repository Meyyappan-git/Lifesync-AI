// src/lib/api-client.ts
import { fetchWithAuth } from "@/lib/api/client";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, data: any) {
    super(`API Error: ${status}`);
    this.status = status;
    this.data = data;
  }
}

// Ensure endpoint starts with a slash
const formatEndpoint = (endpoint: string) => endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    fetchWithAuth<T>(formatEndpoint(endpoint), { ...options, method: "GET" }),
    
  post: <T>(endpoint: string, body: any, options?: RequestInit) => {
    const isUrlEncoded = options?.headers && 
      (new Headers(options.headers)).get("Content-Type")?.includes("x-www-form-urlencoded");
    const isFormData = body instanceof FormData;
    const formattedBody = (isUrlEncoded || isFormData) ? body : JSON.stringify(body);
    return fetchWithAuth<T>(formatEndpoint(endpoint), { ...options, method: "POST", body: formattedBody });
  },
  
  put: <T>(endpoint: string, body: any, options?: RequestInit) => {
    const isFormData = body instanceof FormData;
    const formattedBody = isFormData ? body : JSON.stringify(body);
    return fetchWithAuth<T>(formatEndpoint(endpoint), { ...options, method: "PUT", body: formattedBody });
  },
    
  delete: <T>(endpoint: string, options?: RequestInit) => 
    fetchWithAuth<T>(formatEndpoint(endpoint), { ...options, method: "DELETE" }),
};
