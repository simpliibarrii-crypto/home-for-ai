/**
 * useMarket — Market data hook
 */
import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export function useMarket() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // In production: await api.get('/api/market/indices');
      // For now, data is static in the component (MOCK_INDICES)
      await new Promise(r => setTimeout(r, 600)); // Simulate network delay
      setLastUpdated(new Date());
    } catch (err) {
      setError('Market data unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, lastUpdated, refresh };
}
