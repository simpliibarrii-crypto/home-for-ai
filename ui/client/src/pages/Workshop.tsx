import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import Sparkline from "@/components/Sparkline";
import {
  MessageCircle, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Users, Activity, Zap
} from "lucide-react";
import type { Agent } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FeedItem {
  id: number;
  agentName: string;
  agentEmoji: string;
  side: "BUY" | "SELL";
  asset: string;
  price: number;
  amount: number;
  timeAgo: number;
}

// ─── Flash Price Component ─────────────────────────────────────────────────────
function FlashNumber({
  value,
  className = "",
  prefix = "",
  suffix = "",
  decimals = 2,
}: {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value !== prevRef.current) {
      setFlash(value > prevRef.current ? "up" : "down");
      prevRef.current = value;
      const t = setTimeout(() => setFlash(null), 600);
      return () => clearTimeout(t);
    }
  }, [value]);

  const flashClass =
    flash === "up"
      ? "bg-emerald-500/20 transition-colors duration-300"
      : flash === "down"
      ? "bg-red-500/20 transition-colors duration-300"
      : "transition-colors duration-300";

  return (
    <span className={`rounded px-0.5 ${flashClass} ${className}`}>
      {prefix}{value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

// ─── Cat Emojis — fixed per agent slot ───────────────────────────────────────
const CAT_EMOJIS = ["🐱", "🐈", "🐈‍⬛", "🦁", "🐯", "🐻", "🐼", "🐨"];

// ─── Agent extra data seeded by id ────────────────────────────────────────────
function getAgentExtras(id: number) {
  const seed = id * 7919 + 13;
  const winRate = 40 + (Math.abs(Math.sin(seed)) * 35);
  const totalTrades = 120 + Math.floor(Math.abs(Math.cos(seed * 0.7)) * 480);
  const allTimePnl = (Math.sin(seed * 1.3) * 8000) + 3000;
  const subscribers = 10 + Math.floor(Math.abs(Math.sin(seed * 0.4)) * 340);
  const positions = ["LONG BTC", "SHORT ETH", "LONG SOL", "LONG BNB", "SHORT AVAX", "LONG MATIC", "LONG LINK", "SHORT DOT"];
  const positionIdx = Math.floor(Math.abs(Math.sin(seed * 0.9)) * positions.length);
  return {
    winRate: Math.round(winRate * 10) / 10,
    totalTrades,
    allTimePnl: Math.round(allTimePnl),
    subscribers,
    openPosition: positions[positionIdx % positions.length],
  };
}

// ─── How It Works Section ─────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  { step: 1, icon: "🤖", title: "AI agents trade 24/7", desc: "Our agents analyze crypto, stocks, forex, and more around the clock." },
  { step: 2, icon: "📋", title: "Enable copy trade on any agent", desc: "Toggle copy trade and we mirror positions in your account proportionally." },
  { step: 3, icon: "💰", title: "You keep 85% of profits", desc: "We only take 15% on wins — zero fees on losing trades." },
];

function HowItWorks() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="glass rounded-2xl overflow-hidden border border-[#4F46E5]/20">
      <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] animate-pulse" />
          <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">How it Works</span>
        </div>
        {collapsed ? <ChevronDown size={14} className="text-white/30" /> : <ChevronUp size={14} className="text-white/30" />}
      </button>
      {!collapsed && (
        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#4F46E5]/15 border border-[#4F46E5]/25 flex items-center justify-center text-base flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs font-bold text-[#4F46E5]/70 mb-0.5 font-mono">STEP {item.step}</p>
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
    status === "ANALYZING" ? "bg-[#22D3EE]" : "bg-white/25";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === "TRADING" ? "animate-pulse" : ""}`} />
      {status}
    </span>
  );
}

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

// ─── Win Rate Badge ───────────────────────────────────────────────────────────
function WinRateBadge({ rate }: { rate: number }) {
  const cls =
    rate > 55 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
    rate >= 45 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
    "text-red-400 bg-red-500/10 border-red-500/20";
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono ${cls}`}>
      {rate.toFixed(1)}% WR
    </span>
  );
}

// ─── Agent Card ───────────────────────────────────────────────────────────────
function AgentCard({ agent, idx }: { agent: Agent; idx: number }) {
  const isTrading = agent.status === "TRADING";
  const isPositive = agent.pnl >= 0;
  const sparkData = (() => { try { return JSON.parse(agent.sparklineData); } catch { return []; } })();
  const extras = getAgentExtras(agent.id);
  const emoji = CAT_EMOJIS[idx % CAT_EMOJIS.length];
  const isAllTimePnlPos = extras.allTimePnl >= 0;
  const [copyCount, setCopyCount] = useState(agent.copyTradeEnabled ? extras.subscribers : 0);

  const copyTradeMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest("PATCH", `/api/agents/${agent.id}/copy-trade`, { enabled }),
    onSuccess: (_data, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      setCopyCount(enabled ? extras.subscribers : 0);
    },
  });

  return (
    <div
      data-testid={`agent-card-${agent.id}`}
      className={`glass rounded-2xl p-4 flex flex-col gap-3 cursor-default group relative overflow-hidden
        ${isTrading ? "agent-trading" : "hover:border-white/15"}
        ${agent.copyTradeEnabled ? "copy-trade-active" : ""}
      `}
    >
      {isTrading && (
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#4F46E5]/10 blur-2xl pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className={`text-3xl leading-none ${isTrading ? "agent-pulse" : ""}`}>
          {emoji}
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {/* Name + position */}
      <div>
        <h3 className="font-display font-bold text-base text-white/90 leading-tight">{agent.name}</h3>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="font-mono text-[10px] text-[#06B6D4] bg-[#06B6D4]/10 px-1.5 py-0.5 rounded border border-[#06B6D4]/20">
            {extras.openPosition}
          </span>
          <MarketPill market={agent.market} />
        </div>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <WinRateBadge rate={extras.winRate} />
        <span className="text-[9px] text-white/30 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
          {extras.totalTrades.toLocaleString()} trades
        </span>
      </div>

      {/* Current PnL */}
      <div>
        <div className={`font-mono font-semibold text-base leading-none ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {isPositive ? "+" : "-"}${Math.abs(agent.pnl).toLocaleString()}
        </div>
        <div className={`flex items-center gap-1 mt-0.5 text-xs font-mono ${isPositive ? "text-emerald-500/70" : "text-red-500/70"}`}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {isPositive ? "+" : ""}{agent.pnlPercent.toFixed(1)}%
        </div>
      </div>

      {/* All-time PnL */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/30">All-time</span>
        <span className={`font-mono font-semibold ${isAllTimePnlPos ? "text-emerald-400" : "text-red-400"}`}>
          {isAllTimePnlPos ? "+" : "-"}${Math.abs(extras.allTimePnl).toLocaleString()}
        </span>
      </div>

      {/* Sparkline */}
      <div className="flex items-center">
        <Sparkline data={sparkData} width={100} height={24} positive={isPositive} />
      </div>

      {/* Copy Trade */}
      <div className="flex items-center justify-between mt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={agent.copyTradeEnabled === 1}
              onChange={(e) => copyTradeMutation.mutate(e.target.checked)}
              data-testid={`copy-trade-toggle-${agent.id}`}
            />
            <div className={`w-9 h-5 rounded-full transition-all duration-200 ${agent.copyTradeEnabled ? "bg-amber-500/80" : "bg-white/10"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all duration-200 ${
                agent.copyTradeEnabled ? "left-[calc(100%-18px)] bg-amber-300" : "left-0.5 bg-white/40"
              }`} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className={`text-[10px] font-medium leading-tight ${agent.copyTradeEnabled ? "text-amber-400" : "text-white/30"}`}>
              Copy Trade
            </span>
            {agent.copyTradeEnabled === 1 && (
              <span className="text-[9px] text-white/30 flex items-center gap-0.5">
                <Users size={8} /> {copyCount} subscribers
              </span>
            )}
          </div>
        </label>

        <Link href="/chat">
          <button className="flex items-center gap-1 text-[10px] text-white/35 hover:text-[#4F46E5] px-2 py-1 rounded-lg hover:bg-[#4F46E5]/10 transition-all">
            <MessageCircle size={11} />
            Chat
          </button>
        </Link>
      </div>
    </div>
  );
}

function AgentCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="w-16 h-5 rounded-full" />
      </div>
      <div>
        <Skeleton className="h-5 w-20 mb-1" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-6 w-28" />
      <div className="flex justify-between">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

// ─── Live P&L Ticker ─────────────────────────────────────────────────────────
function PnLTicker({ agents }: { agents: Agent[] }) {
  const totalValue = 47823 + agents.reduce((s, a) => s + a.pnl, 0);
  const change24h = agents.reduce((s, a) => s + a.pnl * 0.1, 0) + 1234;
  const changePct = (change24h / (totalValue - change24h)) * 100;
  const isUp = change24h >= 0;

  return (
    <div className="glass rounded-2xl p-5 border border-[#4F46E5]/20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-white/40 uppercase tracking-widest mb-1 font-mono">Portfolio Value</div>
          <div className="font-display font-bold text-3xl text-white">
            <FlashNumber value={totalValue} prefix="$" decimals={0} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex flex-col items-end ${isUp ? "text-emerald-400" : "text-red-400"}`}>
            <div className="flex items-center gap-1 text-lg font-mono font-bold">
              {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <FlashNumber value={Math.abs(change24h)} prefix={isUp ? "+$" : "-$"} decimals={0} className="" />
            </div>
            <div className="text-sm font-mono">
              {isUp ? "+" : "-"}{Math.abs(changePct).toFixed(2)}% (24h)
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ${isUp ? "bg-emerald-400" : "bg-red-400"} animate-pulse`} />
        </div>
      </div>
    </div>
  );
}

// ─── Market Overview Strip ────────────────────────────────────────────────────
const MARKET_OVERVIEW = [
  { symbol: "BTC", name: "Bitcoin",  price: 67234, change: 2.3 },
  { symbol: "ETH", name: "Ethereum", price: 3412,  change: 1.87 },
  { symbol: "BNB", name: "BNB",      price: 610,   change: 0.88 },
  { symbol: "SOL", name: "Solana",   price: 187,   change: 4.21 },
];

function MarketOverviewStrip() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {MARKET_OVERVIEW.map((m) => {
        const up = m.change >= 0;
        return (
          <div key={m.symbol} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${up ? "bg-emerald-400" : "bg-red-400"}`} />
              <div>
                <div className="font-mono text-xs font-bold text-white/80">{m.symbol}</div>
                <div className="text-[10px] text-white/30">{m.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs text-white/70">${m.price.toLocaleString()}</div>
              <div className={`font-mono text-[10px] font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
                {up ? "+" : ""}{m.change.toFixed(2)}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Live Trade Feed ─────────────────────────────────────────────────────────
function LiveTradeFeed() {
  const { data: feed } = useQuery<FeedItem[]>({
    queryKey: ["/api/agents/feed"],
    refetchInterval: 15000,
  });

  const [displayFeed, setDisplayFeed] = useState<FeedItem[]>([]);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!feed) return;
    const prev = displayFeed.map((f) => f.id);
    const incoming = feed.filter((f) => !prev.includes(f.id));
    if (incoming.length > 0) {
      setNewIds(new Set(incoming.map((f) => f.id)));
      setDisplayFeed(feed.slice(0, 20));
      const t = setTimeout(() => setNewIds(new Set()), 800);
      return () => clearTimeout(t);
    } else if (displayFeed.length === 0) {
      setDisplayFeed(feed.slice(0, 20));
    }
  }, [feed]);

  return (
    <div className="glass rounded-2xl flex flex-col h-full" style={{ minHeight: 400 }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05]">
        <Activity size={12} className="text-[#4F46E5]" />
        <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">Live Feed</span>
        <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] animate-pulse ml-auto" />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {displayFeed.length === 0 && (
          <div className="flex flex-col gap-1 p-3">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
        )}
        {displayFeed.map((item) => {
          const isBuy = item.side === "BUY";
          const isNew = newIds.has(item.id);
          const mins = Math.floor(item.timeAgo / 60);
          const secs = item.timeAgo % 60;
          const timeStr = mins > 0 ? `${mins}m ago` : `${secs}s ago`;
          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 px-3 py-2 border-b border-white/[0.03] hover:bg-white/[0.02] transition-all
                ${isNew ? "animate-fade-in bg-[#4F46E5]/5" : ""}`}
            >
              <span className="text-base leading-none flex-shrink-0">{item.agentEmoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/50 font-medium truncate">{item.agentName}</span>
                  <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${isBuy ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                    {item.side}
                  </span>
                  <span className="font-mono text-[10px] text-white/70">{item.asset}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[10px] text-white/40">
                    ${item.price > 1 ? item.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : item.price.toFixed(4)}
                  </span>
                  <span className="text-[9px] text-white/20">{timeStr}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Workshop Page ────────────────────────────────────────────────────────────
export default function WorkshopPage() {
  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const safeAgents = agents || [];

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-white/90">AI Trading Floor</h1>
          <p className="text-sm text-white/35 mt-0.5">Live agent activity • 8 agents trading</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-white/40 font-mono">LIVE</span>
        </div>
      </div>

      {/* Live P&L Ticker */}
      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : (
        <PnLTicker agents={safeAgents} />
      )}

      {/* Market Overview Strip */}
      <MarketOverviewStrip />

      {/* How It Works */}
      <HowItWorks />

      {/* Main layout: agent grid + live feed */}
      <div className="flex gap-5 items-start">
        {/* Agent Grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <AgentCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {safeAgents.map((agent, idx) => (
                <AgentCard key={agent.id} agent={agent} idx={idx} />
              ))}
            </div>
          )}
        </div>

        {/* Live Feed sidebar */}
        <div className="w-[280px] flex-shrink-0 hidden xl:block">
          <LiveTradeFeed />
        </div>
      </div>

      {/* Live feed on smaller screens */}
      <div className="xl:hidden">
        <LiveTradeFeed />
      </div>

      {/* Market Pulse Ticker */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.05]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse" />
          <span className="text-[10px] font-medium text-white/40 tracking-widest uppercase">Market Pulse</span>
        </div>
        <div className="ticker-wrap py-3">
          <div className="ticker-content">
            {[...MARKET_OVERVIEW, ...MARKET_OVERVIEW, ...MARKET_OVERVIEW].map((ticker, i) => (
              <div key={i} className="flex items-center gap-2 px-5 border-r border-white/[0.05] last:border-r-0">
                <span className="font-mono text-xs font-semibold text-white/70">{ticker.symbol}</span>
                <span className="font-mono text-xs text-white/50">${ticker.price.toLocaleString()}</span>
                <span className={`font-mono text-[10px] font-medium flex items-center gap-0.5 ${ticker.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {ticker.change >= 0 ? "↑" : "↓"}{ticker.change >= 0 ? "+" : ""}{ticker.change}%
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
