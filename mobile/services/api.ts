const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
export const API_URL = BASE_URL;

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
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
  subscription?: SubscriptionInfo;
}

export interface AuthResponse {
  token: string;
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

export interface ExportData {
  exported_at: string;
  user: {
    id: string;
    email: string;
    name: string;
    created_at: string;
    subscription_type: string;
    ai_enabled: boolean;
  };
  entries: ExportEntry[];
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
