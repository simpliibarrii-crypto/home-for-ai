/**
 * useAgents — Fetches agent data from API_BASE_URL/api/agents
 */
import { useState, useEffect, useCallback } from 'react';
import { Agent } from '@/components/AgentCard';
import { api } from '@/lib/api';

const MOCK_AGENTS: Agent[] = [
  { id: '1', name: 'Luna',    emoji: '🌙', strategy: 'Momentum',     pnl: +18.4, pnlAbs: 8760,  winRate: 68, trades: 142, status: 'active', copy: false, spark: [100, 105, 112, 108, 115, 118] },
  { id: '2', name: 'Orion',   emoji: '⭐', strategy: 'Mean Revert',  pnl: +11.2, pnlAbs: 5320,  winRate: 72, trades: 89,  status: 'active', copy: true,  spark: [100, 98, 103, 106, 110, 111] },
  { id: '3', name: 'Nova',    emoji: '🔥', strategy: 'Breakout',     pnl: -3.1,  pnlAbs: -1470, winRate: 44, trades: 61,  status: 'idle',   copy: false, spark: [100, 102, 99, 97, 96, 96.9] },
  { id: '4', name: 'Cosmo',   emoji: '🌌', strategy: 'Arbitrage',    pnl: +7.8,  pnlAbs: 3710,  winRate: 61, trades: 203, status: 'active', copy: false, spark: [100, 101, 103, 105, 107, 107.8] },
  { id: '5', name: 'Stella',  emoji: '✨', strategy: 'Trend Follow', pnl: +4.2,  pnlAbs: 2000,  winRate: 55, trades: 78,  status: 'idle',   copy: true,  spark: [100, 99, 101, 102, 104, 104.2] },
  { id: '6', name: 'Nebula',  emoji: '🌀', strategy: 'Grid Trading', pnl: +2.1,  pnlAbs: 998,   winRate: 80, trades: 412, status: 'idle',   copy: false, spark: [100, 100.5, 101, 101.5, 102, 102.1] },
  { id: '7', name: 'Quasar',  emoji: '💎', strategy: 'DCA',          pnl: +6.5,  pnlAbs: 3090,  winRate: 100, trades: 24, status: 'active', copy: false, spark: [100, 101, 102, 103, 105, 106.5] },
  { id: '8', name: 'Pulsar',  emoji: '⚡', strategy: 'Scalping',     pnl: -1.2,  pnlAbs: -570,  winRate: 49, trades: 891, status: 'paused', copy: false, spark: [100, 101, 99, 98, 98.5, 98.8] },
];

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Agent[]>('/api/agents');
      setAgents(response.data);
    } catch (err) {
      // Fall back to mock data if API is unavailable
      setAgents(MOCK_AGENTS);
      setError('Using mock data — API unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { agents, loading, error, refresh };
}
