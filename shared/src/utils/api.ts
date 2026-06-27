// Shared API client utility

import type { ApiResponse, ApiError, PaginationParams, ListParams } from '../types';

const DEFAULT_BASE_URL = 'http://localhost:8080/api/v1';
const DEFAULT_TIMEOUT = 30000;

export interface ApiClientOptions {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
  getToken?: () => string | null;
  onError?: (error: ApiError) => void;
}

export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;
  private getToken: () => string | null;
  private onError: (error: ApiError) => void;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    this.getToken = options.getToken || (() => null);
    this.onError = options.onError || (() => {});
  }

  private async request<T>(
    method: string,
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const token = this.getToken();
    
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(options.headers as Record<string, string>),
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body,
        signal: controller.signal,
        credentials: 'include',
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({})) as ApiResponse<T>;

      if (!response.ok) {
        const error: ApiError = {
          code: data.error?.code || 'UNKNOWN_ERROR',
          message: data.error?.message || response.statusText,
          details: data.error?.details,
          status_code: response.status,
        };
        this.onError(error);
        throw error;
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError: ApiError = {
          code: 'TIMEOUT',
          message: 'Request timed out',
          status_code: 408,
        };
        this.onError(timeoutError);
        throw timeoutError;
      }
      
      throw error;
    }
  }

  // Convenience methods
  async get<T>(path: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const queryString = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.request<T>('GET', `${path}${queryString}`);
  }

  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, {
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, {
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, {
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path);
  }

  // Pagination helpers
  async list<T>(path: string, params?: ListParams): Promise<ApiResponse<T[]>> {
    return this.get<T[]>(path, params as Record<string, unknown>);
  }

  async *paginate<T>(path: string, params?: Omit<ListParams, 'page'>): AsyncGenerator<T[], void, unknown> {
    let page = 1;
    const pageSize = params?.page_size || 20;
    
    while (true) {
      const response = await this.get<T[]>(path, {
        ...params,
        page,
        page_size: pageSize,
      });
      
      const items = response.data || [];
      yield items;
      
      if (items.length < pageSize || !response.meta?.pagination?.has_next) {
        break;
      }
      
      page++;
    }
  }

  // File upload
  async uploadFile<T>(
    path: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress((event.loaded / event.total) * 100);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as ApiResponse<T>;
            resolve(data);
          } catch {
            resolve({ success: true, data: xhr.responseText as unknown as T });
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText) as ApiResponse<T>;
            const error = data.error || {
              code: 'UPLOAD_FAILED',
              message: xhr.statusText,
              status_code: xhr.status,
            };
            this.onError(error);
            reject(error);
          } catch {
            const error: ApiError = {
              code: 'UPLOAD_FAILED',
              message: xhr.statusText,
              status_code: xhr.status,
            };
            this.onError(error);
            reject(error);
          }
        }
      });
      
      xhr.addEventListener('error', () => {
        const error: ApiError = {
          code: 'NETWORK_ERROR',
          message: 'Network error during upload',
          status_code: 0,
        };
        this.onError(error);
        reject(error);
      });
      
      xhr.open('POST', `${this.baseUrl}${path}`);
      
      const token = this.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.send(formData);
    });
  }

  // Update base URL
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  // Update default headers
  setHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }
}

// Singleton instance
let apiClientInstance: ApiClient | null = null;

export function getApiClient(options?: ApiClientOptions): ApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new ApiClient(options);
  }
  return apiClientInstance;
}

export function setApiClient(client: ApiClient): void {
  apiClientInstance = client;
}

// React hook for API client (if using React)
// export function useApiClient(): ApiClient {
//   const [client] = useState(() => getApiClient());
//   return client;
// }