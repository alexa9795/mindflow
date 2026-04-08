import Constants from 'expo-constants';

// Automatically uses the right IP when running in Expo Go on a device
const host = Constants.expoConfig?.hostUri?.split(':').shift() ?? 'localhost';
export const API_URL = `http://${host}:8080`;

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

/** Thrown when the server returns a non-2xx response. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
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

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new NetworkError();
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      // response body wasn't JSON — fall back to status code message
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  created_at?: string;
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
    request<{ entries: Entry[]; page: number; limit: number }>(
      `/api/entries?page=${page}`,
    ),

  createEntry: (content: string, mood_score?: number) =>
    request<Entry>('/api/entries', {
      method: 'POST',
      body: JSON.stringify({ content, mood_score }),
    }),

  getEntry: (id: string) => request<Entry>(`/api/entries/${id}`),

  respond: (entryId: string) =>
    request<Message>(`/api/entries/${entryId}/respond`, { method: 'POST' }),

  addMessage: (entryId: string, content: string) =>
    request<{ user_message: Message; assistant_message: Message }>(
      `/api/entries/${entryId}/messages`,
      { method: 'POST', body: JSON.stringify({ content }) },
    ),

  getMe: () => request<User>('/api/auth/me'),

  patchMe: (name: string) =>
    request<User>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  deleteEntries: () =>
    request<void>('/api/entries', { method: 'DELETE' }),

  deleteAccount: () =>
    request<void>('/api/auth/me', { method: 'DELETE' }),
};
