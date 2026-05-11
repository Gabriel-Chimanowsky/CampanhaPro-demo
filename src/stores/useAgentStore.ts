import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AgentMessage {
  id?: string;
  role: 'user' | 'agent';
  content: string;
  metadata?: any;
}

interface AgentState {
  histories: Record<string, AgentMessage[]>; // agent_id -> messages
  activeTab: string;
  warRoomResult: any | null;
  warRoomStep: number;
  setHistory: (agentId: string, messages: AgentMessage[]) => void;
  addMessage: (agentId: string, message: AgentMessage) => void;
  setActiveTab: (tab: string) => void;
  setWarRoomResult: (result: any | null) => void;
  setWarRoomStep: (step: number) => void;
  clearHistory: (agentId: string) => void;
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
      histories: {},
      activeTab: 'war-room',
      warRoomResult: null,
      warRoomStep: 0,
      setHistory: (agentId, messages) => 
        set((state) => ({
          histories: { ...state.histories, [agentId]: messages }
        })),
      addMessage: (agentId, message) =>
        set((state) => {
          const currentHistory = state.histories[agentId] || [];
          return {
            histories: { ...state.histories, [agentId]: [...currentHistory, message] }
          };
        }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setWarRoomResult: (result) => set({ warRoomResult: result }),
      setWarRoomStep: (step) => set({ warRoomStep: step }),
      clearHistory: (agentId) =>
        set((state) => {
          const newHistories = { ...state.histories };
          delete newHistories[agentId];
          return { histories: newHistories };
        }),
    }),
    {
      name: 'campanha-pro-agents-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
