if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn('[api] EXPO_PUBLIC_API_URL is not set — falling back to http://localhost:8080. Set it for production builds.');
}
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
export const API_URL = BASE_URL;

let authToken: string | null = null;
let refreshToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

export function setRefreshToken(token: string | null) {
  refreshToken = token;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

/** Thrown when the device has no network connection. */
export class NetworkError extends Error {
  readonly isNetworkError = true;
  constructor() {
    super("You're offline or the server is unreachable");
  }
}

/** Thrown when the request times out. */
export class TimeoutError extends Error {
  readonly isTimeoutError = true;
  constructor() {
    super('Request timed out');
  }
}

/** Thrown when the server returns a non-2xx response. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** Thrown specifically when the user has hit their monthly free-tier entry limit. */
export class SubscriptionLimitError extends Error {
  readonly isSubscriptionLimit = true;
  constructor(message: string) {
    super(message);
  }
}

async function rawFetch(path: string, options: RequestInit & { _headers?: Record<string, string> }): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    ...options._headers,
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    return await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new TimeoutError();
    }
    throw new NetworkError();
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await rawFetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as AuthTokens;
    authToken = data.access_token;
    refreshToken = data.refresh_token;
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res = await rawFetch(path, options);

  if (res.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await rawFetch(path, options);
    } else {
      onUnauthorized?.();
      throw new ApiError('Session expired. Please sign in again.', 401);
    }
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let code: string | undefined;
    try {
      const body = (await res.json()) as { error?: { message?: string; code?: string } };
      if (body.error?.message) message = body.error.message;
      if (body.error?.code) code = body.error.code;
    } catch {
      // response body wasn't JSON — fall back to status code message
    }
    throw new ApiError(message, res.status, code);
  }

  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export interface SubscriptionInfo {
  tier: string;
  is_active: boolean;
  entries_used: number;
  limit: number;
  expires_at: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  created_at?: string;
  ai_enabled: boolean;
  ai_consent_given_at?: string | null;
  subscription?: SubscriptionInfo;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface Entry {
  id: string;
  content: string;
  mood_score?: number;
  created_at: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  entry_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/** Returned by the respond endpoint on success. */
export type RespondResult = Message | { ai_error: true; ai_error_message: string };

/** Returned by the addMessage endpoint. */
export interface AddMessageResult {
  user_message: Message;
  assistant_message?: Message;
  ai_error?: boolean;
  ai_error_message?: string;
}

export interface ExportMessage {
  role: string;
  content: string;
  created_at: string;
}

export interface ExportEntry {
  id: string;
  content: string;
  mood_score: number | null;
  created_at: string;
  messages: ExportMessage[];
}

export interface ExportAuditEvent {
  action: string;
  ip_address: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ExportData {
  exported_at: string;
  user: {
    id: string;
    email: string;
    name: string;
    created_at: string;
    last_active_at: string;
    subscription_type: string;
    ai_enabled: boolean;
  };
  entries: ExportEntry[];
  audit_events: ExportAuditEvent[];
}

export interface Insights {
  total_entries: number;
  avg_mood_last_30: number | null;
  most_common_mood: number | null;
  current_streak: number;
  longest_streak: number;
  entries_this_month: number;
  entries_last_month: number;
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  refresh: (token: string) =>
    request<AuthTokens>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: token }),
    }),

  requestPasswordReset: (email: string) =>
    request<{ message: string }>('/api/auth/reset-password/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/api/auth/reset-password/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  getEntries: (page = 1) =>
    request<{ entries: Entry[]; page: number; limit: number; total: number }>(
      `/api/entries?page=${page}`,
    ),

  createEntry: async (content: string, mood_score?: number) => {
    try {
      return await request<Entry>('/api/entries', {
        method: 'POST',
        body: JSON.stringify({ content, mood_score }),
      });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'SUBSCRIPTION_LIMIT_REACHED') {
        throw new SubscriptionLimitError(e.message);
      }
      throw e;
    }
  },

  activateTrial: () =>
    request<{ tier: string; expires_at: string }>('/api/subscription/trial', {
      method: 'POST',
    }),

  getEntry: (id: string) => request<Entry>(`/api/entries/${id}`),

  respond: (entryId: string) =>
    request<RespondResult>(`/api/entries/${entryId}/respond`, { method: 'POST' }),

  addMessage: (entryId: string, content: string) =>
    request<AddMessageResult>(
      `/api/entries/${entryId}/messages`,
      { method: 'POST', body: JSON.stringify({ content }) },
    ),

  getMe: () => request<User>('/api/auth/me'),

  patchMe: (name: string) =>
    request<User>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  toggleAI: (enabled: boolean) =>
    request<{ ai_enabled: boolean }>('/api/auth/ai-toggle', {
      method: 'PATCH',
      body: JSON.stringify({ ai_enabled: enabled }),
    }),

  deleteEntries: () =>
    request<void>('/api/entries', { method: 'DELETE' }),

  deleteAccount: () =>
    request<void>('/api/auth/me', { method: 'DELETE' }),

  exportData: () =>
    request<ExportData>('/api/export'),

  getInsights: () =>
    request<Insights>('/api/insights'),
};
