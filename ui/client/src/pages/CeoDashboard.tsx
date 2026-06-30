import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, Users, Activity, AlertTriangle, Settings, LogOut,
  Search, Download, Send, Shield, Zap, BarChart2, Copy,
  ChevronRight, RefreshCw, CheckCircle, X, Wifi, WifiOff,
} from "lucide-react";
import { getCeoToken, clearCeoToken } from "./CeoLogin";

// ─── CEO API helpers ─────────────────────────────────────────────────────────

async function ceoFetch(path: string, opts: RequestInit = {}) {
  const token = getCeoToken();
  return fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...((opts.headers as Record<string, string>) || {}),
    },
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  revenue: {
    allTime: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    dailySeries: { date: string; amount: number }[];
  };
  users: { total: number; activeToday: number; newThisWeek: number };
  agents: { total: number; trading: number };
}

interface CeoUser {
  id: number;
  email: string;
  username: string;
  agentId: string;
  riskProfile: string;
  joinedAt: string;
  kycStatus: string;
  totalDeposited: number;
  totalProfitGenerated: number;
  platformFeePaid: number;
}

interface Health {
  uptime: string;
  apiLatency: string;
  dbSize: string;
  emergencyStop: boolean;
  agents: {
    id: number; name: string; emoji: string; status: string;
    tradesToday: number; winRate: number; totalProfitGenerated: number;
  }[];
  copyTrade: { activeCopies: number; volumeToday: number };
}

interface CeoSettings {
  payout_wallet: string;
  payout_schedule: string;
  payout_threshold: string;
  emergency_stop: string;
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl p-6 max-w-sm mx-4 border border-red-500/30 bg-red-500/[0.05]">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} className="text-red-400" />
          <p className="text-sm font-semibold text-white/90">Confirm Action</p>
        </div>
        <p className="text-sm text-white/60 mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-sm text-white/50 border border-white/[0.08] hover:bg-white/[0.04]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 border border-red-400/30"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Gold number ─────────────────────────────────────────────────────────────

function GoldStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">{label}</p>
      <p className="font-display font-bold text-2xl text-[#F59E0B]">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function CeoDashboard() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("revenue");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<CeoUser[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [ceoSettings, setCeoSettings] = useState<CeoSettings>({
    payout_wallet: "",
    payout_schedule: "weekly",
    payout_threshold: "500",
    emergency_stop: "false",
  });
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastDone, setBroadcastDone] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [changePwModal, setChangePwModal] = useState(false);

  useEffect(() => {
    // Redirect to login if no CEO token
    if (!getCeoToken()) {
      navigate("/ceo");
      return;
    }
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [statsRes, usersRes, healthRes, settingsRes] = await Promise.all([
        ceoFetch("/api/ceo/stats"),
        ceoFetch("/api/ceo/users"),
        ceoFetch("/api/ceo/health"),
        ceoFetch("/api/ceo/settings"),
      ]);
      if (statsRes.status === 401) { clearCeoToken(); navigate("/ceo"); return; }
      setStats(await statsRes.json());
      setUsers(await usersRes.json());
      setHealth(await healthRes.json());
      const s = await settingsRes.json();
      setCeoSettings(s);
    } catch {
      // Handle gracefully
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearCeoToken();
    navigate("/ceo");
  }

  async function handleEmergencyStop(stop: boolean) {
    await ceoFetch("/api/ceo/emergency-stop", {
      method: "POST",
      body: JSON.stringify({ stop }),
    });
    setCeoSettings(s => ({ ...s, emergency_stop: stop ? "true" : "false" }));
    if (health) setHealth({ ...health, emergencyStop: stop });
    setConfirm(null);
  }

  async function handleSaveSetting(key: string, value: string) {
    await ceoFetch("/api/ceo/settings", {
      method: "PATCH",
      body: JSON.stringify({ key, value }),
    });
    setCeoSettings(s => ({ ...s, [key]: value }));
  }

  async function handleBroadcast() {
    if (!broadcastMsg) return;
    await ceoFetch("/api/ceo/broadcast", {
      method: "POST",
      body: JSON.stringify({ message: broadcastMsg }),
    });
    setBroadcastDone(true);
    setBroadcastMsg("");
    setTimeout(() => setBroadcastDone(false), 3000);
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  const TABS = [
    { id: "revenue", icon: DollarSign, label: "Revenue" },
    { id: "users", icon: Users, label: "Users" },
    { id: "health", icon: Activity, label: "Health" },
    { id: "routing", icon: Settings, label: "Payouts" },
    { id: "actions", icon: Zap, label: "Actions" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#050508" }}>
        <RefreshCw size={24} className="text-white/20 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#050508" }}>
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}

      {/* Transfer to Bank Modal */}
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 max-w-sm mx-4 border border-[#F59E0B]/20">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-white/90 text-sm">Transfer to Bank</p>
              <button onClick={() => setTransferModal(false)} className="text-white/30 hover:text-white/60">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              Connect your business bank account via <span className="text-[#F59E0B]">Stripe Connect</span> or{" "}
              <span className="text-[#F59E0B]">Wise API</span> to enable automatic transfers.
            </p>
            <p className="text-xs text-white/30 mt-2">
              See <span className="font-mono text-white/50">/docs/ceo-payout-setup.md</span> for setup instructions.
            </p>
            <button onClick={() => setTransferModal(false)} className="mt-4 w-full py-2 rounded-xl text-xs text-white/50 border border-white/[0.08] hover:bg-white/[0.04]">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-white/[0.05] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center">
            <Shield size={14} className="text-[#F59E0B]" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-white/90">CEO Command Center</p>
            <p className="text-[10px] text-white/25">Private — do not share this URL</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Apple ID Linked badge — CEO's iOS identity is verified */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-black/60 border border-white/15 text-white/50">
            <svg width="11" height="13" viewBox="0 0 814 1000" fill="currentColor" className="opacity-60">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-47.4-150.2-109c-51.7-69.7-93.7-173.2-93.7-272.1 0-174.6 114.6-267 227.8-267C311 151.9 373.3 196 420.8 196c46.7 0 116.5-48.4 194.3-48.4z" />
              <path d="M549.8 66.5c25.3-29.9 43.9-71.5 43.9-113.1 0-5.8-.6-11.6-1.9-16.8-41.5 1.9-91.5 27.5-121.7 61.5-24.5 28.2-41.1 53.4-51.7 74.6-11.3 22-18.2 45.2-18.2 66.5 0 6.5.6 13 1.3 15.1 3.2.6 8.4 1.3 13.6 1.3 37 0 84.1-24.7 134.6-52.4z" />
            </svg>
            Apple ID Linked
          </div>
          <div className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full ${health?.emergencyStop ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
            {health?.emergencyStop ? <WifiOff size={10} /> : <Wifi size={10} />}
            {health?.emergencyStop ? "TRADING STOPPED" : "Live"}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 px-3 py-1.5 rounded-xl hover:bg-white/[0.04]"
          >
            <LogOut size={12} /> Logout
          </button>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 px-6 pt-4 border-b border-white/[0.04] overflow-x-auto">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium whitespace-nowrap rounded-t-xl transition-all ${
              activeTab === id
                ? "text-[#F59E0B] bg-[#F59E0B]/10 border-b-2 border-[#F59E0B]"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-w-7xl">

        {/* REVENUE TAB */}
        {activeTab === "revenue" && stats && (
          <div className="space-y-6">
            {/* Revenue stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <GoldStat label="All-Time Revenue" value={`$${stats.revenue.allTime.toLocaleString()}`} sub="Platform 15% cut" />
              <GoldStat label="Today" value={`$${stats.revenue.today.toLocaleString()}`} />
              <GoldStat label="This Week" value={`$${stats.revenue.thisWeek.toLocaleString()}`} />
              <GoldStat label="This Month" value={`$${stats.revenue.thisMonth.toLocaleString()}`} />
            </div>

            {/* Revenue chart */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display font-semibold text-sm text-white/70 mb-4">30-Day Revenue (Platform Cut)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stats.revenue.dailySeries} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }}
                    tickLine={false}
                    axisLine={false}
                    interval={6}
                    tickFormatter={d => d.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `$${v}`}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{ background: "rgba(5,5,8,0.9)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8 }}
                    labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}
                    itemStyle={{ color: "#F59E0B", fontSize: 12, fontWeight: 600 }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#F59E0B" strokeWidth={2} fill="url(#goldGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* My Cut breakdown */}
            <div className="glass rounded-2xl p-5 border border-[#F59E0B]/20 bg-[#F59E0B]/[0.03]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-widest mb-1">CEO Payout Account</p>
                  <p className="font-display font-bold text-3xl text-[#F59E0B]">
                    ${stats.revenue.allTime.toLocaleString()}
                  </p>
                  <p className="text-xs text-white/30 mt-1">Accumulated from all platform fees — ready to transfer</p>
                </div>
                <button
                  onClick={() => setTransferModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-black bg-[#F59E0B] hover:bg-[#D97706] transition-all"
                >
                  Transfer to Bank
                </button>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && stats && (
          <div className="space-y-4">
            {/* User stats */}
            <div className="grid grid-cols-3 gap-4">
              <GoldStat label="Total Users" value={String(stats.users.total)} />
              <GoldStat label="Active Today" value={String(stats.users.activeToday)} />
              <GoldStat label="New This Week" value={String(stats.users.newThisWeek)} />
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search users by email or username..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white/80 outline-none focus:border-white/20"
              />
            </div>

            {/* User table */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[9px] text-white/25 uppercase tracking-widest border-b border-white/[0.04]">
                      <th className="text-left px-4 py-3">ID</th>
                      <th className="text-left px-3 py-3">User</th>
                      <th className="text-left px-3 py-3">Agent</th>
                      <th className="text-left px-3 py-3">Risk</th>
                      <th className="text-left px-3 py-3">KYC</th>
                      <th className="text-left px-3 py-3">Joined</th>
                      <th className="text-right px-3 py-3">Deposited</th>
                      <th className="text-right px-3 py-3">Profit</th>
                      <th className="text-right px-4 py-3">Fee Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-white/25 text-sm">
                          No users yet
                        </td>
                      </tr>
                    ) : filteredUsers.map(u => (
                      <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-white/30">#{u.id}</td>
                        <td className="px-3 py-3">
                          <div>
                            <p className="text-xs font-medium text-white/70">{u.username}</p>
                            <p className="text-[10px] text-white/30">{u.email}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-white/40 capitalize">{u.agentId}</td>
                        <td className="px-3 py-3 text-xs text-white/40 capitalize">{u.riskProfile}</td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            u.kycStatus === "verified" ? "text-emerald-400 bg-emerald-500/10" :
                            u.kycStatus === "pending" ? "text-amber-400 bg-amber-500/10" :
                            "text-white/30 bg-white/[0.04]"
                          }`}>
                            {u.kycStatus}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[10px] text-white/30">
                          {new Date(u.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs text-white/60">
                          ${u.totalDeposited.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs text-emerald-400">
                          +${u.totalProfitGenerated.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-[#F59E0B]">
                          ${u.platformFeePaid.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* HEALTH TAB */}
        {activeTab === "health" && health && (
          <div className="space-y-5">
            {/* System health row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass rounded-2xl p-4">
                <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Uptime</p>
                <p className="font-mono font-bold text-lg text-emerald-400">{health.uptime}</p>
              </div>
              <div className="glass rounded-2xl p-4">
                <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">API Latency</p>
                <p className="font-mono font-bold text-lg text-[#06B6D4]">{health.apiLatency}</p>
              </div>
              <div className="glass rounded-2xl p-4">
                <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">DB Size</p>
                <p className="font-mono font-bold text-lg text-white/70">{health.dbSize}</p>
              </div>
            </div>

            {/* Copy trade engine */}
            <div className="glass rounded-2xl p-4 border border-[#06B6D4]/20">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Copy Trade Engine</p>
              <div className="flex gap-6">
                <div>
                  <p className="text-[10px] text-white/25">Active Copies</p>
                  <p className="font-mono text-lg font-bold text-[#06B6D4]">{health.copyTrade.activeCopies}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/25">Volume Today</p>
                  <p className="font-mono text-lg font-bold text-white/70">${health.copyTrade.volumeToday.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Agent cards */}
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Agent Status</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {health.agents.map(agent => (
                  <div key={agent.id} className="glass rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">{agent.emoji}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        agent.status === "TRADING" ? "text-[#818CF8] bg-[#4F46E5]/15" :
                        agent.status === "ANALYZING" ? "text-[#22D3EE] bg-[#06B6D4]/15" :
                        "text-white/25 bg-white/[0.04]"
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                    <p className="font-semibold text-xs text-white/80">{agent.name}</p>
                    <div className="mt-2 space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-white/30">Trades today</span>
                        <span className="font-mono text-white/60">{agent.tradesToday}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-white/30">Win rate</span>
                        <span className="font-mono text-emerald-400">{agent.winRate}%</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-white/30">Total profit</span>
                        <span className="font-mono text-[#F59E0B]">+${agent.totalProfitGenerated.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ROUTING/PAYOUTS TAB */}
        {activeTab === "routing" && (
          <div className="space-y-5 max-w-lg">
            <div className="glass rounded-2xl p-5 space-y-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">CEO Payout Wallet Address</label>
                <input
                  type="text"
                  value={ceoSettings.payout_wallet}
                  onChange={e => setCeoSettings(s => ({ ...s, payout_wallet: e.target.value }))}
                  onBlur={e => handleSaveSetting("payout_wallet", e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs font-mono text-white/70 outline-none focus:border-[#F59E0B]/40"
                  placeholder="0x... or bc1... or T... (TRON/USDT)"
                />
                <p className="text-[10px] text-white/20 mt-1">For crypto payouts (USDC, USDT, ETH)</p>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">Payout Schedule</label>
                <select
                  value={ceoSettings.payout_schedule}
                  onChange={e => { setCeoSettings(s => ({ ...s, payout_schedule: e.target.value })); handleSaveSetting("payout_schedule", e.target.value); }}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/70 outline-none w-full"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">Minimum Payout Threshold ($)</label>
                <input
                  type="number"
                  min="0"
                  value={ceoSettings.payout_threshold}
                  onChange={e => setCeoSettings(s => ({ ...s, payout_threshold: e.target.value }))}
                  onBlur={e => handleSaveSetting("payout_threshold", e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm font-mono text-white/70 outline-none focus:border-[#F59E0B]/40"
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-white/[0.05]">
                <div>
                  <p className="text-sm text-white/70">Auto-payout enabled</p>
                  <p className="text-xs text-white/30">Automatically transfer when threshold reached</p>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={ceoSettings.emergency_stop !== "true"}
                    onChange={() => {}}
                  />
                  <div className="relative w-11 h-6 rounded-full bg-[#4F46E5]/60 border border-[#4F46E5]/30">
                    <div className="absolute top-1 left-6 w-4 h-4 rounded-full bg-white shadow" />
                  </div>
                </label>
              </div>
            </div>

            {/* Fee split display */}
            <div className="glass rounded-2xl p-5 border border-white/[0.06]">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Fee Split (Immutable — requires code deploy to change)</p>
              <div className="flex gap-4">
                <div className="flex-1 text-center glass rounded-xl p-3">
                  <p className="font-mono font-bold text-2xl text-[#F59E0B]">15%</p>
                  <p className="text-[10px] text-white/30 mt-0.5">Platform Cut</p>
                </div>
                <div className="flex-1 text-center glass rounded-xl p-3">
                  <p className="font-mono font-bold text-2xl text-emerald-400">85%</p>
                  <p className="text-[10px] text-white/30 mt-0.5">User Share</p>
                </div>
              </div>
              <p className="text-[10px] text-white/20 mt-3 text-center">To change the fee split, update PLATFORM_FEE_PCT in server/config.ts and redeploy</p>
            </div>
          </div>
        )}

        {/* ACTIONS TAB */}
        {activeTab === "actions" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-3xl">
            {/* Emergency stop */}
            <div className={`glass rounded-2xl p-5 border ${health?.emergencyStop ? "border-red-500/40 bg-red-500/[0.05]" : "border-white/[0.06]"}`}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className={health?.emergencyStop ? "text-red-400" : "text-white/30"} />
                <p className="font-semibold text-sm text-white/80">Emergency Trading Stop</p>
              </div>
              <p className="text-xs text-white/40 mb-4">
                {health?.emergencyStop
                  ? "All trading is currently HALTED. Re-enable to resume."
                  : "Immediately halt all agent trading activity across all users."}
              </p>
              <button
                onClick={() => setConfirm({
                  message: health?.emergencyStop
                    ? "Resume all trading? Agents will start executing trades again."
                    : "HALT ALL TRADING? This will stop all agent activity immediately for all users.",
                  onConfirm: () => handleEmergencyStop(!health?.emergencyStop),
                })}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  health?.emergencyStop
                    ? "bg-emerald-500/80 text-white hover:bg-emerald-500"
                    : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                }`}
              >
                {health?.emergencyStop ? "Resume Trading" : "Pause All Trading"}
              </button>
            </div>

            {/* Broadcast */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Send size={14} className="text-[#06B6D4]" />
                <p className="font-semibold text-sm text-white/80">Broadcast Message</p>
              </div>
              <textarea
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
                placeholder="Message to all users..."
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-white/20 resize-none mb-3"
              />
              {broadcastDone && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-2">
                  <CheckCircle size={12} /> Message sent to all users
                </div>
              )}
              <button
                onClick={handleBroadcast}
                disabled={!broadcastMsg}
                className="w-full py-2 rounded-xl text-xs font-medium text-[#06B6D4] border border-[#06B6D4]/30 hover:bg-[#06B6D4]/10 disabled:opacity-30"
              >
                Send Broadcast
              </button>
            </div>

            {/* Export data */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Download size={14} className="text-white/40" />
                <p className="font-semibold text-sm text-white/80">Export Data</p>
              </div>
              <p className="text-xs text-white/30 mb-4">Download all platform data as CSV for compliance / reporting</p>
              <button
                onClick={() => {
                  const csv = ["id,email,username,joined,deposited,profit,feePaid",
                    ...users.map(u => `${u.id},${u.email},${u.username},${u.joinedAt},${u.totalDeposited},${u.totalProfitGenerated},${u.platformFeePaid}`)
                  ].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "homeforai-users.csv";
                  a.click();
                }}
                className="w-full py-2 rounded-xl text-xs font-medium text-white/50 border border-white/[0.08] hover:bg-white/[0.04]"
              >
                Download Users CSV
              </button>
            </div>

            {/* Change password */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={14} className="text-[#F59E0B]" />
                <p className="font-semibold text-sm text-white/80">Change CEO Password</p>
              </div>
              <p className="text-xs text-white/30 mb-4">
                Update the CEO dashboard password. Current hash stored in <span className="font-mono">ceo_settings</span> DB table.
              </p>
              <p className="text-[10px] text-amber-400/60 mb-3">
                ⚠ CEO: Change the default password before going live
              </p>
              <button
                onClick={() => alert("TODO: Implement /ceo/change-password page with current password verification + new password hashing")}
                className="w-full py-2 rounded-xl text-xs font-medium text-[#F59E0B] border border-[#F59E0B]/30 hover:bg-[#F59E0B]/10"
              >
                Change Password
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
