import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Copy, AlertTriangle, Upload, Camera, Check, X, ArrowDownToLine } from "lucide-react";
import type { Agent } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { WithdrawModal } from "@/components/WithdrawModal";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PortfolioData {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalPnl: number;
  copyAgentCount: number;
  estimatedCut: number;
  agents: Agent[];
  performance: { day: number; value: number }[];
  allocation: { name: string; value: number }[];
}

interface EquityCurveData {
  curve: { date: string; value: number }[];
  initialValue: number;
  currentValue: number;
}

interface Position {
  asset: string;
  direction: string;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  pnl: number;
  pnlPct: number;
}

const ALLOCATION_COLORS: Record<string, string> = {
  Stocks: "#4F46E5",
  Crypto: "#06B6D4",
  Forex: "#F59E0B",
  Bonds: "#10B981",
  Commodities: "#8B5CF6",
};

// ─── Mock trade history ───────────────────────────────────────────────────────
const TRADE_HISTORY = Array.from({ length: 50 }, (_, i) => {
  const assets = ["BTC", "ETH", "SOL", "AAPL", "NVDA", "TSLA", "BNB", "AVAX"];
  const sides = ["BUY", "SELL"];
  const seed = i * 7919;
  const asset = assets[Math.floor(Math.abs(Math.sin(seed)) * assets.length)];
  const side = sides[Math.floor(Math.abs(Math.sin(seed * 1.3)) * 2)];
  const entry = 100 + Math.abs(Math.sin(seed * 0.7)) * 9900;
  const exit = entry * (1 + (Math.sin(seed * 1.7) * 0.06));
  const pnl = (exit - entry) * (0.1 + Math.abs(Math.sin(seed * 0.3)) * 0.9);
  const d = new Date(Date.now() - i * 86400000 * (0.5 + Math.abs(Math.sin(seed)) * 1.5));
  const duration = `${1 + Math.floor(Math.abs(Math.sin(seed * 2)) * 47)}h`;
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    asset,
    side,
    entry: Math.round(entry * 100) / 100,
    exit: Math.round(exit * 100) / 100,
    pnl: Math.round(pnl * 100) / 100,
    duration,
  };
});

// ─── KYC Modal ────────────────────────────────────────────────────────────────
function KycModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [kycStep, setKycStep] = useState<1 | 2 | 3>(1);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfie, setSelfie] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] overflow-hidden" style={{ background: "rgba(10,10,15,0.97)", backdropFilter: "blur(24px)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <p className="font-display font-semibold text-sm text-white/80">Identity Verification</p>
          <button onClick={onClose} className="text-white/25 hover:text-white/60"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-2 h-2 rounded-full transition-all ${s < kycStep ? "bg-emerald-400" : s === kycStep ? "bg-[#4F46E5]" : "bg-white/[0.12]"}`} />
            ))}
          </div>
          {kycStep === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white/80">Upload Government ID</p>
              <label className="block cursor-pointer">
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${idFile ? "border-emerald-500/40 bg-emerald-500/[0.04]" : "border-white/[0.1] hover:border-white/[0.2]"}`}>
                  {idFile ? (
                    <div className="flex items-center justify-center gap-2"><Check size={16} className="text-emerald-400" /><span className="text-sm text-emerald-400">{idFile.name}</span></div>
                  ) : (
                    <><Upload size={20} className="mx-auto text-white/25 mb-2" /><p className="text-sm text-white/50">Click to upload</p></>
                  )}
                </div>
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={e => setIdFile(e.target.files?.[0] || null)} />
              </label>
              <button onClick={() => idFile && setKycStep(2)} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${idFile ? "bg-[#4F46E5] text-white hover:bg-[#4338CA]" : "bg-white/[0.05] text-white/25 cursor-not-allowed"}`}>Continue</button>
            </div>
          )}
          {kycStep === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white/80">Take a Selfie</p>
              <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${selfie ? "border-emerald-500/40 bg-emerald-500/[0.04]" : "border-white/[0.1] hover:border-white/[0.2]"}`} onClick={() => setSelfie(true)}>
                {selfie ? (
                  <div className="flex items-center justify-center gap-2"><Check size={16} className="text-emerald-400" /><span className="text-sm text-emerald-400">Photo captured</span></div>
                ) : (
                  <><Camera size={20} className="mx-auto text-white/25 mb-2" /><p className="text-sm text-white/50">Click to simulate capture</p></>
                )}
              </div>
              <button onClick={() => selfie && setKycStep(3)} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${selfie ? "bg-[#4F46E5] text-white hover:bg-[#4338CA]" : "bg-white/[0.05] text-white/25 cursor-not-allowed"}`}>Continue</button>
            </div>
          )}
          {kycStep === 3 && (
            <div className="space-y-3">
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3"><Check size={28} className="text-emerald-400" /></div>
                <p className="text-base font-bold text-white/90">Verification Submitted</p>
                <p className="text-xs text-white/40 mt-1">Usually reviewed within 24 hours.</p>
              </div>
              <button onClick={() => { onSubmit(); onClose(); }} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#4F46E5] text-white hover:bg-[#4338CA] transition-all">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Portfolio Page ────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [kycOpen, setKycOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const { data: portfolio, isLoading: portLoading } = useQuery<PortfolioData>({ queryKey: ["/api/portfolio"] });
  const { data: equityCurve, isLoading: curveLoading } = useQuery<EquityCurveData>({
    queryKey: ["/api/portfolio/equity-curve"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/portfolio/equity-curve");
      return r.json();
    },
  });
  const { data: positions } = useQuery<Position[]>({
    queryKey: ["/api/portfolio/positions"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/portfolio/positions");
      return r.json();
    },
    refetchInterval: 30000,
  });

  const kycMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/kyc", {}),
  });

  const copyTradeMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiRequest("PATCH", `/api/agents/${id}/copy-trade`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agents"] }),
  });

  const { data: agents } = useQuery<Agent[]>({ queryKey: ["/api/agents"] });
  const sortedAgents = [...(agents || [])].sort((a, b) => b.totalReturn - a.totalReturn);

  const totalReturn = equityCurve
    ? ((equityCurve.currentValue - equityCurve.initialValue) / equityCurve.initialValue) * 100
    : 0;

  const winRate = TRADE_HISTORY.filter(t => t.pnl > 0).length / TRADE_HISTORY.length * 100;
  const bestTrade = TRADE_HISTORY.reduce((best, t) => t.pnl > best.pnl ? t : best, TRADE_HISTORY[0]);

  // Max drawdown from equity curve
  let maxDrawdown = 0;
  if (equityCurve?.curve && equityCurve.curve.length > 1) {
    let peak = equityCurve.curve[0].value;
    for (const pt of equityCurve.curve) {
      if (pt.value > peak) peak = pt.value;
      const dd = (peak - pt.value) / peak * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {kycOpen && (
        <KycModal
          onClose={() => setKycOpen(false)}
          onSubmit={() => kycMutation.mutate()}
        />
      )}
      {withdrawOpen && <WithdrawModal onClose={() => setWithdrawOpen(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-xl text-white/90">My Portfolio</h1>
          <p className="text-sm text-white/35 mt-0.5">Performance overview & positions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWithdrawOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.1] text-xs text-white/50 hover:text-white/80 hover:border-white/20 transition-all">
            <ArrowDownToLine size={12} /> Withdraw
          </button>
        </div>
      </div>

      {/* Equity Curve */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-1">Portfolio Equity Curve (90d)</p>
            {equityCurve && (
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-bold text-white">${equityCurve.currentValue.toLocaleString()}</span>
                <span className={`font-mono text-sm ${totalReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
        {curveLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : equityCurve ? (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve.curve} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8 }} tickLine={false} axisLine={false} interval={14} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8 }} tickLine={false} axisLine={false} width={65} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "rgba(5,5,8,0.95)", border: "1px solid rgba(6,182,212,0.3)", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Portfolio Value"]}
                />
                <Area type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} fill="url(#equityGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Return",
            value: `${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(1)}%`,
            sub: `from $${(equityCurve?.initialValue || 10000).toLocaleString()}`,
            color: totalReturn >= 0 ? "text-emerald-400" : "text-red-400",
            icon: <TrendingUp size={16} />,
          },
          {
            label: "Win Rate",
            value: `${winRate.toFixed(1)}%`,
            sub: `${TRADE_HISTORY.filter(t => t.pnl > 0).length}/${TRADE_HISTORY.length} trades`,
            color: winRate > 55 ? "text-emerald-400" : winRate > 45 ? "text-amber-400" : "text-red-400",
            icon: <DollarSign size={16} />,
          },
          {
            label: "Best Trade",
            value: `+$${bestTrade.pnl.toFixed(0)}`,
            sub: bestTrade.asset,
            color: "text-[#F59E0B]",
            icon: <TrendingUp size={16} />,
          },
          {
            label: "Max Drawdown",
            value: `-${maxDrawdown.toFixed(1)}%`,
            sub: "Peak to trough",
            color: "text-red-400",
            icon: <TrendingDown size={16} />,
          },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-white/30">{stat.icon}</div>
              <span className="text-[10px] text-white/40 font-mono uppercase tracking-wide">{stat.label}</span>
            </div>
            <div className={`font-mono font-bold text-xl ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-white/30 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Asset Allocation + Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut chart */}
        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Asset Allocation</p>
          {portLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : portfolio ? (
            <div className="flex items-center gap-4">
              <div style={{ width: 160, height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={portfolio.allocation} dataKey="value" cx="50%" cy="50%" innerRadius={46} outerRadius={70} paddingAngle={3}>
                      {portfolio.allocation.map((entry) => (
                        <Cell key={entry.name} fill={ALLOCATION_COLORS[entry.name] || "#4F46E5"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "rgba(5,5,8,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {portfolio.allocation.map(entry => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: ALLOCATION_COLORS[entry.name] || "#4F46E5" }} />
                      <span className="text-xs text-white/60">{entry.name}</span>
                    </div>
                    <span className="font-mono text-xs text-white/70">{entry.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Portfolio summary */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Summary</p>
          {portLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : portfolio ? (
            <div className="space-y-3">
              {[
                { label: "Total Value", value: `$${portfolio.totalValue.toLocaleString()}`, color: "text-white" },
                { label: "Day Change", value: `+$${portfolio.dayChange.toLocaleString()} (+${portfolio.dayChangePercent}%)`, color: "text-emerald-400" },
                { label: "Total P&L", value: `+$${portfolio.totalPnl.toLocaleString()}`, color: portfolio.totalPnl >= 0 ? "text-emerald-400" : "text-red-400" },
                { label: "Copy Agents", value: `${portfolio.copyAgentCount} active`, color: "text-[#F59E0B]" },
                { label: "Est. Payout", value: `$${portfolio.estimatedCut.toLocaleString()}`, color: "text-[#06B6D4]" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-white/40">{item.label}</span>
                  <span className={`font-mono text-sm font-semibold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="pt-2 border-t border-white/[0.05]">
            <p className="text-xs text-white/50">
              Platform fee: <span className="text-amber-400 font-mono">15%</span> of copy trade profits.
              Your share: <span className="text-emerald-400 font-mono">85%</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Open Positions</p>
          <span className="text-[10px] text-white/30">{positions?.length || 0} positions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-white/[0.04] text-[10px] text-white/30 uppercase tracking-wide">
                <th className="px-5 py-2 text-left">Asset</th>
                <th className="px-3 py-2 text-left">Direction</th>
                <th className="px-3 py-2 text-right">Entry</th>
                <th className="px-3 py-2 text-right">Current</th>
                <th className="px-3 py-2 text-right">P&L</th>
                <th className="px-3 py-2 text-right">P&L %</th>
                <th className="px-5 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {!positions && [...Array(3)].map((_, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  {[...Array(7)].map((_, j) => <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-full" /></td>)}
                </tr>
              ))}
              {positions && positions.map((pos) => {
                const isPosP = pos.pnl >= 0;
                return (
                  <tr key={pos.asset} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-mono font-semibold text-white/90">{pos.asset}</td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pos.direction === "LONG" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                        {pos.direction}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-white/50">${pos.entryPrice.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right font-mono text-white/80">${pos.currentPrice.toLocaleString()}</td>
                    <td className={`px-3 py-3 text-right font-mono font-semibold ${isPosP ? "text-emerald-400" : "text-red-400"}`}>
                      {isPosP ? "+" : ""}{pos.pnl.toFixed(2)}
                    </td>
                    <td className={`px-3 py-3 text-right font-mono ${isPosP ? "text-emerald-400" : "text-red-400"}`}>
                      {isPosP ? "+" : ""}{pos.pnlPct.toFixed(2)}%
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button className="text-[10px] px-2 py-1 rounded-lg border border-white/[0.1] text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all">
                        Close
                      </button>
                    </td>
                  </tr>
                );
              })}
              {positions && positions.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-white/25">No open positions</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade History */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Trade History</p>
          <span className="text-[10px] text-white/30">Last 50</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-white/[0.04] text-[10px] text-white/30 uppercase tracking-wide">
                <th className="px-5 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Asset</th>
                <th className="px-3 py-2 text-left">Side</th>
                <th className="px-3 py-2 text-right">Entry</th>
                <th className="px-3 py-2 text-right">Exit</th>
                <th className="px-3 py-2 text-right">P&L</th>
                <th className="px-5 py-2 text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {TRADE_HISTORY.map((t, i) => {
                const isPos = t.pnl >= 0;
                return (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-2 text-white/40">{t.date}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-white/80">{t.asset}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${t.side === "BUY" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>{t.side}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-white/50">${t.entry.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono text-white/50">${t.exit.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-right font-mono font-semibold ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                      {isPos ? "+" : ""}${Math.abs(t.pnl).toFixed(2)}
                    </td>
                    <td className="px-5 py-2 text-right font-mono text-white/30">{t.duration}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Leaderboard */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <h3 className="font-display font-semibold text-sm text-white/70">Agent Leaderboard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-[10px] text-white/30 uppercase tracking-widest border-b border-white/[0.04]">
                <th className="text-left px-5 py-3">Rank</th>
                <th className="text-left px-3 py-3">Agent</th>
                <th className="text-left px-3 py-3">Market</th>
                <th className="text-right px-3 py-3">Total Return</th>
                <th className="text-right px-3 py-3">Win Rate</th>
                <th className="text-center px-3 py-3">Status</th>
                <th className="text-center px-5 py-3">Copy</th>
              </tr>
            </thead>
            <tbody>
              {sortedAgents.map((agent, index) => (
                <tr key={agent.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors" data-testid={`leaderboard-row-${agent.id}`}>
                  <td className="px-5 py-3">
                    <span className={`font-mono text-sm font-bold ${index === 0 ? "text-amber-400" : index === 1 ? "text-white/50" : index === 2 ? "text-orange-700" : "text-white/25"}`}>#{index + 1}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{agent.emoji}</span>
                      <span className="font-display font-semibold text-sm text-white/80">{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3"><span className="text-xs text-white/40">{agent.market}</span></td>
                  <td className="px-3 py-3 text-right">
                    <span className={`font-mono text-sm font-medium ${agent.totalReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {agent.totalReturn >= 0 ? "+" : ""}${Math.abs(agent.totalReturn).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-[#4F46E5] rounded-full" style={{ width: `${agent.winRate}%` }} />
                      </div>
                      <span className="font-mono text-xs text-white/50">{agent.winRate}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${agent.status === "TRADING" ? "badge-trading" : agent.status === "ANALYZING" ? "badge-analyzing" : "badge-idle"}`}>
                      <span className={`w-1 h-1 rounded-full ${agent.status === "TRADING" ? "bg-[#818CF8] animate-pulse" : agent.status === "ANALYZING" ? "bg-[#22D3EE]" : "bg-white/20"}`} />
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <label className="cursor-pointer inline-block">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={agent.copyTradeEnabled === 1}
                        onChange={(e) => copyTradeMutation.mutate({ id: agent.id, enabled: e.target.checked })}
                        data-testid={`leaderboard-copy-${agent.id}`}
                      />
                      <div className={`relative w-9 h-5 rounded-full transition-all ${agent.copyTradeEnabled ? "bg-amber-500/80" : "bg-white/10"}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all ${agent.copyTradeEnabled ? "left-[calc(100%-18px)] bg-amber-300" : "left-0.5 bg-white/40"}`} />
                      </div>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
