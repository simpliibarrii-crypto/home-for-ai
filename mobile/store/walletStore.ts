/**
 * walletStore.ts — Zustand store for wallet
 */
import { create } from 'zustand';

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  address: string;
}

interface WalletStore {
  balances: TokenBalance[];
  totalUSD: number;
  loading: boolean;
  hideBalances: boolean;

  // Actions
  setBalances: (balances: TokenBalance[]) => void;
  setLoading: (loading: boolean) => void;
  toggleHideBalances: () => void;
  updateBalance: (symbol: string, balance: number, usdValue: number) => void;
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  balances: [],
  totalUSD: 0,
  loading: false,
  hideBalances: false,

  setBalances: (balances) =>
    set({
      balances,
      totalUSD: balances.reduce((sum, b) => sum + b.usdValue, 0),
    }),

  setLoading: (loading) => set({ loading }),

  toggleHideBalances: () => set((state) => ({ hideBalances: !state.hideBalances })),

  updateBalance: (symbol, balance, usdValue) =>
    set((state) => {
      const balances = state.balances.map((b) =>
        b.symbol === symbol ? { ...b, balance, usdValue } : b
      );
      return {
        balances,
        totalUSD: balances.reduce((sum, b) => sum + b.usdValue, 0),
      };
    }),
}));
