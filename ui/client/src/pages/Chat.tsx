import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, Mic } from "lucide-react";
import type { Agent, Message } from "@shared/schema";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AgentListItem({
  agent,
  active,
  onClick,
  lastMessage,
}: {
  agent: Agent;
  active: boolean;
  onClick: () => void;
  lastMessage?: Message;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={`agent-list-item-${agent.id}`}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all rounded-xl mx-2 mb-1 ${
        active
          ? "bg-[#4F46E5]/15 border border-[#4F46E5]/30"
          : "hover:bg-white/[0.04] border border-transparent"
      }`}
    >
      <div className="text-xl flex-shrink-0 mt-0.5">{agent.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-display font-semibold text-sm text-white/85">{agent.name}</span>
          {lastMessage && (
            <span className="text-[10px] text-white/25">{formatTime(lastMessage.timestamp)}</span>
          )}
        </div>
        <p className="text-[11px] text-white/35 truncate mt-0.5">
          {lastMessage ? lastMessage.content : "No messages yet"}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <div className={`w-1.5 h-1.5 rounded-full ${
            agent.status === "TRADING" ? "bg-[#818CF8] animate-pulse" :
            agent.status === "ANALYZING" ? "bg-[#22D3EE]" : "bg-white/20"
          }`} />
          <span className="text-[9px] text-white/30">{agent.asset}</span>
        </div>
      </div>
    </button>
  );
}

export default function ChatPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<number>(1);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/agents", selectedAgentId, "messages"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/agents/${selectedAgentId}/messages`);
      return res.json() as Promise<Message[]>;
    },
  });

  const selectedAgent = agents?.find((a) => a.id === selectedAgentId);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      // Post user message
      const res = await apiRequest("POST", `/api/agents/${selectedAgentId}/messages`, {
        agentId: selectedAgentId,
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      });
      await res.json();
      // Simulate agent reply after short delay
      await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
      const agentReplies = [
        `Analyzing your message now. My current ${selectedAgent?.asset} position is holding strong — monitoring closely.`,
        `Understood. I'll factor that into my next trade decision. Current market conditions for ${selectedAgent?.asset} look ${Math.random() > 0.5 ? "bullish" : "cautious"}.`,
        `Good point. I've updated my risk parameters. My win rate this week is ${selectedAgent?.winRate ?? 70}% — on track.`,
        `Roger that. I'm watching ${selectedAgent?.asset} for the next breakout signal. Will alert you before I execute.`,
        `Market sentiment on ${selectedAgent?.asset} just shifted. I'm adjusting position size by 15% to manage exposure.`,
        `I've logged your preference. Next trade I'll confirm with you first before entering a position above $1,000.`,
      ];
      const reply = agentReplies[Math.floor(Math.random() * agentReplies.length)];
      const replyRes = await apiRequest("POST", `/api/agents/${selectedAgentId}/messages`, {
        agentId: selectedAgentId,
        role: "agent",
        content: reply,
        timestamp: new Date().toISOString(),
      });
      return replyRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents", selectedAgentId, "messages"] });
    },
  });

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content) return;
    sendMessage.mutate(content);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Collect last messages per agent for sidebar preview
  const getLastMessage = (agentId: number) => {
    // We'll use a simple heuristic — not perfect but good for UI
    return undefined;
  };

  return (
    <div className="flex h-[calc(100vh-48px-56px)] lg:h-[calc(100vh-48px)] animate-fade-in">
      {/* Agent list sidebar */}
      <aside className="hidden md:flex flex-col w-72 border-r border-white/[0.05] flex-shrink-0 py-4 overflow-y-auto">
        <div className="px-4 mb-3">
          <h2 className="font-display font-semibold text-sm text-white/60">Conversations</h2>
        </div>
        {agents?.map((agent) => (
          <AgentListItem
            key={agent.id}
            agent={agent}
            active={agent.id === selectedAgentId}
            onClick={() => setSelectedAgentId(agent.id)}
            lastMessage={undefined}
          />
        ))}
      </aside>

      {/* Chat main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        {selectedAgent && (
          <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.05] flex-shrink-0 glass">
            <div className={`text-2xl ${selectedAgent.status === "TRADING" ? "agent-pulse" : ""}`}>
              {selectedAgent.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-sm text-white/90">{selectedAgent.name}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  selectedAgent.status === "TRADING" ? "bg-[#818CF8] animate-pulse" :
                  selectedAgent.status === "ANALYZING" ? "bg-[#22D3EE]" : "bg-white/20"
                }`} />
              </div>
              <p className="text-[11px] text-white/40">
                {selectedAgent.emoji} {selectedAgent.name} is currently trading {selectedAgent.asset}
                {" · "}
                <span className={selectedAgent.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {selectedAgent.pnl >= 0 ? "+" : ""}${Math.abs(selectedAgent.pnl).toLocaleString()} today
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messagesLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                  <div className="glass rounded-2xl h-12 w-64 animate-pulse" />
                </div>
              ))}
            </div>
          ) : messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-white/25">
              <div className="text-5xl">{selectedAgent?.emoji}</div>
              <p className="text-sm">No messages yet. Start a conversation.</p>
            </div>
          ) : (
            messages?.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                data-testid={`message-${msg.id}`}
              >
                {msg.role === "agent" && (
                  <div className="w-8 h-8 rounded-full glass flex items-center justify-center text-lg flex-shrink-0 mt-0.5">
                    {selectedAgent?.emoji}
                  </div>
                )}
                <div className="max-w-[70%] space-y-1">
                  {msg.role === "agent" && (
                    <span className="text-[10px] text-white/30 px-1">{selectedAgent?.name}</span>
                  )}
                  <div className={`px-4 py-3 ${msg.role === "agent" ? "chat-bubble-agent" : "chat-bubble-user"}`}>
                    <p className="text-sm text-white/85 leading-relaxed">{msg.content}</p>
                  </div>
                  <div className={`text-[10px] text-white/25 px-1 ${msg.role === "user" ? "text-right" : ""}`}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-5 py-4 border-t border-white/[0.05] flex-shrink-0 glass">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Speak to your agents..."
                data-testid="chat-input"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white/85 placeholder-white/25 outline-none focus:border-[#4F46E5]/50 focus:bg-[#4F46E5]/5 transition-all"
              />
            </div>
            <button
              className="w-10 h-10 rounded-xl glass hover:bg-white/[0.06] flex items-center justify-center text-white/35 hover:text-white/70 transition-all flex-shrink-0"
              title="Voice input"
            >
              <Mic size={16} />
            </button>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || sendMessage.isPending}
              data-testid="send-button"
              className="w-10 h-10 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all flex-shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
