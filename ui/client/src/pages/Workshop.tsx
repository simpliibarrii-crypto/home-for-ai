import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import Sparkline from "@/components/Sparkline";
import { MessageCircle, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import type { Agent } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

const MARKET_TICKERS = [
  { symbol: "BTC", price: "$67,234", change: "+2.3%", up: true },
  { symbol: "ETH", price: "$3,891", change: "+1.8%", up: true },
  { symbol: "AAPL", price: "$189.44", change: "+0.9%", up: true },
  { symbol: "EUR/USD", price: "1.0823", change: "-0.1%", up: false },
  { symbol: "Gold", price: "$2,341", change: "+0.7%", up: true },
  { symbol: "S&P500", price: "5,234", change: "+1.2%", up: true },
  { symbol: "NVDA", price: "$487.22", change: "+2.1%", up: true },
  { symbol: "SOL", price: "$168.42", change: "+4.2%", up: true },
  { symbol: "TSLA", price: "$248.73", change: "-1.4%", up: false },
  { symbol: "MSFT", price: "$415.27", change: "+0.6%", up: true },
  { symbol: "GBP/USD", price: "1.2734", change: "+0.2%", up: true },
  { symbol: "WTI Oil", price: "$77.45", change: "-0.8%", up: false },
];

// ─── How It Works Section ─────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: "🤖",
    title: "AI agents trade 24/7",
    desc: "Our agents analyze stocks, crypto, forex, and more around the clock — scanning for high-probability opportunities while you sleep.",
  },
  {
    step: 2,
    icon: "📋",
    title: "Enable copy trade on any agent",
    desc: "Toggle copy trade on any agent and we instantly mirror their positions in your account, proportionally sized to your balance.",
  },
  {
    step: 3,
    icon: "💰",
    title: "You keep 85% of profits",
    desc: "We only take 15% when you profit — zero fees when trades lose. Your success is our success.",
  },
];

const HOW_HIDDEN_KEY = "howItWorksCollapsed";

function HowItWorks() {
  const [collapsed, setCollapsed] = useState(false);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    // Persist to server settings (non-critical)
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "howItWorksCollapsed", value: String(next) }),
    }).catch(() => {});
  }

  return (
    <div className="glass rounded-2xl overflow-hidden border border-[#4F46E5]/20">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] animate-pulse" />
          <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">How it Works</span>
        </div>
        {collapsed
          ? <ChevronDown size={14} className="text-white/30" />
          : <ChevronUp size={14} className="text-white/30" />
        }
      </button>

      {!collapsed && (
        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex gap-3">
                {/* Step number + icon */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-xl bg-[#4F46E5]/15 border border-[#4F46E5]/25 flex items-center justify-center text-base">
                    {item.icon}
                  </div>
                  {item.step < 3 && (
                    <div className="hidden sm:block w-px flex-1 bg-[#4F46E5]/15 my-1" />
                  )}
                </div>
                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#4F46E5]/70 font-mono">STEP {item.step}</span>
                  </div>
                  <p className="text-sm font-semibold text-white/80 leading-tight">{item.title}</p>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "TRADING" ? "badge-trading" :
    status === "ANALYZING" ? "badge-analyzing" :
    "badge-idle";

  const dot =
    status === "TRADING" ? "bg-[#818CF8]" :
    status === "ANALYZING" ? "bg-[#22D3EE]" :
    "bg-white/25";

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === "TRADING" ? "animate-pulse" : ""}`} />
      {status}
    </span>
  );
}

// ─── Market Pill ─────────────────────────────────────────────────────────────
function MarketPill({ market }: { market: string }) {
  const colors: Record<string, string> = {
    Stocks: "text-blue-300 bg-blue-500/10 border-blue-500/20",
    Crypto: "text-purple-300 bg-purple-500/10 border-purple-500/20",
    Forex: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    Bonds: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    Commodities: "text-orange-300 bg-orange-500/10 border-orange-500/20",
  };
  return (
    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${colors[market] || "text-white/40 bg-white/5 border-white/10"}`}>
      {market}
    </span>
  );
}

// ─── Agent Card ───────────────────────────────────────────────────────────────
function AgentCard({ agent }: { agent: Agent }) {
  const isTrading = agent.status === "TRADING";
  const isPositive = agent.pnl >= 0;
  const sparkData = (() => { try { return JSON.parse(agent.sparklineData); } catch { return []; } })();

  const copyTradeMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest("PATCH", `/api/agents/${agent.id}/copy-trade`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agents"] }),
  });

  return (
    <div
      data-testid={`agent-card-${agent.id}`}
      className={`glass rounded-2xl p-5 flex flex-col gap-3 cursor-default group relative overflow-hidden
        ${isTrading ? "agent-trading" : "hover:border-white/15"}
        ${agent.copyTradeEnabled ? "copy-trade-active" : ""}
      `}
    >
      {/* Background glow */}
      {isTrading && (
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#4F46E5]/10 blur-2xl pointer-events-none" />
      )}

      {/* Header: emoji + status */}
      <div className="flex items-start justify-between">
        <div className={`text-3xl leading-none ${isTrading ? "agent-pulse" : ""}`}>
          {agent.emoji}
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {/* Name + asset */}
      <div>
        <h3 className="font-display font-bold text-base text-white/90 leading-tight">{agent.name}</h3>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="font-mono text-xs text-white/40">{agent.asset}</span>
          <MarketPill market={agent.market} />
        </div>
      </div>

      {/* PnL */}
      <div>
        <div className={`font-mono font-semibold text-lg leading-none ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {isPositive ? "+" : "-"}${Math.abs(agent.pnl).toLocaleString()}
        </div>
        <div className={`flex items-center gap-1 mt-0.5 text-xs font-mono ${isPositive ? "text-emerald-500/70" : "text-red-500/70"}`}>
          {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {isPositive ? "+" : ""}{agent.pnlPercent.toFixed(1)}%
        </div>
      </div>

      {/* Sparkline */}
      <div className="flex items-center">
        <Sparkline data={sparkData} width={100} height={28} positive={isPositive} />
      </div>

      {/* Footer: Copy Trade + Chat */}
      <div className="flex items-center justify-between mt-1">
        {/* Copy Trade Toggle */}
        <label className="flex items-center gap-2 cursor-pointer" title="Copy Trade">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={agent.copyTradeEnabled === 1}
              onChange={(e) => copyTradeMutation.mutate(e.target.checked)}
              data-testid={`copy-trade-toggle-${agent.id}`}
            />
            <div className={`w-9 h-5 rounded-full transition-all duration-200 ${
              agent.copyTradeEnabled ? "bg-amber-500/80" : "bg-white/10"
            }`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all duration-200 ${
                agent.copyTradeEnabled
                  ? "left-[calc(100%-18px)] bg-amber-300"
                  : "left-0.5 bg-white/40"
              }`} />
            </div>
          </div>
          <span className={`text-[10px] font-medium ${agent.copyTradeEnabled ? "text-amber-400" : "text-white/30"}`}>
            Copy
          </span>
        </label>

        {/* Chat button */}
        <Link href="/chat">
          <button
            className="flex items-center gap-1 text-[10px] text-white/35 hover:text-[#4F46E5] px-2 py-1 rounded-lg hover:bg-[#4F46E5]/10 transition-all"
            data-testid={`chat-btn-${agent.id}`}
          >
            <MessageCircle size={11} />
            Chat
          </button>
        </Link>
      </div>
    </div>
  );
}

// ─── Agent Card Skeleton ──────────────────────────────────────────────────────
function AgentCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="w-16 h-5 rounded-full" />
      </div>
      <div>
        <Skeleton className="h-5 w-20 mb-1" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-7 w-28 rounded-lg" />
      <div className="flex justify-between">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

// ─── Workshop Page ────────────────────────────────────────────────────────────
export default function WorkshopPage() {
  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="font-display font-bold text-xl text-white/90">Workshop</h1>
        <p className="text-sm text-white/35 mt-0.5">Your AI agents, trading around the clock</p>
      </div>

      {/* How It Works — collapsible explainer (above agent cards) */}
      <HowItWorks />

      {/* Agent Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents?.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      {/* Market Pulse Ticker */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.05]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse" />
          <span className="text-[10px] font-medium text-white/40 tracking-widest uppercase">Market Pulse</span>
        </div>
        <div className="ticker-wrap py-3">
          <div className="ticker-content">
            {/* Duplicate for seamless loop */}
            {[...MARKET_TICKERS, ...MARKET_TICKERS].map((ticker, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-5 border-r border-white/[0.05] last:border-r-0"
              >
                <span className="font-mono text-xs font-semibold text-white/70">{ticker.symbol}</span>
                <span className="font-mono text-xs text-white/50">{ticker.price}</span>
                <span className={`font-mono text-[10px] font-medium flex items-center gap-0.5 ${
                  ticker.up ? "text-emerald-400" : "text-red-400"
                }`}>
                  {ticker.up ? "↑" : "↓"}{ticker.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer badges */}
      <div className="flex items-center gap-3 pb-2">
        <span className="footer-badge">🔒 Bank-grade encryption</span>
        <span className="footer-badge">AES-256 · TLS 1.3</span>
        <span className="footer-badge">SOC 2 Compliant</span>
      </div>
    </div>
  );
}
