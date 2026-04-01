import Constants from 'expo-constants';

// Automatically uses the right IP when running in Expo Go on a device
const host = Constants.expoConfig?.hostUri?.split(':').shift() ?? 'localhost';
export const API_URL = `http://${host}:8080`;
console.log('[API] URL:', API_URL);

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.trim() || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface User {
  id: string;
  email: string;
  name: string;
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
    request<{ entries: Entry[]; page: number; limit: number }>(`/api/entries?page=${page}`),

  createEntry: (content: string, mood_score?: number) =>
    request<Entry>('/api/entries', {
      method: 'POST',
      body: JSON.stringify({ content, mood_score }),
    }),

  getEntry: (id: string) =>
    request<Entry>(`/api/entries/${id}`),

  respond: (entryId: string) =>
    request<Message>(`/api/entries/${entryId}/respond`, { method: 'POST' }),

  addMessage: (entryId: string, content: string) =>
    request<{ user_message: Message; assistant_message: Message }>(
      `/api/entries/${entryId}/messages`,
      { method: 'POST', body: JSON.stringify({ content }) }
    ),
};
