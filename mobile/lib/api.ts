/**
 * api.ts — Axios client configured with base URL + JWT interceptor
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Token storage (replace with expo-secure-store in production)
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 by clearing token
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      setAuthToken(null);
      // In production: navigate to login screen via navigation ref
      console.warn('[API] Unauthorized — token cleared');
    }
    return Promise.reject(error);
  }
);

// Convenience methods
export const apiGet = <T>(path: string) => api.get<T>(path).then(r => r.data);
export const apiPost = <T>(path: string, body: unknown) => api.post<T>(path, body).then(r => r.data);
export const apiPut = <T>(path: string, body: unknown) => api.put<T>(path, body).then(r => r.data);
export const apiDelete = <T>(path: string) => api.delete<T>(path).then(r => r.data);
