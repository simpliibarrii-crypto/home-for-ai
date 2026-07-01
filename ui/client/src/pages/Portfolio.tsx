import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Copy, AlertTriangle, Upload, Camera, Check, X, ArrowDownToLine } from "lucide-react";
import type { Agent } from "@shared/schema";
import { WithdrawModal } from "@/components/WithdrawModal";
import { Skeleton } from "@/components/ui/skeleton";

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

const ALLOCATION_COLORS = {
  Stocks: "#4F46E5",
  Crypto: "#06B6D4",
  Forex: "#F59E0B",
  Bonds: "#10B981",
  Commodities: "#8B5CF6",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass px-3 py-2 rounded-xl">
        <p className="font-mono text-sm text-white/85">${payload[0].value.toLocaleString()}</p>
        <p className="text-[10px] text-white/40">Day {payload[0].payload.day}</p>
      </div>
    );
  }
  return null;
};

// ─── KYC Modal ────────────────────────────────────────────────────────────────
function KycModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [kycStep, setKycStep] = useState<1 | 2 | 3>(1);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfie, setSelfie] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-white/[0.08] overflow-hidden"
        style={{ background: "rgba(10,10,15,0.97)", backdropFilter: "blur(24px)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <p className="font-display font-semibold text-sm text-white/80">Identity Verification</p>
          <button onClick={onClose} className="text-white/25 hover:text-white/60"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Step dots */}
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-2 h-2 rounded-full transition-all ${
                s < kycStep ? "bg-emerald-400" : s === kycStep ? "bg-[#4F46E5]" : "bg-white/[0.12]"
              }`} />
            ))}
          </div>

          {kycStep === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white/80">Upload Government ID</p>
              <p className="text-xs text-white/40">Passport, driver's license, or national ID</p>
              <label className="block cursor-pointer">
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  idFile ? "border-emerald-500/40 bg-emerald-500/[0.04]" : "border-white/[0.1] hover:border-white/[0.2]"
                }`}>
                  {idFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <Check size={16} className="text-emerald-400" />
                      <span className="text-sm text-emerald-400">{idFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={20} className="mx-auto text-white/25 mb-2" />
                      <p className="text-sm text-white/50">Click to upload</p>
                      <p className="text-xs text-white/25 mt-1">JPG, PNG or PDF up to 10MB</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={e => setIdFile(e.target.files?.[0] || null)}
                />
              </label>
              <button
                onClick={() => idFile && setKycStep(2)}
                disabled={!idFile}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#4F46E5] text-white disabled:opacity-30 hover:bg-[#4338CA]"
              >
                Continue
              </button>
            </div>
          )}

          {kycStep === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white/80">Take a Selfie</p>
              <p className="text-xs text-white/40">Hold your ID next to your face for liveness check</p>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  selfie ? "border-emerald-500/40 bg-emerald-500/[0.04]" : "border-white/[0.1] hover:border-white/[0.2]"
                }`}
                onClick={() => setSelfie(true)}
              >
                {selfie ? (
                  <div className="flex items-center justify-center gap-2">
                    <Check size={16} className="text-emerald-400" />
                    <span className="text-sm text-emerald-400">Photo captured</span>
                  </div>
                ) : (
                  <>
                    <Camera size={20} className="mx-auto text-white/25 mb-2" />
                    <p className="text-sm text-white/50">Click to open camera</p>
                  </>
                )}
              </div>
              <button
                onClick={() => selfie && setKycStep(3)}
                disabled={!selfie}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#4F46E5] text-white disabled:opacity-30 hover:bg-[#4338CA]"
              >
                Submit
              </button>
              <button onClick={() => setKycStep(1)} className="w-full text-xs text-white/20 hover:text-white/40">← Back</button>
            </div>
          )}

          {kycStep === 3 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#4F46E5]/20 border-2 border-[#4F46E5]/60 flex items-center justify-center">
                <Check size={24} className="text-[#818CF8]" />
              </div>
              <div>
                <p className="font-display font-bold text-base text-white/90">Verification Submitted</p>
                <p className="text-xs text-white/40 mt-1">Typically reviewed within 24 hours</p>
              </div>
              <button
                onClick={() => { onSubmit(); onClose(); }}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white/60 border border-white/[0.08] hover:bg-white/[0.04]"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Portfolio Skeletons ──────────────────────────────────────────────────────
function PortfolioSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <Skeleton className="h-6 w-32 mb-1" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const { data, isLoading, isError } = useQuery<PortfolioData>({
    queryKey: ["/api/portfolio"],
  });

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showKyc, setShowKyc] = useState(false);
  // Mock: user has not completed KYC (in production, read from user context)
  const [kycStatus, setKycStatus] = useState<"unverified" | "pending" | "verified">("unverified");

  const copyTradeMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiRequest("PATCH", `/api/agents/${id}/copy-trade`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
  });

  if (isError) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <p className="text-red-400 font-semibold">Failed to load portfolio data</p>
          <p className="text-muted-foreground text-sm">Check your connection and try refreshing</p>
        </div>
      </div>
    );
  }
  if (isLoading || !data) {
    return <PortfolioSkeleton />;
  }

  const sortedAgents = [...data.agents].sort((a, b) => b.totalReturn - a.totalReturn);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Withdraw Modal */}
      <WithdrawModal open={showWithdraw} onClose={() => setShowWithdraw(false)} />

      {/* KYC Modal */}
      {showKyc && (
        <KycModal
          onClose={() => setShowKyc(false)}
          onSubmit={() => setKycStatus("pending")}
        />
      )}

      {/* KYC Banner — shown when not verified */}
      {kycStatus !== "verified" && (
        <div className={`rounded-2xl p-4 flex items-center gap-4 border ${
          kycStatus === "pending"
            ? "bg-amber-500/[0.06] border-amber-500/25"
            : "bg-[#4F46E5]/[0.06] border-[#4F46E5]/25"
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            kycStatus === "pending" ? "bg-amber-500/15" : "bg-[#4F46E5]/15"
          }`}>
            <AlertTriangle size={18} className={kycStatus === "pending" ? "text-amber-400" : "text-[#818CF8]"} />
          </div>
          <div className="flex-1 min-w-0">
            {kycStatus === "pending" ? (
              <>
                <p className="text-sm font-semibold text-amber-300">Verification in progress</p>
                <p className="text-xs text-white/40 mt-0.5">Your ID is being reviewed — typically within 24 hours</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white/80">Complete identity verification to unlock withdrawals</p>
                <p className="text-xs text-white/40 mt-0.5">Required to increase your copy trade limit and withdraw profits</p>
              </>
            )}
          </div>
          {kycStatus === "unverified" && (
            <button
              onClick={() => setShowKyc(true)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-all"
            >
              Verify Now
            </button>
          )}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-white/90">Portfolio</h1>
          <p className="text-sm text-white/35 mt-0.5">Your combined trading performance</p>
        </div>
        <button
          onClick={() => setShowWithdraw(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#06B6D4]/80 hover:bg-[#06B6D4] transition-all"
        >
          <ArrowDownToLine size={13} />
          Withdraw Profits
        </button>
      </div>

      {/* Hero: Total Value */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#4F46E5]/08 blur-3xl pointer-events-none" />
        <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Total Portfolio Value</p>
        <div className="font-display font-bold text-4xl text-white/95 mb-1">
          ${data.totalValue.toLocaleString()}
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-400" />
          <span className="font-mono text-sm text-emerald-400 font-medium">
            +${data.dayChange.toLocaleString()} (+{data.dayChangePercent}%) today
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/[0.06]">
          {[
            { label: "Active Agents", value: data.agents.filter(a => a.status === "TRADING").length.toString() },
            { label: "Win Rate Avg", value: `${Math.round(data.agents.reduce((s, a) => s + a.winRate, 0) / data.agents.length)}%` },
            { label: "Total PnL", value: `+$${Math.round(data.agents.reduce((s, a) => s + Math.max(0, a.pnl), 0)).toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">{label}</p>
              <p className="font-mono font-semibold text-sm text-white/80 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance chart */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-sm text-white/70 mb-4">30-Day Performance</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data.performance} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="perf-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#06B6D4"
                strokeWidth={2}
                fill="url(#perf-gradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Allocation pie */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-sm text-white/70 mb-3">Allocation</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={data.allocation}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={2}
                dataKey="value"
              >
                {data.allocation.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={ALLOCATION_COLORS[entry.name as keyof typeof ALLOCATION_COLORS] || "#666"}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {data.allocation.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-sm"
                    style={{ background: ALLOCATION_COLORS[item.name as keyof typeof ALLOCATION_COLORS] || "#666" }}
                  />
                  <span className="text-white/50">{item.name}</span>
                </div>
                <span className="font-mono text-white/70">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Copy Trade Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 border border-amber-500/20 bg-amber-500/[0.03]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Copy size={14} className="text-amber-400" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-white/85">Copy Trade Active</p>
              <p className="text-xs text-white/45 mt-1">
                You are copy trading {data.copyAgentCount} agents. Est. your cut:{" "}
                <span className="text-emerald-400 font-mono font-medium">${data.estimatedCut} today</span>
              </p>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <DollarSign size={14} className="text-amber-400" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-amber-300">Fee Transparency</p>
              <p className="text-xs text-white/50 mt-1">
                Platform fee: <span className="text-amber-400 font-mono">15%</span> of copy trade profits.
                Your share: <span className="text-emerald-400 font-mono">85%</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Leaderboard */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <h3 className="font-display font-semibold text-sm text-white/70">Agent Leaderboard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
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
                <tr
                  key={agent.id}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  data-testid={`leaderboard-row-${agent.id}`}
                >
                  <td className="px-5 py-3">
                    <span className={`font-mono text-sm font-bold ${
                      index === 0 ? "text-amber-400" :
                      index === 1 ? "text-white/50" :
                      index === 2 ? "text-orange-700" :
                      "text-white/25"
                    }`}>
                      #{index + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{agent.emoji}</span>
                      <span className="font-display font-semibold text-sm text-white/80">{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs text-white/40">{agent.market}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`font-mono text-sm font-medium ${agent.totalReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {agent.totalReturn >= 0 ? "+" : ""}${Math.abs(agent.totalReturn).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-[#4F46E5] rounded-full"
                          style={{ width: `${agent.winRate}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-white/50">{agent.winRate}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      agent.status === "TRADING" ? "badge-trading" :
                      agent.status === "ANALYZING" ? "badge-analyzing" : "badge-idle"
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${
                        agent.status === "TRADING" ? "bg-[#818CF8] animate-pulse" :
                        agent.status === "ANALYZING" ? "bg-[#22D3EE]" : "bg-white/20"
                      }`} />
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
                      <div className={`relative w-9 h-5 rounded-full transition-all ${
                        agent.copyTradeEnabled ? "bg-amber-500/80" : "bg-white/10"
                      }`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all ${
                          agent.copyTradeEnabled ? "left-[calc(100%-18px)] bg-amber-300" : "left-0.5 bg-white/40"
                        }`} />
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
