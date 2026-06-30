/**
 * agentStore.ts — Zustand store for agent state
 */
import { create } from 'zustand';
import { Agent } from '@/components/AgentCard';

interface AgentStore {
  agents: Agent[];
  selectedAgentId: string | null;
  copyEnabledIds: Set<string>;

  // Actions
  setAgents: (agents: Agent[]) => void;
  selectAgent: (id: string | null) => void;
  toggleCopy: (id: string) => void;
  updateAgent: (id: string, update: Partial<Agent>) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: [],
  selectedAgentId: null,
  copyEnabledIds: new Set(),

  setAgents: (agents) => set({ agents }),

  selectAgent: (id) => set({ selectedAgentId: id }),

  toggleCopy: (id) =>
    set((state) => {
      const next = new Set(state.copyEnabledIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { copyEnabledIds: next };
    }),

  updateAgent: (id, update) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...update } : a)),
    })),
}));
