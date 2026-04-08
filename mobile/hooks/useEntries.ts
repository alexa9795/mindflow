import { useCallback, useState } from 'react';
import { api, Entry, Message, NetworkError } from '../services/api';

interface EntriesState {
  entries: Entry[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  fetchEntries: () => Promise<void>;
  createEntry: (content: string, moodScore?: number) => Promise<Entry>;
  requestAIResponse: (entryId: string) => Promise<Message>;
}

export function useEntries(): EntriesState {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);
    try {
      const res = await api.getEntries();
      setEntries(res.entries);
    } catch (e: unknown) {
      if (e instanceof NetworkError) {
        setIsOffline(true);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load entries');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const createEntry = useCallback(async (content: string, moodScore?: number): Promise<Entry> => {
    setIsOffline(false);
    try {
      const entry = await api.createEntry(content, moodScore);
      setEntries((prev) => [entry, ...prev]);
      return entry;
    } catch (e: unknown) {
      if (e instanceof NetworkError) setIsOffline(true);
      throw e;
    }
  }, []);

  const requestAIResponse = useCallback(async (entryId: string): Promise<Message> => {
    setIsOffline(false);
    try {
      return await api.respond(entryId);
    } catch (e: unknown) {
      if (e instanceof NetworkError) setIsOffline(true);
      throw e;
    }
  }, []);

  return { entries, loading, error, isOffline, fetchEntries, createEntry, requestAIResponse };
}
