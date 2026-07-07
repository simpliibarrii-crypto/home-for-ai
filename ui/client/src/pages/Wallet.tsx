import { useState, useMemo } from "react";
import {
  Lock, ShieldCheck, Eye, EyeOff, Copy, Check, AlertTriangle,
  Cpu, ArrowUpRight, ArrowDownLeft, Fingerprint, Shield, Zap, RefreshCw,
  TrendingUp, TrendingDown, Plus, Minus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

// ─── BIP-39 word pool ─────────────────────────────────────────────────────────
const BIP39_POOL = [
  "abandon","ability","able","about","above","absent","absorb","abstract",
  "absurd","abuse","access","accident","account","accuse","achieve","acid",
  "acoustic","acquire","across","action","actor","actress","actual","adapt",
  "agent","agree","ahead","album","alert","allow","almost","alone",
  "alpha","already","alter","always","amateur","amount","amused","analyst",
  "anchor","ancient","anger","animal","answer","antenna","anxiety","appear",
  "april","arctic","argue","armor","army","around","arrange","arrest",
];

function generateMnemonic(): string[] {
  const words: string[] = [];
  const pool = [...BIP39_POOL];
  const poolSize = pool.length;
  const randomBytes = new Uint16Array(12);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < 12; i++) {
    const idx = randomBytes[i] % poolSize;
    words.push(pool[idx]);
  }
  return words;
}

// ─── Holdings data ────────────────────────────────────────────────────────────
interface Holding {
  symbol: string;
  name: string;
  balance: number;
  priceUSD: number;
  avgBuyPrice: number;
  change24h: number;
  color: string;
  address: string;
  icon: string;
}

const HOLDINGS: Holding[] = [
  { symbol: "BTC",  name: "Bitcoin",    balance: 0.42814,   priceUSD: 67000,  avgBuyPrice: 64200,  change24h: 2.14,  color: "#F59E0B",  address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", icon: "₿" },
  { symbol: "ETH",  name: "Ethereum",   balance: 4.8120,    priceUSD: 3412,   avgBuyPrice: 3180,   change24h: 1.87,  color: "#6366F1",  address: "0x742d35Cc6634C0532925a3b8D4C9F5AC5f2a3E7f", icon: "Ξ" },
  { symbol: "SOL",  name: "Solana",     balance: 24.500,    priceUSD: 187,    avgBuyPrice: 198,    change24h: 4.21,  color: "#06B6D4",  address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV", icon: "◎" },
  { symbol: "BNB",  name: "BNB",        balance: 3.50,      priceUSD: 610,    avgBuyPrice: 590,    change24h: 0.88,  color: "#F59E0B",  address: "bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2",   icon: "B" },
  { symbol: "USDT", name: "Tether",     balance: 1850.00,   priceUSD: 1.000,  avgBuyPrice: 1.000,  change24h: 0.01,  color: "#10B981",  address: "0x742d35Cc6634C0532925a3b8D4C9F5AC5f2a3E7f", icon: "₮" },
  { symbol: "USDC", name: "USD Coin",   balance: 2500.00,   priceUSD: 1.000,  avgBuyPrice: 1.000,  change24h: 0.01,  color: "#3B82F6",  address: "0x742d35Cc6634C0532925a3b8D4C9F5AC5f2a3E7f", icon: "$" },
];

// ─── Recent Transactions ─────────────────────────────────────────────────────
const RECENT_TXS = [
  { id: 1, type: "receive", asset: "BTC",  amount: 0.05,    valueUSD: 3350,  time: "2 hours ago",   hash: "bc1q...4h7a" },
  { id: 2, type: "send",    asset: "ETH",  amount: 0.8,     valueUSD: 2729,  time: "5 hours ago",   hash: "0x3a...b2f1" },
  { id: 3, type: "receive", asset: "USDT", amount: 500,     valueUSD: 500,   time: "1 day ago",     hash: "0x8f...c4e2" },
  { id: 4, type: "send",    asset: "SOL",  amount: 5,       valueUSD: 935,   time: "2 days ago",    hash: "7Ec...LtV" },
  { id: 5, type: "receive", asset: "BNB",  amount: 1.5,     valueUSD: 915,   time: "3 days ago",    hash: "bnb1...h2" },
  { id: 6, type: "send",    asset: "BTC",  amount: 0.01,    valueUSD: 670,   time: "5 days ago",    hash: "bc1q...m3k9" },
];

// ─── Deposit/Withdraw Modals ─────────────────────────────────────────────────
function DepositModal({ holding, onClose }: { holding: Holding; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    navigator.clipboard.writeText(holding.address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[#0c0f1a] border-white/[0.08] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span style={{ color: holding.color }}>{holding.icon}</span>
            Deposit {holding.symbol}
          </DialogTitle>
          <DialogDescription className="text-white/40">Send {holding.symbol} to the address below</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-white/[0.04] rounded-xl p-4 text-center">
            <div className="w-32 h-32 mx-auto bg-white rounded-xl flex items-center justify-center mb-3">
              <div className="text-[10px] text-black font-mono leading-tight px-2 text-center break-all opacity-60">{holding.address.slice(0, 20)}…</div>
            </div>
            <p className="text-[10px] text-white/40 mb-2">Scan QR or copy address</p>
          </div>
          <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 py-2">
            <code className="flex-1 font-mono text-[10px] text-white/60 truncate">{holding.address}</code>
            <button onClick={copyAddress} className="flex-shrink-0 text-white/40 hover:text-[#4F46E5] transition-colors">
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <div className="flex gap-2">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/80">Only send {holding.symbol} to this address. Sending other assets may result in permanent loss.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawModalLocal({ holding, onClose }: { holding: Holding; onClose: () => void }) {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();

  function submit() {
    if (!address || !amount) return;
    toast({ title: "Withdrawal initiated", description: `${amount} ${holding.symbol} sent to ${address.slice(0, 12)}…` });
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[#0c0f1a] border-white/[0.08] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span style={{ color: holding.color }}>{holding.icon}</span>
            Withdraw {holding.symbol}
          </DialogTitle>
          <DialogDescription className="text-white/40">Available: {holding.balance} {holding.symbol}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Recipient Address</label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder={holding.address.slice(0, 20) + "…"} className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-xs h-9" />
          </div>
          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Amount</label>
            <div className="relative">
              <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" placeholder="0.00" className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm h-9 pr-16" />
              <button onClick={() => setAmount(String(holding.balance))} className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#4F46E5] hover:text-[#818CF8] font-semibold">MAX</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="confirm-withdraw" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="accent-[#4F46E5]" />
            <label htmlFor="confirm-withdraw" className="text-[10px] text-white/50 cursor-pointer">I confirm this withdrawal is correct and irreversible</label>
          </div>
          <Button onClick={submit} disabled={!address || !amount || !confirmed} className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold disabled:opacity-30">
            Withdraw {holding.symbol}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Wallet Page ──────────────────────────────────────────────────────────────
export default function WalletPage() {
  const [showBalance, setShowBalance] = useState(true);
  const [depositModal, setDepositModal] = useState<Holding | null>(null);
  const [withdrawModal, setWithdrawModal] = useState<Holding | null>(null);
  const [seedPhraseOpen, setSeedPhraseOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [seedWords] = useState<string[]>(() => generateMnemonic());
  const [seedRevealed, setSeedRevealed] = useState(false);
  const { toast } = useToast();

  const totalUSD = useMemo(() => HOLDINGS.reduce((s, h) => s + h.balance * h.priceUSD, 0), []);
  const totalBTC = totalUSD / 67000;

  // 24h portfolio change
  const change24h = useMemo(() => HOLDINGS.reduce((s, h) => s + (h.balance * h.priceUSD * h.change24h / 100), 0), []);
  const change24hPct = (change24h / (totalUSD - change24h)) * 100;

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {depositModal && <DepositModal holding={depositModal} onClose={() => setDepositModal(null)} />}
      {withdrawModal && <WithdrawModalLocal holding={withdrawModal} onClose={() => setWithdrawModal(null)} />}

      {/* Page Header */}
      <div>
        <h1 className="font-display font-bold text-xl text-white/90">Wallet</h1>
        <p className="text-sm text-white/35 mt-0.5">Your crypto balances</p>
      </div>

      {/* Total Balance Card */}
      <div className="glass rounded-2xl p-6 border border-[#4F46E5]/20 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-white/40 uppercase tracking-widest font-mono">Total Balance</p>
              <button onClick={() => setShowBalance(b => !b)} className="text-white/30 hover:text-white/60 transition-colors">
                {showBalance ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
            {showBalance ? (
              <>
                <div className="font-mono font-bold text-4xl text-white">${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="font-mono text-sm text-white/40 mt-1">≈ {totalBTC.toFixed(5)} BTC</div>
              </>
            ) : (
              <div className="font-mono font-bold text-4xl text-white">••••••••</div>
            )}
            <div className={`flex items-center gap-1 mt-2 text-sm font-mono ${change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {change24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{change24h >= 0 ? "+" : ""}${Math.abs(change24h).toFixed(2)} ({change24hPct >= 0 ? "+" : ""}{change24hPct.toFixed(2)}%)</span>
              <span className="text-white/30 text-xs ml-1">24h</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => HOLDINGS[0] && setDepositModal(HOLDINGS[0])}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#4338CA] transition-all"
              >
                <ArrowDownLeft size={14} /> Deposit
              </button>
              <button
                onClick={() => HOLDINGS[0] && setWithdrawModal(HOLDINGS[0])}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/[0.1] text-white/60 text-xs font-semibold hover:text-white hover:border-white/20 transition-all"
              >
                <ArrowUpRight size={14} /> Withdraw
              </button>
            </div>
            <button
              onClick={() => setSeedPhraseOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-amber-500/30 text-amber-400/70 text-xs font-semibold hover:text-amber-400 hover:border-amber-500/50 transition-all"
            >
              <Lock size={12} /> Backup Wallet
            </button>
          </div>
        </div>

        {/* Security badges */}
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/[0.05] flex-wrap">
          <span className="footer-badge"><ShieldCheck size={10} /> AES-256 Encrypted</span>
          <span className="footer-badge"><Fingerprint size={10} /> Non-custodial</span>
          <span className="footer-badge"><Shield size={10} /> SOC 2 Type II</span>
        </div>
      </div>

      {/* Asset Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Assets</p>
          <span className="text-[10px] text-white/30">{HOLDINGS.length} coins</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-white/[0.04] text-[10px] text-white/30 uppercase tracking-wide">
                <th className="px-5 py-2 text-left">Coin</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2 text-right">Avg Buy</th>
                <th className="px-3 py-2 text-right">Current Price</th>
                <th className="px-3 py-2 text-right">Value (USD)</th>
                <th className="px-3 py-2 text-right">P&L</th>
                <th className="px-3 py-2 text-right">P&L %</th>
                <th className="px-5 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {HOLDINGS.map((h) => {
                const valueUSD = h.balance * h.priceUSD;
                const costBasis = h.balance * h.avgBuyPrice;
                const pnl = valueUSD - costBasis;
                const pnlPct = ((h.priceUSD - h.avgBuyPrice) / h.avgBuyPrice) * 100;
                const isPnlPos = pnl >= 0;
                return (
                  <tr key={h.symbol} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: h.color + "20", border: `1px solid ${h.color}40`, color: h.color }}>
                          {h.icon}
                        </div>
                        <div>
                          <div className="font-mono font-semibold text-white/90">{h.symbol}</div>
                          <div className="text-[9px] text-white/30">{h.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-white/70">{h.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</td>
                    <td className="px-3 py-3 text-right font-mono text-white/40">${h.avgBuyPrice >= 1 ? h.avgBuyPrice.toLocaleString() : h.avgBuyPrice.toFixed(4)}</td>
                    <td className="px-3 py-3 text-right font-mono text-white/70">${h.priceUSD >= 1 ? h.priceUSD.toLocaleString() : h.priceUSD.toFixed(4)}</td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-white/80">${valueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className={`px-3 py-3 text-right font-mono font-semibold ${isPnlPos ? "text-emerald-400" : "text-red-400"}`}>
                      {isPnlPos ? "+" : ""}{pnl.toFixed(2)}
                    </td>
                    <td className={`px-3 py-3 text-right font-mono ${isPnlPos ? "text-emerald-400" : "text-red-400"}`}>
                      {isPnlPos ? "+" : ""}{pnlPct.toFixed(2)}%
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setDepositModal(h)} className="text-[9px] px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-0.5">
                          <Plus size={9} /> Deposit
                        </button>
                        <button onClick={() => setWithdrawModal(h)} className="text-[9px] px-2 py-1 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white/40 hover:text-white/70 hover:border-white/20 transition-all flex items-center gap-0.5">
                          <Minus size={9} /> Withdraw
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Recent Transactions</p>
        </div>
        <div className="divide-y divide-white/[0.03]">
          {RECENT_TXS.map((tx) => {
            const isReceive = tx.type === "receive";
            const holding = HOLDINGS.find(h => h.symbol === tx.asset);
            return (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isReceive ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                  {isReceive ? <ArrowDownLeft size={14} className="text-emerald-400" /> : <ArrowUpRight size={14} className="text-red-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white/80 capitalize">{tx.type}</span>
                    <span className="font-mono text-xs text-white/50">{tx.asset}</span>
                  </div>
                  <div className="text-[10px] text-white/30 font-mono">{tx.hash} · {tx.time}</div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-sm font-semibold ${isReceive ? "text-emerald-400" : "text-red-400"}`}>
                    {isReceive ? "+" : "-"}{tx.amount} {tx.asset}
                  </div>
                  <div className="font-mono text-[10px] text-white/30">${tx.valueUSD.toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seed Phrase Modal */}
      <Dialog open={seedPhraseOpen} onOpenChange={setSeedPhraseOpen}>
        <DialogContent className="bg-[#0c0f1a] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Lock size={16} /> Backup Seed Phrase
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Write these 12 words down and keep them safe. Never share them with anyone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <div className="flex gap-2">
                <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400/80">Anyone with this phrase can steal your funds. Store it offline.</p>
              </div>
            </div>

            {!seedRevealed ? (
              <button onClick={() => setSeedRevealed(true)} className="w-full py-10 rounded-xl border-2 border-dashed border-amber-500/30 text-amber-400/60 hover:text-amber-400 hover:border-amber-500/50 transition-all flex flex-col items-center gap-2">
                <EyeOff size={24} />
                <span className="text-sm font-semibold">Click to reveal seed phrase</span>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {seedWords.map((word, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-white/[0.04] rounded-lg px-2 py-1.5">
                    <span className="text-[9px] text-white/25 font-mono w-4 flex-shrink-0">{i + 1}.</span>
                    <span className="font-mono text-xs text-white/80">{word}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => { setSeedPhraseOpen(false); setSeedRevealed(false); }}
              className="w-full py-2.5 rounded-xl bg-[#4F46E5] text-white text-sm font-semibold hover:bg-[#4338CA] transition-all"
            >
              I've saved my seed phrase
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
