import { ApiError } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || (
  process.env.NODE_ENV === 'production'
    ? 'https://stream-tv-server-liart.vercel.app'
    : 'http://localhost:5050'
);

if (typeof window !== 'undefined') {
  if (window.location.hostname !== 'localhost' && API_URL.includes('localhost')) {
    console.warn(
      '⚠️ Using localhost API URL in production. Set NEXT_PUBLIC_API_URL in your deployment.'
    );
  }
}

export const API_BASE = API_URL;

export const TOKEN_KEY = 'stream_token';
export const USER_KEY = 'stream_user';

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export { getToken };

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredUser<T = unknown>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStoredUser<T = unknown>(user: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return base;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const error: ApiError = typeof data === 'object' && data !== null
      ? (data as ApiError)
      : { message: response.statusText || 'Request failed' };

    if (response.status === 401) {
      clearAuth();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        const returnTo = window.location.pathname + window.location.search;
        window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
      }
    }

    throw new ApiClientError(
      error.message || 'Request failed',
      response.status,
      error.code,
      error.details
    );
  }

  return data as T;
}

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, query, skipAuth, headers, ...rest } = options;

  const token = getToken();
  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (!(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  if (!skipAuth && token) {
    finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const init: RequestInit = {
    ...rest,
    headers: finalHeaders,
  };

  if (body !== undefined) {
    if (body instanceof FormData) {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
    }
  }

  const url = buildUrl(path, query);
  const response = await fetch(url, init);
  return handleResponse<T>(response);
}

export const apiGet = <T = unknown>(path: string, query?: RequestOptions['query']) =>
  api<T>(path, { method: 'GET', query });

export const apiPost = <T = unknown>(path: string, body?: unknown, query?: RequestOptions['query']) =>
  api<T>(path, { method: 'POST', body, query });

export const apiPatch = <T = unknown>(path: string, body?: unknown, query?: RequestOptions['query']) =>
  api<T>(path, { method: 'PATCH', body, query });

export const apiPut = <T = unknown>(path: string, body?: unknown, query?: RequestOptions['query']) =>
  api<T>(path, { method: 'PUT', body, query });

export const apiDelete = <T = unknown>(path: string, query?: RequestOptions['query']) =>
  api<T>(path, { method: 'DELETE', query });

export async function uploadFile<T = unknown>(
  path: string,
  file: File,
  fieldName = 'file',
  fields: Record<string, string> = {},
  onProgress?: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = getToken();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = xhr.responseText;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
      } else {
        const errorData = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null;
        const message = (errorData && typeof errorData.message === 'string')
          ? errorData.message
          : 'Upload failed';
        if (xhr.status === 401) {
          clearAuth();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
        reject(new ApiClientError(message, xhr.status, errorData?.code as string | undefined));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new ApiClientError('Network error during upload', 0));
    });

    xhr.addEventListener('abort', () => {
      reject(new ApiClientError('Upload cancelled', 0));
    });

    const formData = new FormData();
    formData.append(fieldName, file);
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const url = buildUrl(path);
    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}
