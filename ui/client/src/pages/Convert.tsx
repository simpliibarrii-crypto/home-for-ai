import { useState, useCallback, useRef } from "react";
import { ArrowLeftRight, ArrowRight, ChevronDown, RefreshCw, CheckCircle, XCircle, Clock, TrendingUp, Zap, Globe } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useConversionRates } from "@/hooks/useConversionRates";
import { useToast } from "@/hooks/use-toast";

// ─── Asset Catalogue ─────────────────────────────────────────────────────────

type AssetCategory = "Crypto" | "Stocks" | "Bonds" | "Commodities" | "Fiat";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  emoji: string;
  balance: number;
  decimals: number;
}

const ASSETS: Asset[] = [
  // Crypto
  { id: "BTC",   symbol: "BTC",   name: "Bitcoin",        category: "Crypto",      emoji: "₿",  balance: 0.42,   decimals: 8 },
  { id: "ETH",   symbol: "ETH",   name: "Ethereum",       category: "Crypto",      emoji: "Ξ",  balance: 4.8,    decimals: 6 },
  { id: "SOL",   symbol: "SOL",   name: "Solana",         category: "Crypto",      emoji: "◎",  balance: 38.5,   decimals: 4 },
  { id: "USDC",  symbol: "USDC",  name: "USD Coin",       category: "Crypto",      emoji: "$",  balance: 1250,   decimals: 2 },
  { id: "BNB",   symbol: "BNB",   name: "BNB",            category: "Crypto",      emoji: "🔶", balance: 3.2,    decimals: 4 },
  { id: "MATIC", symbol: "MATIC", name: "Polygon",        category: "Crypto",      emoji: "⬡",  balance: 800,    decimals: 2 },
  { id: "ARB",   symbol: "ARB",   name: "Arbitrum",       category: "Crypto",      emoji: "🔵", balance: 450,    decimals: 2 },
  // Stocks
  { id: "AAPL",  symbol: "AAPL",  name: "Apple Inc.",     category: "Stocks",      emoji: "🍎", balance: 2.5,    decimals: 4 },
  { id: "MSFT",  symbol: "MSFT",  name: "Microsoft",      category: "Stocks",      emoji: "🪟", balance: 1.8,    decimals: 4 },
  { id: "TSLA",  symbol: "TSLA",  name: "Tesla",          category: "Stocks",      emoji: "⚡", balance: 4.0,    decimals: 4 },
  { id: "NVDA",  symbol: "NVDA",  name: "NVIDIA",         category: "Stocks",      emoji: "🟢", balance: 1.2,    decimals: 4 },
  { id: "GOOGL", symbol: "GOOGL", name: "Alphabet",       category: "Stocks",      emoji: "G",  balance: 3.0,    decimals: 4 },
  // Bonds
  { id: "XBB",   symbol: "XBB",   name: "Canada Agg Bond ETF", category: "Bonds",  emoji: "🇨🇦", balance: 50,   decimals: 2 },
  { id: "AGG",   symbol: "AGG",   name: "US Aggregate ETF",    category: "Bonds",  emoji: "🇺🇸", balance: 30,   decimals: 2 },
  { id: "TLT",   symbol: "TLT",   name: "Long Treasury ETF",   category: "Bonds",  emoji: "📜", balance: 20,    decimals: 2 },
  // Commodities
  { id: "XAU",   symbol: "XAU",   name: "Gold (oz)",      category: "Commodities", emoji: "🥇", balance: 0.8,    decimals: 4 },
  { id: "XAG",   symbol: "XAG",   name: "Silver (oz)",    category: "Commodities", emoji: "🥈", balance: 12,     decimals: 2 },
  { id: "WTI",   symbol: "WTI",   name: "Oil (barrel)",   category: "Commodities", emoji: "🛢️", balance: 5,     decimals: 2 },
  { id: "XPT",   symbol: "XPT",   name: "Platinum (oz)",  category: "Commodities", emoji: "💠", balance: 1.5,    decimals: 4 },
  // Fiat
  { id: "CAD",   symbol: "CAD",   name: "Canadian Dollar", category: "Fiat",       emoji: "🍁", balance: 5000,   decimals: 2 },
  { id: "USD",   symbol: "USD",   name: "US Dollar",       category: "Fiat",       emoji: "💵", balance: 3500,   decimals: 2 },
  { id: "EUR",   symbol: "EUR",   name: "Euro",            category: "Fiat",       emoji: "€",  balance: 2000,   decimals: 2 },
  { id: "GBP",   symbol: "GBP",   name: "British Pound",   category: "Fiat",       emoji: "£",  balance: 800,    decimals: 2 },
  { id: "JPY",   symbol: "JPY",   name: "Japanese Yen",    category: "Fiat",       emoji: "¥",  balance: 250000, decimals: 0 },
];

const CATEGORIES: AssetCategory[] = ["Crypto", "Stocks", "Bonds", "Commodities", "Fiat"];

// ─── Route Logic ─────────────────────────────────────────────────────────────

interface RouteHop {
  from: string;
  to: string;
  venue: string;
  time: string;
  fee: number;
}

function buildRoute(fromAsset: Asset, toAsset: Asset): RouteHop[] {
  const fc = fromAsset.category;
  const tc = toAsset.category;
  if (fc === "Crypto" && tc === "Fiat") {
    return [
      { from: fromAsset.symbol, to: "USDC",          venue: "Uniswap v4",   time: "~15s",  fee: 0.05 },
      { from: "USDC",           to: toAsset.symbol,  venue: "Kraken OTC",   time: "~2 min", fee: 0.10 },
    ];
  }
  if (fc === "Fiat" && tc === "Bonds") {
    return [
      { from: fromAsset.symbol, to: toAsset.symbol,  venue: "Bond Market",  time: "~T+2",  fee: 0.15 },
    ];
  }
  if (fc === "Crypto" && tc === "Commodities") {
    return [
      { from: fromAsset.symbol, to: "USD",            venue: "Coinbase Pro", time: "~30s",  fee: 0.10 },
      { from: "USD",            to: toAsset.symbol,   venue: "COMEX Stub",   time: "~5 min", fee: 0.20 },
    ];
  }
  if (fc === "Stocks" && tc === "Crypto") {
    return [
      { from: fromAsset.symbol, to: "USD",            venue: "Alpaca Broker",time: "~1 min", fee: 0.05 },
      { from: "USD",            to: toAsset.symbol,   venue: "Binance",      time: "~30s",  fee: 0.10 },
    ];
  }
  if (fc === "Fiat" && tc === "Crypto") {
    return [
      { from: fromAsset.symbol, to: "USDC",           venue: "Stripe On-ramp",time: "~2 min", fee: 0.20 },
      { from: "USDC",           to: toAsset.symbol,   venue: "Uniswap v4",   time: "~15s",  fee: 0.05 },
    ];
  }
  // Default: direct
  return [
    { from: fromAsset.symbol, to: toAsset.symbol, venue: "Internal Bridge", time: "~1 min", fee: 0.15 },
  ];
}

// ─── Mock history ──────────────────────────────────────────────────────────

type TxStatus = "Completed" | "Pending" | "Failed";

interface Transfer {
  id: string;
  from: string;
  to: string;
  fromAmount: number;
  toAmount: number;
  status: TxStatus;
  timestamp: Date;
  txHash: string;
  feeCAD: number;
}

const MOCK_HISTORY: Transfer[] = [
  { id: "1", from: "BTC",  to: "CAD",  fromAmount: 0.05,  toAmount: 6476.50, status: "Completed", timestamp: new Date(Date.now() - 3600000),    txHash: "0xab12cd34ef56gh78ij90kl12mn34op56qr78st90uv12wx34yz56ab78cd90ef12", feeCAD: 22.67 },
  { id: "2", from: "ETH",  to: "USDC", fromAmount: 1.2,   toAmount: 4560,    status: "Completed", timestamp: new Date(Date.now() - 7200000),    txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", feeCAD: 15.96 },
  { id: "3", from: "CAD",  to: "XAU",  fromAmount: 5000,  toAmount: 1.232,   status: "Pending",   timestamp: new Date(Date.now() - 1800000),    txHash: "0xdeadbeefcafebabe1234567890abcdef1234567890abcdef1234567890abcdef", feeCAD: 12.38 },
  { id: "4", from: "SOL",  to: "ETH",  fromAmount: 10,    toAmount: 0.487,   status: "Completed", timestamp: new Date(Date.now() - 86400000),   txHash: "0xfeedf00d1234567890abcdef1234567890abcdef1234567890abcdef12345678", feeCAD: 9.24  },
  { id: "5", from: "AAPL", to: "BTC",  fromAmount: 0.5,   toAmount: 0.0012,  status: "Failed",    timestamp: new Date(Date.now() - 172800000),  txHash: "0x0000000000000000000000000000000000000000000000000000000000000000", feeCAD: 0     },
  { id: "6", from: "USD",  to: "CAD",  fromAmount: 2000,  toAmount: 2720,    status: "Completed", timestamp: new Date(Date.now() - 259200000),  txHash: "0xaaaa1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab", feeCAD: 6.76  },
  { id: "7", from: "XAU",  to: "BTC",  fromAmount: 0.5,   toAmount: 0.0163,  status: "Completed", timestamp: new Date(Date.now() - 345600000),  txHash: "0xbbbb1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab", feeCAD: 7.50  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtAmount(n: number, decimals: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
  if (n >= 1000)    return n.toLocaleString("en-CA", { maximumFractionDigits: decimals > 2 ? 2 : decimals });
  return n.toFixed(Math.min(decimals, 6));
}

function fmtUSD(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function shortHash(hash: string): string {
  return hash.slice(0, 8) + "..." + hash.slice(-6);
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function randomTxHash(): string {
  const chars = "0123456789abcdef";
  return "0x" + Array.from({ length: 64 }, () => chars[Math.floor(Math.random() * 16)]).join("");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AssetSelector({
  label,
  selected,
  excluded,
  onSelect,
}: {
  label: string;
  selected: Asset | null;
  excluded: string | null;
  onSelect: (a: Asset) => void;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<AssetCategory>("Crypto");
  const filtered = ASSETS.filter(a => a.category === category && a.id !== excluded);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
      >
        {selected ? (
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{selected.emoji}</span>
            <div className="text-left">
              <div className="text-sm font-semibold text-white">{selected.symbol}</div>
              <div className="text-[10px] text-white/40">{selected.name}</div>
            </div>
          </div>
        ) : (
          <span className="text-sm text-white/30">{label}</span>
        )}
        <ChevronDown size={14} className={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-[#0d0d1a] shadow-2xl overflow-hidden">
          {/* Category tabs */}
          <div className="flex gap-0.5 p-1.5 bg-white/[0.02] border-b border-white/[0.05]">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-1 text-[9px] font-semibold py-1 rounded-lg transition-colors ${
                  category === cat
                    ? "bg-[#4F46E5] text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* Asset list */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.map(asset => (
              <button
                key={asset.id}
                onClick={() => { onSelect(asset); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{asset.emoji}</span>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white">{asset.symbol}</div>
                    <div className="text-[10px] text-white/35">{asset.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-white/50 font-mono">{fmtAmount(asset.balance, asset.decimals)}</div>
                  <div className="text-[9px] text-white/25">Balance</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TxStatus }) {
  const cfg = {
    Completed: { color: "text-[#06B6D4] border-[#06B6D4]/30 bg-[#06B6D4]/10", icon: CheckCircle },
    Pending:   { color: "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10", icon: Clock },
    Failed:    { color: "text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10", icon: XCircle },
  }[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.color}`}>
      <Icon size={9} />
      {status}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConvertPage() {
  const { rates, lastUpdated, convert } = useConversionRates();
  const { toast } = useToast();

  const [fromAsset, setFromAsset] = useState<Asset | null>(ASSETS[0]);
  const [toAsset, setToAsset]     = useState<Asset | null>(ASSETS[20]); // CAD
  const [amount, setAmount]       = useState<string>("0.05");
  const [slippage, setSlippage]   = useState<number>(0.5);
  const [customSlippage, setCustomSlippage] = useState<string>("");
  const [showCustom, setShowCustom] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [history, setHistory] = useState<Transfer[]>(MOCK_HISTORY);

  // Swap from/to
  const swapAssets = useCallback(() => {
    setFromAsset(toAsset);
    setToAsset(fromAsset);
  }, [fromAsset, toAsset]);

  // Calculated values
  const numAmount = parseFloat(amount) || 0;
  const convertedAmount = fromAsset && toAsset ? convert(numAmount, fromAsset.id, toAsset.id) : 0;
  const feeAmt = numAmount * 0.0035;
  const feeValue = fromAsset ? feeAmt * (rates[fromAsset.id as keyof typeof rates] ?? 1) : 0;
  const route = fromAsset && toAsset ? buildRoute(fromAsset, toAsset) : [];
  const totalRouteFee = route.reduce((s, h) => s + h.fee, 0);
  const settlementTime = route[route.length - 1]?.time ?? "~1 min";

  // Gas estimate (crypto-to-something has gas, otherwise 0)
  const gasUSD = fromAsset?.category === "Crypto" ? (Math.random() * 2 + 0.5).toFixed(2) : "0.00";

  // Execute transfer
  const executeTransfer = useCallback(() => {
    if (!fromAsset || !toAsset || numAmount <= 0) return;
    setConfirming(false);

    const hash = randomTxHash();
    const newTx: Transfer = {
      id:         Date.now().toString(),
      from:       fromAsset.symbol,
      to:         toAsset.symbol,
      fromAmount: numAmount,
      toAmount:   convertedAmount,
      status:     "Pending",
      timestamp:  new Date(),
      txHash:     hash,
      feeCAD:     feeValue * (rates["CAD" as keyof typeof rates] ? 1 / rates.CAD : 1.36),
    };

    setHistory(prev => [newTx, ...prev].slice(0, 20));
    toast({
      title: "Transfer Initiated",
      description: `${fmtAmount(numAmount, fromAsset.decimals)} ${fromAsset.symbol} → ${fmtAmount(convertedAmount, toAsset.decimals)} ${toAsset.symbol} · ${shortHash(hash)}`,
    });

    // Simulate completion
    setTimeout(() => {
      setHistory(prev =>
        prev.map(tx => tx.id === newTx.id ? { ...tx, status: "Completed" } : tx)
      );
    }, 8000);
  }, [fromAsset, toAsset, numAmount, convertedAmount, feeValue, rates, toast]);

  // Analytics data
  const routeCounts = history.reduce<Record<string, number>>((acc, tx) => {
    const key = `${tx.from}→${tx.to}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(routeCounts).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ["#4F46E5", "#06B6D4", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6", "#F97316"];

  const monthlyTotal = history
    .filter(tx => tx.status === "Completed" && Date.now() - tx.timestamp.getTime() < 30 * 86400000)
    .reduce((sum, tx) => sum + (tx.toAmount * (rates[tx.to as keyof typeof rates] ?? 1) / (rates.CAD ?? 0.735)), 0);

  const avgFee = history
    .filter(tx => tx.status === "Completed" && tx.feeCAD > 0)
    .reduce((sum, tx, _, arr) => sum + tx.feeCAD / arr.length, 0);

  return (
    <div className="p-4 lg:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/20 flex items-center justify-center">
            <ArrowLeftRight size={16} className="text-[#4F46E5]" />
          </div>
          <h1 className="text-xl font-display font-bold text-white">Convert &amp; Transfer</h1>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-white/30">
            <RefreshCw size={9} />
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        <p className="text-sm text-white/40 ml-11">Universal swap across crypto, stocks, bonds, commodities &amp; fiat</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* ── LEFT: Transfer Builder ── */}
        <div className="space-y-3">

          {/* Step 1 + 2: FROM / TO */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Step 1–2 · Select Assets</div>

            <div className="space-y-2">
              {/* FROM */}
              <div>
                <label className="text-[10px] font-medium text-white/40 mb-1 block">From</label>
                <AssetSelector
                  label="Select source asset"
                  selected={fromAsset}
                  excluded={toAsset?.id ?? null}
                  onSelect={setFromAsset}
                />
                {fromAsset && (
                  <div className="flex items-center justify-between mt-1 px-1">
                    <span className="text-[10px] text-white/30">Available</span>
                    <span className="text-[10px] font-mono text-white/50">
                      {fmtAmount(fromAsset.balance, fromAsset.decimals)} {fromAsset.symbol}
                    </span>
                  </div>
                )}
              </div>

              {/* Swap button */}
              <div className="flex justify-center">
                <button
                  onClick={swapAssets}
                  className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.04] hover:bg-[#4F46E5]/20 hover:border-[#4F46E5]/40 flex items-center justify-center transition-all"
                >
                  <ArrowLeftRight size={13} className="text-white/50" />
                </button>
              </div>

              {/* TO */}
              <div>
                <label className="text-[10px] font-medium text-white/40 mb-1 block">To</label>
                <AssetSelector
                  label="Select destination asset"
                  selected={toAsset}
                  excluded={fromAsset?.id ?? null}
                  onSelect={setToAsset}
                />
              </div>
            </div>
          </div>

          {/* Step 3: Amount */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Step 3 · Amount</div>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-[#4F46E5]/50 pr-20"
                placeholder="0.00"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/40">
                {fromAsset?.symbol ?? "—"}
              </div>
            </div>

            {/* Conversion preview */}
            {fromAsset && toAsset && numAmount > 0 && (
              <div className="mt-2 px-1">
                <div className="text-base font-mono font-semibold text-[#06B6D4]">
                  ≈ {fmtAmount(convertedAmount, toAsset.decimals)} {toAsset.symbol}
                </div>
                <div className="text-[10px] text-white/30 mt-0.5">
                  1 {fromAsset.symbol} = {fmtAmount(convert(1, fromAsset.id, toAsset.id), toAsset.decimals)} {toAsset.symbol}
                </div>
              </div>
            )}

            {/* Fee breakdown */}
            <div className="mt-3 space-y-1.5 border-t border-white/[0.05] pt-3">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/40">Platform fee (0.35%)</span>
                <span className="text-white/60 font-mono">{fmtAmount(feeAmt, 8)} {fromAsset?.symbol} ≈ {fmtUSD(feeValue)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-white/40">Network gas estimate</span>
                <span className="text-white/60 font-mono">{fmtUSD(parseFloat(gasUSD))}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-white/40">Settlement time</span>
                <span className="text-[#F59E0B] font-mono">{settlementTime}</span>
              </div>
            </div>

            {/* Slippage */}
            <div className="mt-3">
              <div className="text-[10px] text-white/40 mb-2">Slippage Tolerance</div>
              <div className="flex gap-1.5">
                {[0.1, 0.5, 1.0].map(s => (
                  <button
                    key={s}
                    onClick={() => { setSlippage(s); setShowCustom(false); }}
                    className={`flex-1 text-[11px] py-1.5 rounded-lg border transition-colors ${
                      slippage === s && !showCustom
                        ? "bg-[#4F46E5]/20 border-[#4F46E5]/50 text-[#4F46E5]"
                        : "border-white/10 text-white/40 hover:border-white/20"
                    }`}
                  >
                    {s}%
                  </button>
                ))}
                <button
                  onClick={() => setShowCustom(true)}
                  className={`flex-1 text-[11px] py-1.5 rounded-lg border transition-colors ${
                    showCustom
                      ? "bg-[#4F46E5]/20 border-[#4F46E5]/50 text-[#4F46E5]"
                      : "border-white/10 text-white/40 hover:border-white/20"
                  }`}
                >
                  Custom
                </button>
              </div>
              {showCustom && (
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    min="0.01"
                    max="50"
                    step="0.01"
                    value={customSlippage}
                    onChange={e => { setCustomSlippage(e.target.value); setSlippage(parseFloat(e.target.value) || 0.5); }}
                    className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#4F46E5]/50"
                    placeholder="e.g. 2.5"
                  />
                  <span className="text-xs text-white/30">%</span>
                </div>
              )}
            </div>
          </div>

          {/* Step 4: Route */}
          {route.length > 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Step 4 · Route</div>
              <div className="space-y-2">
                {route.map((hop, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#4F46E5]/20 flex items-center justify-center text-[10px] font-bold text-[#4F46E5]">
                        {hop.from.slice(0, 1)}
                      </div>
                      <span className="text-xs font-semibold text-white">{hop.from}</span>
                      <ArrowRight size={11} className="text-white/30" />
                      <div className="w-6 h-6 rounded-full bg-[#06B6D4]/20 flex items-center justify-center text-[10px] font-bold text-[#06B6D4]">
                        {hop.to.slice(0, 1)}
                      </div>
                      <span className="text-xs font-semibold text-white">{hop.to}</span>
                      <div className="ml-auto flex items-center gap-2 text-[10px] text-white/30">
                        <span className="flex items-center gap-1"><Zap size={9} className="text-[#F59E0B]" />{hop.venue}</span>
                        <span className="flex items-center gap-1"><Clock size={9} />{hop.time}</span>
                        <span className="text-[#EF4444]">{hop.fee}%</span>
                      </div>
                    </div>
                    {i < route.length - 1 && (
                      <div className="ml-3 w-px h-3 bg-white/10 mt-1 ml-[11px]" />
                    )}
                  </div>
                ))}
                <div className="flex justify-between text-[10px] text-white/30 border-t border-white/[0.05] pt-2 mt-1">
                  <span>Total route fee</span>
                  <span className="text-[#F59E0B] font-mono">{totalRouteFee.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Confirm */}
          <button
            onClick={() => setConfirming(true)}
            disabled={!fromAsset || !toAsset || numAmount <= 0}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#4F46E5]/20"
          >
            {fromAsset && toAsset && numAmount > 0
              ? `Convert ${fmtAmount(numAmount, fromAsset.decimals)} ${fromAsset.symbol} → ${toAsset.symbol}`
              : "Select assets & amount"
            }
          </button>
        </div>

        {/* ── RIGHT: History + Analytics ── */}
        <div className="space-y-4">

          {/* Analytics Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold text-white/30 uppercase tracking-widest mb-1">Monthly Volume</div>
              <div className="text-sm font-mono font-bold text-white">${(monthlyTotal).toLocaleString("en-CA", { maximumFractionDigits: 0 })}</div>
              <div className="text-[9px] text-white/25">CAD equiv.</div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold text-white/30 uppercase tracking-widest mb-1">Avg Fee</div>
              <div className="text-sm font-mono font-bold text-[#F59E0B]">${avgFee.toFixed(2)}</div>
              <div className="text-[9px] text-white/25">Per transfer</div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold text-white/30 uppercase tracking-widest mb-1">Transfers</div>
              <div className="text-sm font-mono font-bold text-[#06B6D4]">{history.filter(t => t.status === "Completed").length}</div>
              <div className="text-[9px] text-white/25">Completed</div>
            </div>
          </div>

          {/* Pie: Most used routes */}
          {pieData.length > 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <TrendingUp size={10} /> Most Used Routes
              </div>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={45} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  {pieData.slice(0, 5).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-[10px]">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-white/50 truncate flex-1">{d.name}</span>
                      <span className="font-mono text-white/30">{d.value}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Transfer History */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Globe size={10} /> Transfer History
            </div>
            <div className="space-y-2">
              {history.slice(0, 10).map(tx => (
                <div key={tx.id} className="flex items-center gap-2 py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <span>{tx.from}</span>
                      <ArrowRight size={9} className="text-white/30" />
                      <span>{tx.to}</span>
                    </div>
                    <div className="text-[9px] text-white/30 font-mono mt-0.5">{shortHash(tx.txHash)}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[11px] font-mono text-white/70">
                      {fmtAmount(tx.fromAmount, 4)} → {fmtAmount(tx.toAmount, 4)}
                    </div>
                    <div className="text-[9px] text-white/30">{timeAgo(tx.timestamp)}</div>
                  </div>
                  <StatusBadge status={tx.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {confirming && fromAsset && toAsset && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0a12] shadow-2xl p-6">
            <h2 className="text-base font-display font-bold text-white mb-4">Confirm Transfer</h2>

            <div className="space-y-3 text-sm mb-5">
              <div className="flex justify-between">
                <span className="text-white/40">You send</span>
                <span className="font-mono font-semibold text-white">
                  {fmtAmount(numAmount, fromAsset.decimals)} {fromAsset.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">You receive</span>
                <span className="font-mono font-semibold text-[#06B6D4]">
                  ≈ {fmtAmount(convertedAmount, toAsset.decimals)} {toAsset.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Platform fee</span>
                <span className="font-mono text-white/60">{fmtUSD(feeValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Slippage tolerance</span>
                <span className="font-mono text-white/60">{slippage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Settlement</span>
                <span className="font-mono text-[#F59E0B]">{settlementTime}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:bg-white/[0.05] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeTransfer}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] text-white text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
