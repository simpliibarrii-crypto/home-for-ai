/**
 * tradeStore.ts — Zustand store for orders and positions
 */
import { create } from 'zustand';

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop';
export type OrderStatus = 'pending' | 'open' | 'filled' | 'cancelled' | 'rejected';

export interface Order {
  id: string;
  pair: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  amount: number;
  filled: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Position {
  id: string;
  pair: string;
  side: OrderSide;
  entryPrice: number;
  currentPrice: number;
  size: number;
  pnl: number;
  pnlPct: number;
  openedAt: Date;
}

interface TradeStore {
  orders: Order[];
  positions: Position[];
  activePair: string;
  loading: boolean;

  // Actions
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, update: Partial<Order>) => void;
  cancelOrder: (id: string) => void;
  setPositions: (positions: Position[]) => void;
  setActivePair: (pair: string) => void;
  setLoading: (loading: boolean) => void;
}

const MOCK_ORDERS: Order[] = [
  {
    id: '1',
    pair: 'BTC/USDC',
    side: 'buy',
    type: 'limit',
    price: 94500,
    amount: 0.001,
    filled: 0,
    status: 'open',
    createdAt: new Date(Date.now() - 600000),
    updatedAt: new Date(Date.now() - 600000),
  },
];

const MOCK_POSITIONS: Position[] = [
  {
    id: '1',
    pair: 'ETH/USDC',
    side: 'buy',
    entryPrice: 3750,
    currentPrice: 3814.55,
    size: 0.5,
    pnl: 32.28,
    pnlPct: 1.72,
    openedAt: new Date(Date.now() - 86400000),
  },
];

export const useTradeStore = create<TradeStore>((set) => ({
  orders: MOCK_ORDERS,
  positions: MOCK_POSITIONS,
  activePair: 'BTC/USDC',
  loading: false,

  setOrders: (orders) => set({ orders }),

  addOrder: (order) =>
    set((state) => ({ orders: [order, ...state.orders] })),

  updateOrder: (id, update) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? { ...o, ...update } : o)),
    })),

  cancelOrder: (id) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === id ? { ...o, status: 'cancelled' as OrderStatus } : o
      ),
    })),

  setPositions: (positions) => set({ positions }),

  setActivePair: (activePair) => set({ activePair }),

  setLoading: (loading) => set({ loading }),
}));
