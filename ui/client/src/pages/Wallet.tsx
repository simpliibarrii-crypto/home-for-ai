import { useState, useMemo } from "react";
import {
  Lock, ShieldCheck, Eye, EyeOff, Copy, Check, AlertTriangle,
  Cpu, ArrowUpRight, ArrowDownLeft, Fingerprint, Shield, Zap, RefreshCw
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
  // Simple deterministic shuffle using a seed for variety
  const seed = Date.now() % pool.length;
  for (let i = 0; i < 12; i++) {
    const idx = (seed + i * 7 + i * i * 3) % pool.length;
    words.push(pool[idx]);
  }
  return words;
}

// ─── Holdings data ────────────────────────────────────────────────────────────

interface Holding {
  symbol: string;
  name: string;
  balance: number;
  priceCAD: number;
  change24h: number;
  color: string;
  address: string;
  icon: string;
}

const HOLDINGS: Holding[] = [
  {
    symbol: "BTC", name: "Bitcoin", balance: 0.42814, priceCAD: 135240.00,
    change24h: 2.14, color: "#F59E0B",
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    icon: "₿",
  },
  {
    symbol: "ETH", name: "Ethereum", balance: 4.8120, priceCAD: 4680.00,
    change24h: 1.87, color: "#6366F1",
    address: "0x742d35Cc6634C0532925a3b8D4C9F5AC5f2a3E7f",
    icon: "Ξ",
  },
  {
    symbol: "SOL", name: "Solana", balance: 24.500, priceCAD: 257.80,
    change24h: 4.21, color: "#06B6D4",
    address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
    icon: "◎",
  },
  {
    symbol: "USDC", name: "USD Coin", balance: 2500.00, priceCAD: 1.362,
    change24h: 0.01, color: "#10B981",
    address: "0x742d35Cc6634C0532925a3b8D4C9F5AC5f2a3E7f",
    icon: "$",
  },
];

// ─── Transaction history ──────────────────────────────────────────────────────

const TRANSACTIONS = [
  { id: 1, type: "received", symbol: "BTC", amount: 0.05, amountCAD: 6762.00, from: "bc1q8c4fje...d3xq", to: "bc1qxy2...wlh", time: "2026-06-29 14:22", confirmations: 6, hash: "a3f8d9...12bc" },
  { id: 2, type: "sent", symbol: "ETH", amount: 1.5, amountCAD: 7020.00, from: "0x742d...E7f", to: "0xd8dA...c2bA", time: "2026-06-28 09:41", confirmations: 24, hash: "7e4c12...9f1a" },
  { id: 3, type: "received", symbol: "USDC", amount: 1000.00, amountCAD: 1362.00, from: "0x3a8f...b4c1", to: "0x742d...E7f", time: "2026-06-27 18:05", confirmations: 18, hash: "2d9a77...4e3f" },
  { id: 4, type: "sent", symbol: "SOL", amount: 5.0, amountCAD: 1289.00, from: "7EcDhS...tV", to: "DxBu4f...kL8n", time: "2026-06-26 11:30", confirmations: 32, hash: "b5f3e1...78cd" },
  { id: 5, type: "received", symbol: "BTC", amount: 0.02, amountCAD: 2704.80, from: "1BvBMSEY...Gm", to: "bc1qxy2...wlh", time: "2026-06-25 15:12", confirmations: 42, hash: "c7a2d4...91ef" },
  { id: 6, type: "received", symbol: "ETH", amount: 2.0, amountCAD: 9360.00, from: "0x8fA5...9bD3", to: "0x742d...E7f", time: "2026-06-24 08:47", confirmations: 58, hash: "5e1b97...33ac" },
  { id: 7, type: "sent", symbol: "USDC", amount: 500.00, amountCAD: 681.00, from: "0x742d...E7f", to: "0x1dF8...cA22", time: "2026-06-23 20:33", confirmations: 72, hash: "9c4f28...67bd" },
  { id: 8, type: "received", symbol: "SOL", amount: 10.0, amountCAD: 2578.00, from: "BJ1q4k...M3nX", to: "7EcDhS...tV", time: "2026-06-22 13:18", confirmations: 88, hash: "1a7e53...44f2" },
  { id: 9, type: "sent", symbol: "BTC", amount: 0.01, amountCAD: 1352.40, from: "bc1qxy2...wlh", to: "bc1q7l8...9xp", time: "2026-06-21 09:55", confirmations: 104, hash: "e8d341...22ca" },
  { id: 10, type: "received", symbol: "USDC", amount: 2000.00, amountCAD: 2724.00, from: "0x6a9c...7d45", to: "0x742d...E7f", time: "2026-06-20 16:40", confirmations: 120, hash: "4f2b89...15df" },
];

// ─── QR Code SVG (visual mock) ────────────────────────────────────────────────

function QRCodeSVG({ address }: { address: string }) {
  // Generate a deterministic grid pattern based on address
  const cells: boolean[][] = [];
  for (let row = 0; row < 21; row++) {
    cells[row] = [];
    for (let col = 0; col < 21; col++) {
      // Finder patterns at corners
      const inFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col > 13) ||
        (row > 13 && col < 7);
      if (inFinder) {
        const r = row % 7, c = col % 7;
        cells[row][col] =
          r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      } else {
        const charCode = address.charCodeAt((row * 21 + col) % address.length) || 0;
        cells[row][col] = (charCode + row * col) % 3 !== 0;
      }
    }
  }

  return (
    <svg viewBox="0 0 21 21" width={128} height={128} className="rounded-lg" style={{ imageRendering: "pixelated" }}>
      <rect width="21" height="21" fill="white" />
      {cells.map((row, r) =>
        row.map((filled, c) =>
          filled ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="black" /> : null
        )
      )}
    </svg>
  );
}

// ─── Send Modal ───────────────────────────────────────────────────────────────

function SendModal({
  open, onClose, holding
}: {
  open: boolean; onClose: () => void; holding: Holding | null;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "pin">("form");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [addressError, setAddressError] = useState("");

  const validateAddress = (addr: string) => {
    if (!addr) return "Address is required";
    if (holding?.symbol === "BTC") {
      if (!addr.startsWith("bc1") && !addr.startsWith("1") && !addr.startsWith("3")) {
        return "Invalid Bitcoin address (must start with bc1, 1, or 3)";
      }
    } else if (holding?.symbol === "ETH" || holding?.symbol === "USDC") {
      if (!addr.startsWith("0x") || addr.length !== 42) {
        return "Invalid Ethereum address (0x + 40 hex chars)";
      }
    }
    return "";
  };

  const handleReview = () => {
    const err = validateAddress(address);
    if (err) { setAddressError(err); return; }
    if (!amount || parseFloat(amount) <= 0) return;
    setStep("pin");
  };

  const handleConfirm = () => {
    if (pin.length !== 6) {
      toast({ title: "Invalid PIN", description: "Enter your 6-digit PIN.", variant: "destructive" });
      return;
    }
    toast({
      title: `Transaction submitted`,
      description: `${amount} ${holding?.symbol} sent to ${address.slice(0, 10)}...`,
    });
    onClose();
    setStep("form");
    setAddress(""); setAmount(""); setPin("");
  };

  const gasEstimate = holding?.symbol === "BTC" ? "~0.0001 BTC ($13.52)" :
    holding?.symbol === "ETH" ? "~0.002 ETH ($9.36)" :
    holding?.symbol === "USDC" ? "~$1.20 USDC" : "~0.0001 SOL ($0.03)";

  if (!holding) return null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setStep("form"); } }}>
      <DialogContent className="bg-[#050508] border-white/[0.1] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-base">
            Send {holding.symbol}
          </DialogTitle>
          <DialogDescription className="text-white/40 text-xs">
            {step === "form" ? "Enter recipient details" : "Confirm with your 6-digit PIN"}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Recipient Address</label>
              <Input
                value={address}
                onChange={e => { setAddress(e.target.value); setAddressError(""); }}
                placeholder={holding.symbol === "BTC" ? "bc1q..." : "0x..."}
                className="bg-white/[0.04] border-white/[0.08] text-white text-xs font-mono h-10"
              />
              {addressError && <p className="text-[10px] text-red-400 mt-1">{addressError}</p>}
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Amount ({holding.symbol})</label>
              <Input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                type="number"
                min="0"
                className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm h-10"
              />
              <p className="text-[10px] text-white/30 mt-1">
                Balance: {holding.balance.toFixed(4)} {holding.symbol}
              </p>
            </div>
            <div className="glass rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between"><span className="text-white/40">Network Fee</span><span className="font-mono text-white/60">{gasEstimate}</span></div>
              {amount && <div className="flex justify-between"><span className="text-white/40">Total CAD</span><span className="font-mono text-[#F59E0B]">≈ ${(parseFloat(amount || "0") * holding.priceCAD).toFixed(2)}</span></div>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-white/[0.1] text-white/60" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA]" onClick={handleReview}>Review</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="glass rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-white/40">To</span><span className="font-mono text-white/70 truncate max-w-[180px]">{address}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Amount</span><span className="font-mono text-white font-semibold">{amount} {holding.symbol}</span></div>
              <div className="flex justify-between"><span className="text-white/40">CAD Value</span><span className="font-mono text-[#F59E0B]">≈ ${(parseFloat(amount || "0") * holding.priceCAD).toFixed(2)}</span></div>
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">6-Digit PIN</label>
              <Input
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                type="password"
                maxLength={6}
                className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-xl h-12 text-center tracking-widest"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-white/[0.1] text-white/60" onClick={() => setStep("form")}>Back</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirm}>Confirm Send</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Receive Modal ────────────────────────────────────────────────────────────

function ReceiveModal({ open, onClose, holding }: { open: boolean; onClose: () => void; holding: Holding | null }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (holding) {
      navigator.clipboard.writeText(holding.address).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Address copied!", description: "Wallet address copied to clipboard." });
    }
  };

  if (!holding) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#050508] border-white/[0.1] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-base">Receive {holding.symbol}</DialogTitle>
          <DialogDescription className="text-white/40 text-xs">
            Send {holding.symbol} to this address
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-lg">
            <QRCodeSVG address={holding.address} />
          </div>
          <div className="w-full glass rounded-xl p-3">
            <p className="text-[10px] text-white/40 mb-1">Your {holding.symbol} Address</p>
            <p className="font-mono text-xs text-white/80 break-all leading-relaxed">{holding.address}</p>
          </div>
          <Button onClick={handleCopy} className="w-full bg-[#4F46E5] hover:bg-[#4338CA] gap-2">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy Address"}
          </Button>
          <p className="text-[10px] text-white/25 text-center">
            Only send {holding.symbol} to this address. Sending other assets may result in permanent loss.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Setup flow ───────────────────────────────────────────────────────────────

function WalletSetup({ onComplete }: { onComplete: () => void }) {
  const [mnemonic] = useState(() => generateMnemonic());
  const [confirmed, setConfirmed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#4F46E5]/15 border border-[#4F46E5]/25 flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-[#4F46E5]" />
        </div>
        <h1 className="font-display font-bold text-xl text-white">Create Your Wallet</h1>
        <p className="text-sm text-white/40 mt-1">A new self-custodial crypto wallet</p>
      </div>

      {/* Security badges */}
      <div className="flex flex-wrap justify-center gap-2">
        {["AES-256-GCM", "BIP-39", "BIP-44 HD", "Hardware Ready"].map(b => (
          <Badge key={b} className="text-[10px] bg-[#4F46E5]/10 text-[#818CF8] border-[#4F46E5]/25">
            {b}
          </Badge>
        ))}
      </div>

      {/* Mnemonic phrase */}
      <div className="glass rounded-2xl p-5 border border-[#F59E0B]/20">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-[#F59E0B] flex items-center gap-1.5">
            <AlertTriangle size={12} />
            12-Word Recovery Phrase
          </p>
          <button onClick={() => setRevealed(v => !v)} className="text-[10px] text-white/30 flex items-center gap-1">
            {revealed ? <EyeOff size={11} /> : <Eye size={11} />}
            {revealed ? "Hide" : "Reveal"}
          </button>
        </div>

        {revealed ? (
          <div className="grid grid-cols-3 gap-2">
            {mnemonic.map((word, i) => (
              <div key={i} className="bg-white/[0.04] rounded-lg px-2 py-1.5 text-center">
                <span className="text-[9px] text-white/25 mr-1">{i + 1}.</span>
                <span className="text-xs font-mono text-white/90">{word}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {mnemonic.map((_, i) => (
              <div key={i} className="bg-white/[0.04] rounded-lg px-2 py-1.5 text-center blur-sm">
                <span className="text-[9px] text-white/25 mr-1">{i + 1}.</span>
                <span className="text-xs font-mono text-white/90">••••••</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-[#F59E0B]/5 border border-[#F59E0B]/15 rounded-xl text-[11px] text-[#F59E0B]/80 leading-relaxed">
          ⚠ Write this down. Store it offline in a secure location. Never share it with anyone. We cannot recover it if lost.
        </div>
      </div>

      {/* Confirm */}
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded accent-[#4F46E5]"
        />
        <span className="text-xs text-white/50 leading-relaxed">
          I have written down my recovery phrase and understand that losing it means permanent loss of access to my funds.
        </span>
      </label>

      <Button
        disabled={!confirmed}
        onClick={onComplete}
        className="w-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-30 font-semibold"
      >
        Create Wallet
      </Button>
    </div>
  );
}

// ─── Main Wallet Page ─────────────────────────────────────────────────────────

export default function WalletPage() {
  const { toast } = useToast();
  const [walletCreated, setWalletCreated] = useState(false);
  const [sendModal, setSendModal] = useState<Holding | null>(null);
  const [receiveModal, setReceiveModal] = useState<Holding | null>(null);
  const [showFreezeDialog, setShowFreezeDialog] = useState(false);
  const [frozen, setFrozen] = useState(false);

  const totalCAD = useMemo(() =>
    HOLDINGS.reduce((sum, h) => sum + h.balance * h.priceCAD, 0),
    []
  );
  const totalUSD = totalCAD / 1.362; // approx CAD/USD

  if (!walletCreated) {
    return <WalletSetup onComplete={() => setWalletCreated(true)} />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-white/90">Crypto Wallet</h1>
          <p className="text-sm text-white/35 mt-0.5">Self-custodial · BIP-44 HD</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1 bg-emerald-500/5">
          <Lock size={10} />
          AES-256-GCM encrypted · BIP-39 · Hardware key ready
        </div>
      </div>

      {/* Portfolio value */}
      <div className="glass rounded-2xl p-6 text-center relative overflow-hidden" style={{
        background: "linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(6,182,212,0.06) 100%)"
      }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5]/5 to-transparent" />
        <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Total Portfolio Value</p>
        <p className="font-mono text-4xl font-bold text-white">${totalCAD.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="text-sm text-white/40 mt-1">≈ USD ${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <div className="flex justify-center gap-4 mt-4">
          <div className="text-center">
            <p className="text-[10px] text-white/30">24h Change</p>
            <p className="font-mono text-sm font-semibold text-emerald-400">+$1,842.40 (+2.1%)</p>
          </div>
          <div className="w-px bg-white/[0.08]" />
          <div className="text-center">
            <p className="text-[10px] text-white/30">Assets</p>
            <p className="font-mono text-sm font-semibold text-white/80">{HOLDINGS.length} coins</p>
          </div>
          <div className="w-px bg-white/[0.08]" />
          <div className="text-center">
            <p className="text-[10px] text-white/30">Network</p>
            <p className="font-mono text-sm font-semibold text-[#06B6D4]">Multi-chain</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings */}
        <div className="lg:col-span-2 glass rounded-2xl overflow-hidden">
          <div className="flex items-center px-5 py-4 border-b border-white/[0.05]">
            <h3 className="font-display font-semibold text-sm text-white/70">Holdings</h3>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {HOLDINGS.map(holding => {
              const valueCAD = holding.balance * holding.priceCAD;
              const isUp = holding.change24h >= 0;
              return (
                <div key={holding.symbol} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                    style={{ background: `${holding.color}20`, color: holding.color }}
                  >
                    {holding.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-white/90">{holding.name}</p>
                    <p className="font-mono text-[10px] text-white/35">{holding.balance.toFixed(4)} {holding.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-white/80">
                      ${valueCAD.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`font-mono text-[10px] font-semibold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                      {isUp ? "+" : ""}{holding.change24h}%
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => setSendModal(holding)}
                      className="h-7 text-[10px] bg-white/[0.06] hover:bg-white/[0.1] text-white/70 border-white/[0.08] gap-1"
                      variant="outline"
                    >
                      <ArrowUpRight size={10} />
                      Send
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setReceiveModal(holding)}
                      className="h-7 text-[10px] bg-[#4F46E5]/15 hover:bg-[#4F46E5]/25 text-[#818CF8] border-[#4F46E5]/25 gap-1"
                      variant="outline"
                    >
                      <ArrowDownLeft size={10} />
                      Receive
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security panel */}
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-white/60">Security</h3>

          {[
            {
              icon: ShieldCheck, label: "2FA Authentication", value: "Enabled",
              color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20"
            },
            {
              icon: Fingerprint, label: "Biometric Auth", value: "Enabled",
              color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20"
            },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="glass rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon size={14} className={color} />
                <span className="text-xs text-white/60">{label}</span>
              </div>
              <Badge className={`text-[10px] ${bg} ${color}`}>{value}</Badge>
            </div>
          ))}

          {/* Hardware key */}
          <div className="glass rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cpu size={14} className="text-[#06B6D4]" />
                <span className="text-xs text-white/60">Hardware Key</span>
              </div>
            </div>
            <Button
              onClick={() => toast({ title: "Hardware wallet detected", description: "Ledger Nano X connected via USB." })}
              className="w-full h-7 text-[10px] bg-[#06B6D4]/10 hover:bg-[#06B6D4]/20 text-[#06B6D4] border-[#06B6D4]/25 gap-1"
              variant="outline"
            >
              <Zap size={10} />
              Connect Ledger / Trezor
            </Button>
          </div>

          {/* Backup */}
          <div className="glass rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2">
              <RefreshCw size={13} className="text-[#4F46E5]" />
              <span className="text-xs text-white/60">Backup</span>
            </div>
            <p className="text-[10px] text-white/35">Encrypted backup created · Shamir Secret Sharing ready</p>
          </div>

          {/* Anti-phishing code */}
          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={13} className="text-[#F59E0B]" />
              <span className="text-xs text-white/60">Anti-Phishing Code</span>
            </div>
            <p className="font-mono text-sm font-bold text-[#F59E0B] tracking-widest">SAPPHIRE-7734</p>
            <p className="text-[9px] text-white/25 mt-0.5">This code appears on every login</p>
          </div>

          {/* Emergency freeze */}
          {frozen ? (
            <div className="glass rounded-xl p-3 border border-red-500/30">
              <p className="text-xs text-red-400 font-semibold flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Wallet Frozen
              </p>
              <p className="text-[10px] text-white/30 mt-1">All transactions blocked. Contact support to unfreeze.</p>
              <Button onClick={() => setFrozen(false)} variant="outline" className="w-full h-7 text-[10px] mt-2 border-white/[0.1] text-white/40">
                Unfreeze Wallet
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowFreezeDialog(true)}
              variant="destructive"
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25"
            >
              <AlertTriangle size={12} className="mr-1.5" />
              Emergency Freeze
            </Button>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center px-5 py-4 border-b border-white/[0.05]">
          <h3 className="font-display font-semibold text-sm text-white/70">Transaction History</h3>
          <span className="ml-auto text-[10px] text-white/30">{TRANSACTIONS.length} transactions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Type", "Asset", "Amount", "CAD Value", "Address", "Time", "Confirms"].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-semibold text-white/30 text-[10px] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {TRANSACTIONS.map(tx => (
                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <Badge className={`text-[9px] gap-1 ${
                      tx.type === "received"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {tx.type === "received" ? <ArrowDownLeft size={8} /> : <ArrowUpRight size={8} />}
                      {tx.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-white/80">{tx.symbol}</td>
                  <td className="px-4 py-3 font-mono text-white/70">{tx.amount}</td>
                  <td className="px-4 py-3 font-mono text-[#F59E0B]">${tx.amountCAD.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-white/35 text-[10px]">
                    {tx.type === "received" ? tx.from : tx.to}
                  </td>
                  <td className="px-4 py-3 text-white/30 text-[10px] whitespace-nowrap">{tx.time}</td>
                  <td className="px-4 py-3">
                    <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      ✓ {tx.confirmations}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <SendModal open={!!sendModal} onClose={() => setSendModal(null)} holding={sendModal} />
      <ReceiveModal open={!!receiveModal} onClose={() => setReceiveModal(null)} holding={receiveModal} />

      {/* Freeze dialog */}
      <AlertDialog open={showFreezeDialog} onOpenChange={setShowFreezeDialog}>
        <AlertDialogContent className="bg-[#050508] border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 font-display flex items-center gap-2">
              <AlertTriangle size={16} />
              Emergency Freeze
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This will immediately block all outgoing transactions from your wallet. This action is reversible only through our support team. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.1] text-white/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setFrozen(true); setShowFreezeDialog(false); toast({ title: "Wallet frozen", description: "All transactions have been blocked.", variant: "destructive" }); }}
              className="bg-red-600 hover:bg-red-700"
            >
              Freeze Wallet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
