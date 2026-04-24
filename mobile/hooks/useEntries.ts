import { useCallback, useState } from 'react';
import { api, Entry, NetworkError } from '../services/api';
import { useAuth } from './useAuth';

interface EntriesState {
  entries: Entry[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  hasMore: boolean;
  fetchEntries: () => Promise<void>;
  loadMore: () => Promise<void>;
  createEntry: (content: string, moodScore?: number) => Promise<Entry>;
}

export function useEntries(): EntriesState {
  const { updateUser } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);
    try {
      const res = await api.getEntries(1);
      setEntries(res.entries);
      setPage(1);
      // hasMore is correct when loaded count < total, not when == limit
      setHasMore(res.entries.length < res.total);
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

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await api.getEntries(nextPage);
      setEntries((prev) => {
        const combined = [...prev, ...res.entries];
        setHasMore(combined.length < res.total);
        return combined;
      });
      setPage(nextPage);
    } catch (e: unknown) {
      if (e instanceof NetworkError) setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page]);

  const createEntry = useCallback(async (content: string, moodScore?: number): Promise<Entry> => {
    setIsOffline(false);
    setError(null);
    try {
      const entry = await api.createEntry(content, moodScore);
      setEntries((prev) => [entry, ...prev]);
      // Refresh subscription count so the entry limit UI stays accurate.
      api.getMe().then((user) => updateUser(user)).catch(() => undefined);
      return entry;
    } catch (e: unknown) {
      if (e instanceof NetworkError) setIsOffline(true);
      setError(e instanceof Error ? e.message : 'Failed to create entry');
      throw e;
    }
  }, [updateUser]);

  return { entries, loading, error, isOffline, hasMore, fetchEntries, loadMore, createEntry };
}
