import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  User, Palette, Cpu, TrendingUp, Copy, Shield, FileText, Eye, EyeOff, ChevronRight,
  LogIn, LogOut, Gift, Check, ExternalLink
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "profile" | "skins" | "3d" | "trading" | "copy" | "security" | "referral" | "legal";

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "profile", icon: User, label: "Profile" },
  { id: "skins", icon: Palette, label: "Skins" },
  { id: "3d", icon: Cpu, label: "3D Mode" },
  { id: "trading", icon: TrendingUp, label: "Trading" },
  { id: "copy", icon: Copy, label: "Copy Trade" },
  { id: "security", icon: Shield, label: "Security" },
  { id: "referral", icon: Gift, label: "Referral" },
  { id: "legal", icon: FileText, label: "Legal" },
];

const SKINS = [
  {
    id: "deep-space",
    name: "Deep Space",
    desc: "Dark, cinematic mission control",
    palette: ["#050508", "#4F46E5", "#06B6D4", "#F59E0B"],
    active: true,
  },
  {
    id: "sakura",
    name: "Sakura",
    desc: "Soft pink, dreamlike",
    palette: ["#1a0a12", "#E879A0", "#F472B6", "#FBBF24"],
    active: false,
  },
  {
    id: "terminal-green",
    name: "Terminal Green",
    desc: "Matrix-style hacker aesthetic",
    palette: ["#010A03", "#00FF41", "#39FF14", "#FFFFFF"],
    active: false,
  },
  {
    id: "glacier",
    name: "Glacier",
    desc: "Ice blue, crystalline",
    palette: ["#010912", "#7DD3FC", "#38BDF8", "#E2E8F0"],
    active: false,
  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className={`relative w-11 h-6 rounded-full transition-all ${checked ? "bg-[#4F46E5]" : "bg-white/10"}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full shadow bg-white transition-all ${checked ? "left-6" : "left-1"}`} />
      </div>
    </label>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-0">
      <div>
        <p className="text-sm text-white/80 font-medium">{label}</p>
        {description && <p className="text-xs text-white/35 mt-0.5">{description}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── Referral Code generator ─────────────────────────────────────────────────
function generateReferralCode(username: string): string {
  const base = (username || "user").toUpperCase().slice(0, 4).padEnd(4, "X");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  // Deterministic from username so it stays stable (simple hash)
  const seed = username.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let i = 0; i < 4; i++) suffix += chars[(seed * (i + 7) * 13) % chars.length];
  return `${base}-${suffix}`;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const { user, logout } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);
  const [riskValue, setRiskValue] = useState(50);
  const [enabledMarkets, setEnabledMarkets] = useState({
    Stocks: true, Crypto: true, Forex: true, Bonds: false, Commodities: false
  });
  const [twoFA, setTwoFA] = useState(true);
  const [immersive3D, setImmersive3D] = useState(false);
  const [activeSkin, setActiveSkin] = useState("deep-space");
  const [notifications, setNotifications] = useState(true);
  const [copiedRef, setCopiedRef] = useState(false);

  const refCode = generateReferralCode(user?.username || "trader");
  const refLink = `https://home-for-ai.pplx.app/ref/${refCode}`;

  function copyRefLink() {
    navigator.clipboard.writeText(refLink).catch(() => {});
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  }

  const API_KEY_MASKED = "sk-hfai-••••••••••••••••••••••••••••••4f2a";

  const toggleMarket = (market: string) => {
    setEnabledMarkets(prev => ({ ...prev, [market]: !prev[market as keyof typeof prev] }));
  };

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-1">
            {/* Auth banner */}
            {user ? (
              <div className="glass rounded-xl p-3 flex items-center justify-between mb-4 border border-[#4F46E5]/20 bg-[#4F46E5]/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] flex items-center justify-center text-sm">
                    🐱
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/80">{user.username}</p>
                    <p className="text-[10px] text-white/35">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1 text-xs text-red-400/60 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/[0.05]"
                >
                  <LogOut size={11} /> Sign Out
                </button>
              </div>
            ) : (
              <div className="glass rounded-xl p-3 flex items-center justify-between mb-4 border border-white/[0.08]">
                <div>
                  <p className="text-xs font-semibold text-white/70">Not signed in</p>
                  <p className="text-[10px] text-white/35">Sign in to sync your preferences</p>
                </div>
                <Link href="/auth">
                  <button className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA]">
                    <LogIn size={11} /> Sign In
                  </button>
                </Link>
              </div>
            )}
            <SettingRow label="Avatar" description="Your profile emoji">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] flex items-center justify-center text-lg">
                  🧑‍💻
                </div>
                <ChevronRight size={14} className="text-white/30" />
              </div>
            </SettingRow>
            <SettingRow label="Display Name" description="Shown to your agents">
              <input
                className="bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-1.5 text-sm text-white/80 outline-none focus:border-[#4F46E5]/50 w-40"
                defaultValue={user?.username ?? "Trader Pro"}
                data-testid="input-display-name"
              />
            </SettingRow>
            <SettingRow label="Notifications" description="Agent alerts and trade confirmations">
              <Toggle checked={notifications} onChange={setNotifications} />
            </SettingRow>
            <SettingRow label="Email Notifications" description="Daily summary and alerts">
              <Toggle checked={true} onChange={() => {}} />
            </SettingRow>
          </div>
        );

      case "skins":
        return (
          <div className="space-y-4">
            <p className="text-xs text-white/35">Choose your visual theme</p>
            <div className="grid grid-cols-2 gap-3">
              {SKINS.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => setActiveSkin(skin.id)}
                  data-testid={`skin-${skin.id}`}
                  className={`glass rounded-2xl p-4 text-left transition-all ${
                    activeSkin === skin.id
                      ? "border-[#4F46E5]/50 bg-[#4F46E5]/10"
                      : "hover:border-white/15"
                  }`}
                >
                  <div className="flex gap-1.5 mb-3">
                    {skin.palette.map((color, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full border border-white/10"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <p className="font-display font-semibold text-sm text-white/80">{skin.name}</p>
                  <p className="text-[11px] text-white/35 mt-0.5">{skin.desc}</p>
                  {activeSkin === skin.id && (
                    <div className="mt-2 text-[10px] text-[#4F46E5] font-medium">● Active</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case "3d":
        return (
          <div className="space-y-1">
            <SettingRow
              label={
                <span className="flex items-center gap-2">
                  Immersive 3D Mode
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[#4F46E5]/20 text-[#818CF8] border border-[#4F46E5]/30">
                    BETA
                  </span>
                </span> as any
              }
              description="Enable WebGL 3D charts and spatial data views"
            >
              <Toggle checked={immersive3D} onChange={setImmersive3D} />
            </SettingRow>
            {immersive3D && (
              <div className="mt-4 glass rounded-xl p-4 border border-[#06B6D4]/20 bg-[#06B6D4]/5">
                <p className="text-sm text-[#22D3EE]">3D mode is active</p>
                <p className="text-xs text-white/40 mt-1">Requires a WebGL-capable device. May increase battery usage.</p>
              </div>
            )}
            <div className="mt-4 glass rounded-xl p-4">
              <p className="text-sm text-white/60 font-medium">About 3D Mode</p>
              <p className="text-xs text-white/35 mt-2 leading-relaxed">
                Immersive 3D mode replaces flat charts with interactive three-dimensional visualizations.
                Rotate, zoom, and explore your portfolio data in spatial form. Built with WebGL.
              </p>
            </div>
          </div>
        );

      case "trading":
        return (
          <div className="space-y-4">
            {/* Risk Tolerance Slider */}
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-white/70 font-medium mb-3">Risk Tolerance</p>
              <input
                type="range"
                min="0"
                max="100"
                value={riskValue}
                onChange={e => setRiskValue(Number(e.target.value))}
                data-testid="risk-slider"
                className="w-full accent-[#4F46E5]"
              />
              <div className="flex justify-between text-[10px] text-white/30 mt-1">
                <span>Conservative</span>
                <span className={`font-mono font-semibold ${
                  riskValue > 66 ? "text-red-400" : riskValue > 33 ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {riskValue > 66 ? "Aggressive" : riskValue > 33 ? "Moderate" : "Conservative"}
                </span>
                <span>Aggressive</span>
              </div>
            </div>

            {/* Max Position Size */}
            <SettingRow label="Max Position Size" description="Per trade limit">
              <div className="flex items-center gap-1">
                <span className="text-white/30 text-sm">$</span>
                <input
                  className="bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-1.5 text-sm text-white/80 font-mono outline-none focus:border-[#4F46E5]/50 w-24 text-right"
                  defaultValue="5000"
                  data-testid="input-max-position"
                />
              </div>
            </SettingRow>

            {/* Enabled Markets */}
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-white/70 font-medium mb-3">Enabled Markets</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(enabledMarkets).map(([market, enabled]) => (
                  <label
                    key={market}
                    className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-white/[0.04]"
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleMarket(market)}
                      data-testid={`market-checkbox-${market}`}
                      className="accent-[#4F46E5] w-4 h-4"
                    />
                    <span className={`text-sm ${enabled ? "text-white/80" : "text-white/30"}`}>{market}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case "copy":
        return (
          <div className="space-y-4">
            <div className="glass rounded-xl p-4 border border-amber-500/20">
              <p className="font-display font-semibold text-sm text-amber-300 mb-2">How Copy Trading Works</p>
              <p className="text-xs text-white/50 leading-relaxed">
                When you enable Copy Trade on an agent, your account automatically mirrors that agent's positions at a proportional size.
                You earn 85% of the copy trade profits. The platform retains 15% as a service fee.
              </p>
            </div>

            <SettingRow label="Profit Share" description="Your share of copy trade gains">
              <span className="font-mono text-sm text-emerald-400 font-semibold">85%</span>
            </SettingRow>

            <SettingRow label="Platform Fee" description="Deducted from copy trade profits">
              <span className="font-mono text-sm text-amber-400 font-semibold">15%</span>
            </SettingRow>

            <SettingRow label="Payout Schedule" description="When profits are distributed">
              <select
                className="bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-1.5 text-sm text-white/80 outline-none"
                data-testid="payout-schedule"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </SettingRow>

            <SettingRow label="Withdrawal Address" description="Your crypto withdrawal address">
              <input
                className="bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white/60 font-mono outline-none focus:border-[#4F46E5]/50 w-44"
                defaultValue="0x1f9840...7f7e"
                data-testid="withdrawal-address"
              />
            </SettingRow>
          </div>
        );

      case "security":
        return (
          <div className="space-y-1">
            {/* AES-256 badge */}
            <div className="glass rounded-xl p-3 flex items-center gap-2 mb-4 border border-emerald-500/20 bg-emerald-500/[0.04]">
              <span className="text-lg">🔒</span>
              <div>
                <p className="text-xs font-semibold text-emerald-400">All data encrypted AES-256</p>
                <p className="text-[10px] text-white/35">End-to-end encrypted. Zero-knowledge architecture.</p>
              </div>
            </div>

            <SettingRow label="Two-Factor Authentication" description="Authenticator app or SMS">
              <div className="flex items-center gap-2">
                {twoFA && (
                  <span className="text-[10px] text-emerald-400 font-medium">Active</span>
                )}
                <Toggle checked={twoFA} onChange={setTwoFA} />
              </div>
            </SettingRow>

            <SettingRow label="Active Sessions" description="Manage logged-in devices">
              <button className="text-xs text-[#4F46E5] hover:text-[#818CF8] font-medium">
                View (2)
              </button>
            </SettingRow>

            <div className="glass rounded-xl p-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-white/70 font-medium">API Key</p>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70"
                  data-testid="toggle-api-key"
                >
                  {showApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showApiKey ? "Hide" : "Reveal"}
                </button>
              </div>
              <div className="bg-white/[0.04] rounded-lg px-3 py-2">
                <p className="font-mono text-xs text-white/50 tracking-wide">
                  {showApiKey ? "sk-hfai-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p64f2a" : API_KEY_MASKED}
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <button className="text-[11px] text-white/30 hover:text-white/60 px-2 py-1 rounded-lg hover:bg-white/[0.04]">
                  Copy
                </button>
                <button className="text-[11px] text-red-400/60 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/[0.05]">
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        );

      case "referral":
        return (
          <div className="space-y-5">
            {/* Reward banner */}
            <div className="glass rounded-xl p-4 border border-[#F59E0B]/25 bg-[#F59E0B]/[0.05] flex items-start gap-3">
              <span className="text-2xl mt-0.5">🎁</span>
              <div>
                <p className="text-sm font-semibold text-amber-300">Earn 5% for 12 months</p>
                <p className="text-xs text-white/45 mt-0.5 leading-relaxed">
                  For every user you refer, you earn 5% of their platform fees for 12 months after they join.
                  Paid out monthly, no cap.
                </p>
              </div>
            </div>

            {/* Your referral code */}
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-white/40 font-medium uppercase tracking-wide mb-3">Your Referral Code</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
                  <p className="font-mono text-lg font-bold text-[#818CF8] tracking-widest">{refCode}</p>
                </div>
                <button
                  onClick={copyRefLink}
                  data-testid="copy-ref-link"
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    copiedRef
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                      : "bg-[#4F46E5]/15 border border-[#4F46E5]/30 text-[#818CF8] hover:bg-[#4F46E5]/25"
                  }`}
                >
                  {copiedRef ? <Check size={14} /> : <Copy size={14} />}
                  {copiedRef ? "Copied!" : "Copy Link"}
                </button>
              </div>
              <p className="text-[11px] text-white/25 mt-2 font-mono truncate">{refLink}</p>
            </div>

            {/* Share buttons */}
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-white/40 font-medium uppercase tracking-wide mb-3">Share Your Link</p>
              <div className="flex gap-2">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join me on Home for AI — AI agents trading for you 24/7. Use my referral: ${refLink}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white/60 bg-white/[0.05] border border-white/[0.07] hover:border-white/20 hover:text-white/80 transition-all"
                  data-testid="share-twitter"
                >
                  <ExternalLink size={12} /> Share on X
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Join me on Home for AI — AI agents that trade for you. Use my link: ${refLink}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white/60 bg-white/[0.05] border border-white/[0.07] hover:border-white/20 hover:text-white/80 transition-all"
                  data-testid="share-whatsapp"
                >
                  <ExternalLink size={12} /> Share on WhatsApp
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-xl p-4 text-center">
                <p className="font-mono text-2xl font-bold text-white/80">0</p>
                <p className="text-[11px] text-white/35 mt-1">Referrals Made</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <p className="font-mono text-2xl font-bold text-emerald-400">$0.00</p>
                <p className="text-[11px] text-white/35 mt-1">Referral Earnings</p>
              </div>
            </div>

            {/* How it works steps */}
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-white/40 font-medium uppercase tracking-wide mb-3">How It Works</p>
              <ol className="space-y-3">
                {[
                  { n: 1, text: "Share your unique link or code with friends" },
                  { n: 2, text: "They sign up and make their first deposit" },
                  { n: 3, text: "You earn 5% of their platform fees every month for 12 months" },
                ].map(({ n, text }) => (
                  <li key={n} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#4F46E5]/20 border border-[#4F46E5]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-[#818CF8]">{n}</span>
                    </div>
                    <p className="text-xs text-white/55 leading-relaxed">{text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        );

      case "legal":
        return (
          <div className="space-y-3">
            {[
              { label: "Terms of Service", href: "#", desc: "Last updated June 2026" },
              { label: "Risk Disclosure", href: "#", desc: "Trading involves significant risk" },
              { label: "Privacy Policy", href: "#", desc: "How we handle your data" },
              { label: "Cookie Policy", href: "#", desc: "Browser storage and tracking" },
            ].map(({ label, href, desc }) => (
              <a
                key={label}
                href={href}
                className="flex items-center justify-between p-4 glass rounded-xl hover:border-white/15 transition-all group"
                data-testid={`legal-${label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div>
                  <p className="text-sm text-white/75 font-medium group-hover:text-white/90">{label}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">{desc}</p>
                </div>
                <ChevronRight size={14} className="text-white/20 group-hover:text-white/50" />
              </a>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl text-white/90">Settings</h1>
        <p className="text-sm text-white/35 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab list */}
        <aside className="lg:w-48 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {TABS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                data-testid={`settings-tab-${id}`}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left whitespace-nowrap transition-all ${
                  activeTab === id
                    ? "bg-[#4F46E5]/15 border border-[#4F46E5]/30 text-[#818CF8]"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
              >
                <Icon size={14} />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 glass rounded-2xl p-5">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
