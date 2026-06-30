import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutGrid, MessageCircle, PieChart, Globe, Settings,
  Bell, ChevronDown, Lock, ShieldCheck, TrendingUp, Wallet, ArrowLeftRight,
  LogIn, LogOut, User, PlusCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { QuickDepositModal } from "./QuickDepositModal";

// Cat paw SVG logo
function CatPawLogo() {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-label="Home for AI logo"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-7 h-7"
    >
      {/* Main paw pad */}
      <ellipse cx="16" cy="20" rx="7" ry="6" fill="#4F46E5" opacity="0.9" />
      {/* Top paw pads */}
      <ellipse cx="9" cy="11" rx="3.2" ry="3" fill="#4F46E5" opacity="0.7" />
      <ellipse cx="16" cy="9" rx="3.2" ry="3" fill="#4F46E5" opacity="0.7" />
      <ellipse cx="23" cy="11" rx="3.2" ry="3" fill="#4F46E5" opacity="0.7" />
      {/* Shine */}
      <ellipse cx="14" cy="18" rx="2.5" ry="2" fill="white" opacity="0.15" />
    </svg>
  );
}

const navItems = [
  { path: "/", icon: LayoutGrid, label: "Workshop" },
  { path: "/market", icon: Globe, label: "Market" },
  { path: "/trade", icon: TrendingUp, label: "Trade" },
  { path: "/wallet", icon: Wallet, label: "Wallet" },
  { path: "/portfolio", icon: PieChart, label: "Portfolio" },
  { path: "/chat", icon: MessageCircle, label: "Chat" },
  { path: "/convert", icon: ArrowLeftRight, label: "Convert" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

// Map agent id → emoji (matches storage seed data)
const AGENT_EMOJI: Record<string, string> = {
  luna: "🐱", shadow: "🐈‍⬛", pixel: "😸", nova: "😻",
  blaze: "🙀", echo: "😺", cipher: "🐾", mochi: "😽",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const { user, logout } = useAuth();

  const agentEmoji = user ? (AGENT_EMOJI[user.agentId] ?? "🐱") : null;

  return (
    <div className="min-h-screen bg-[#050508] flex flex-col" style={{
      backgroundImage: "radial-gradient(circle at 50% 0%, rgba(79,70,229,0.08) 0%, transparent 60%)"
    }}>
      {/* Quick Deposit Modal */}
      <QuickDepositModal open={showDeposit} onClose={() => setShowDeposit(false)} />

      {/* Top Bar */}
      <header className="h-12 flex items-center justify-between px-4 lg:px-6 border-b border-white/[0.05] flex-shrink-0 glass z-50 sticky top-0">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer group">
            <CatPawLogo />
            <span className="font-display font-semibold text-sm text-white/90 tracking-tight hidden sm:block">
              Home for AI
            </span>
          </div>
        </Link>

        {/* Portfolio Value Center */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="font-mono text-sm font-semibold text-white/90 tracking-tight">
            $47,823.00
          </div>
          <div className="text-[10px] text-emerald-400 font-medium">+$1,234 (+2.6%)</div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* 2FA Badge */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 bg-emerald-500/5">
            <ShieldCheck size={9} />
            2FA
          </div>

          {/* Add Funds button */}
          <button
            onClick={() => setShowDeposit(true)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-white bg-emerald-500/80 hover:bg-emerald-500 transition-all"
          >
            <PlusCircle size={11} />
            <span className="hidden sm:inline">Add Funds</span>
          </button>

          {/* Notification */}
          <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white/80">
            <Bell size={15} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
          </button>

          {/* User Avatar / Sign In */}
          {user ? (
            <div className="relative">
              <div
                className="flex items-center gap-1.5 cursor-pointer rounded-lg px-2 py-1 hover:bg-white/[0.06]"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] flex items-center justify-center text-[11px]">
                  {agentEmoji}
                </div>
                <span className="hidden sm:block text-xs text-white/60 max-w-[80px] truncate">{user.username}</span>
                <ChevronDown size={11} className="text-white/40" />
              </div>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 glass rounded-xl border border-white/[0.08] py-1 z-50">
                  <div className="px-3 py-2 border-b border-white/[0.06]">
                    <p className="text-xs font-semibold text-white/80">{user.username}</p>
                    <p className="text-[10px] text-white/35 mt-0.5 truncate">{user.email}</p>
                  </div>
                  <Link href="/settings">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:text-white/90 hover:bg-white/[0.05]">
                      <User size={12} /> Profile
                    </button>
                  </Link>
                  <button
                    onClick={() => { logout(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.05]"
                  >
                    <LogOut size={12} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth">
              <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-white/60 hover:text-white/90 hover:bg-white/[0.06] border border-white/[0.08]">
                <LogIn size={12} />
                Sign In
              </button>
            </Link>
          )}
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Icon Rail — desktop */}
        <nav className="hidden lg:flex flex-col items-center py-4 gap-1 w-16 border-r border-white/[0.05] flex-shrink-0 glass">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location === path;
            return (
              <Link key={path} href={path}>
                <div className={`nav-icon ${isActive ? "active" : ""}`} data-testid={`nav-${label.toLowerCase()}`}>
                  <Icon size={18} />
                  <span className="nav-tooltip">{label}</span>
                </div>
              </Link>
            );
          })}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Auth icon at bottom of sidebar */}
          {user ? (
            <div className="flex flex-col items-center gap-0.5 pb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] flex items-center justify-center text-sm">
                {agentEmoji}
              </div>
              <span className="text-[8px] text-white/30 max-w-[56px] truncate text-center">{user.username}</span>
            </div>
          ) : (
            <Link href="/auth">
              <div className="nav-icon" title="Sign In">
                <LogIn size={14} className="text-[#4F46E5]" />
                <span className="nav-tooltip">Sign In</span>
              </div>
            </Link>
          )}

          {/* Lock badge */}
          <div className="nav-icon" title="Bank-grade encryption">
            <Lock size={14} className="text-emerald-500/70" />
          </div>
        </nav>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Navigation Rail — mobile */}
      <nav className="lg:hidden flex items-center justify-around py-2 px-4 border-t border-white/[0.05] glass sticky bottom-0 z-50">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <div className={`flex flex-col items-center gap-0.5 p-2 rounded-lg cursor-pointer ${
                isActive ? "text-[#4F46E5]" : "text-white/35"
              }`}>
                <Icon size={20} />
                <span className="text-[9px] font-medium">{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
