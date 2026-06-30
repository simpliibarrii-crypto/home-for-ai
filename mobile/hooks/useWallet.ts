/**
 * useWallet — Wallet state hook
 */
import { useWalletStore } from '@/store/walletStore';
import { useCallback } from 'react';
import { api } from '@/lib/api';

export function useWallet() {
  const { balances, setBalances, loading, setLoading } = useWalletStore();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/wallet/balances');
      setBalances(response.data);
    } catch {
      // Use existing mock state
    } finally {
      setLoading(false);
    }
  }, [setBalances, setLoading]);

  return { balances, loading, refresh };
}
