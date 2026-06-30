import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, Star, StarOff, TrendingUp, TrendingDown, ChevronDown,
  Clock, X, BarChart2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Asset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: string;
  category: "stock" | "crypto" | "forex" | "etf" | "bond";
  volatility: number; // relative volatility multiplier
}

const ASSETS: Asset[] = [
  // Stocks
  { symbol: "AAPL", name: "Apple Inc.", price: 213.55, change: 1.24, volume: "58.2M", category: "stock", volatility: 1 },
  { symbol: "MSFT", name: "Microsoft Corp.", price: 422.80, change: 0.87, volume: "22.1M", category: "stock", volatility: 1 },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 178.92, change: -0.43, volume: "25.4M", category: "stock", volatility: 1.1 },
  { symbol: "AMZN", name: "Amazon.com Inc.", price: 194.31, change: 1.78, volume: "43.8M", category: "stock", volatility: 1.2 },
  { symbol: "TSLA", name: "Tesla Inc.", price: 248.42, change: -2.14, volume: "118.3M", category: "stock", volatility: 2.5 },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 1208.88, change: 3.42, volume: "41.2M", category: "stock", volatility: 2.2 },
  { symbol: "META", name: "Meta Platforms", price: 512.14, change: 0.94, volume: "18.7M", category: "stock", volatility: 1.3 },
  { symbol: "NFLX", name: "Netflix Inc.", price: 712.50, change: -1.08, volume: "4.2M", category: "stock", volatility: 1.8 },
  // Crypto
  { symbol: "BTC", name: "Bitcoin", price: 98420.00, change: 2.14, volume: "$42.8B", category: "crypto", volatility: 4 },
  { symbol: "ETH", name: "Ethereum", price: 3412.50, change: 1.87, volume: "$18.4B", category: "crypto", volatility: 4.5 },
  { symbol: "SOL", name: "Solana", price: 187.42, change: 4.21, volume: "$4.1B", category: "crypto", volatility: 6 },
  { symbol: "BNB", name: "BNB", price: 612.30, change: 0.88, volume: "$1.8B", category: "crypto", volatility: 3.5 },
  { symbol: "XRP", name: "XRP", price: 0.6241, change: -1.24, volume: "$2.9B", category: "crypto", volatility: 5 },
  { symbol: "ADA", name: "Cardano", price: 0.4812, change: 2.41, volume: "$0.9B", category: "crypto", volatility: 5.5 },
  { symbol: "DOGE", name: "Dogecoin", price: 0.1842, change: -3.12, volume: "$1.4B", category: "crypto", volatility: 7 },
  // Forex
  { symbol: "EUR/USD", name: "Euro / US Dollar", price: 1.0842, change: 0.12, volume: "$2.1T", category: "forex", volatility: 0.3 },
  { symbol: "GBP/USD", name: "British Pound / USD", price: 1.2712, change: -0.08, volume: "$0.8T", category: "forex", volatility: 0.4 },
  { symbol: "USD/JPY", name: "US Dollar / Yen", price: 154.82, change: 0.24, volume: "$1.2T", category: "forex", volatility: 0.35 },
  // ETFs
  { symbol: "SPY", name: "SPDR S&P 500 ETF", price: 542.18, change: 0.87, volume: "85.4M", category: "etf", volatility: 0.8 },
  { symbol: "QQQ", name: "Invesco QQQ Trust", price: 468.92, change: 1.12, volume: "45.2M", category: "etf", volatility: 1 },
  // Bonds
  { symbol: "TLT", name: "iShares 20+ Yr Treasury", price: 88.42, change: -0.34, volume: "22.1M", category: "bond", volatility: 0.2 },
];

const DEFAULT_WATCHLIST = ["AAPL", "BTC", "ETH", "TSLA", "NVDA", "SPY"];

// ─── Price data generator ─────────────────────────────────────────────────────

function generatePriceData(asset: Asset, range: string): { time: string; price: number }[] {
  const points = range === "1H" ? 60 : range === "1D" ? 96 : range === "1W" ? 168 : range === "1M" ? 120 : 252;
  const volatility = asset.volatility * 0.002;
  const data: { time: string; price: number }[] = [];
  let price = asset.price * (1 - Math.abs(asset.change) / 100 * (range === "1D" ? 1 : range === "1W" ? 5 : range === "1M" ? 20 : 60));
  
  for (let i = 0; i < points; i++) {
    price = Math.max(price * (1 + (Math.random() - 0.495) * volatility), 0.001);
    const label =
      range === "1H" ? `${i}m` :
      range === "1D" ? `${Math.floor(i / 4)}:${(i % 4) * 15 === 0 ? "00" : (i % 4) * 15}` :
      range === "1W" ? `${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][Math.floor(i / 24) % 7]}` :
      range === "1M" ? `${Math.floor(i / 4)}d` :
      `${Math.floor(i / 21)}m`;
    data.push({ time: label, price: parseFloat(price.toFixed(asset.price < 10 ? 4 : 2)) });
  }
  return data;
}

// ─── Order book ───────────────────────────────────────────────────────────────

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
  side: "bid" | "ask";
}

function generateOrderBook(basePrice: number): { bids: OrderBookEntry[]; asks: OrderBookEntry[] } {
  const spread = basePrice * 0.0002;
  const bids: OrderBookEntry[] = [];
  const asks: OrderBookEntry[] = [];

  for (let i = 0; i < 8; i++) {
    const bidPrice = basePrice - spread - i * spread * 2;
    const askPrice = basePrice + spread + i * spread * 2;
    const bidSize = Math.round((Math.random() * 50 + 5) * 100) / 100;
    const askSize = Math.round((Math.random() * 50 + 5) * 100) / 100;
    bids.push({ price: bidPrice, size: bidSize, total: bidSize * (i + 1), side: "bid" });
    asks.push({ price: askPrice, size: askSize, total: askSize * (i + 1), side: "ask" });
  }
  return { bids, asks };
}

function formatPrice(price: number, symbol: string): string {
  if (symbol.includes("/") && price < 10) return price.toFixed(4);
  if (symbol === "XRP" || symbol === "ADA" || symbol === "DOGE") return price.toFixed(4);
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toFixed(2);
}

// ─── Mock positions ───────────────────────────────────────────────────────────

const INITIAL_POSITIONS = [
  { symbol: "AAPL", name: "Apple Inc.", qty: 10, entryPrice: 195.42, currentPrice: 213.55, category: "stock" as const },
  { symbol: "BTC", name: "Bitcoin", qty: 0.5, entryPrice: 88200.00, currentPrice: 98420.00, category: "crypto" as const },
  { symbol: "ETH", name: "Ethereum", qty: 2, entryPrice: 2980.00, currentPrice: 3412.50, category: "crypto" as const },
  { symbol: "TSLA", name: "Tesla Inc.", qty: 5, entryPrice: 268.40, currentPrice: 248.42, category: "stock" as const },
];

// ─── Recent trades ────────────────────────────────────────────────────────────

const RECENT_TRADES = [
  { time: "14:32:01", side: "B", qty: 0.1, symbol: "BTC", price: 98205.00 },
  { time: "14:28:44", side: "S", qty: 3, symbol: "TSLA", price: 251.20 },
  { time: "14:15:12", side: "B", qty: 5, symbol: "AAPL", price: 212.80 },
  { time: "13:54:08", side: "B", qty: 1, symbol: "ETH", price: 3388.50 },
  { time: "13:41:33", side: "S", qty: 100, symbol: "SPY", price: 541.40 },
  { time: "13:22:17", side: "B", qty: 0.5, symbol: "SOL", price: 182.30 },
  { time: "12:58:44", side: "S", qty: 2, symbol: "NVDA", price: 1198.50 },
  { time: "12:41:09", side: "B", qty: 10, symbol: "MSFT", price: 420.10 },
];

// ─── Components ───────────────────────────────────────────────────────────────

function SparklineMini({ asset }: { asset: Asset }) {
  const data = useMemo(() => {
    const pts = [];
    let p = asset.price * 0.97;
    for (let i = 0; i < 20; i++) {
      p = p * (1 + (Math.random() - 0.49) * 0.005 * asset.volatility);
      pts.push({ v: p });
    }
    return pts;
  }, [asset.symbol]);

  const isUp = asset.change >= 0;
  return (
    <ResponsiveContainer width={60} height={24}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`sg-${asset.symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={isUp ? "#10B981" : "#EF4444"} stopOpacity={0.4} />
            <stop offset="95%" stopColor={isUp ? "#10B981" : "#EF4444"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={isUp ? "#10B981" : "#EF4444"} strokeWidth={1} fill={`url(#sg-${asset.symbol})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function OrderBook({ asset, orderBook }: { asset: Asset; orderBook: { bids: OrderBookEntry[]; asks: OrderBookEntry[] } }) {
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    const timer = setInterval(() => {
      const newFlash: Record<string, "up" | "down"> = {};
      orderBook.bids.slice(0, 3).forEach((b, i) => {
        if (Math.random() > 0.5) newFlash[`bid-${i}`] = "up";
      });
      orderBook.asks.slice(0, 3).forEach((a, i) => {
        if (Math.random() > 0.5) newFlash[`ask-${i}`] = "down";
      });
      setFlash(newFlash);
      setTimeout(() => setFlash({}), 300);
    }, 2000);
    return () => clearInterval(timer);
  }, [orderBook]);

  const priceDecimals = asset.price < 10 ? 4 : asset.price < 100 ? 2 : 2;

  return (
    <div className="glass rounded-xl p-3">
      <p className="text-[10px] text-white/40 font-semibold mb-2 uppercase tracking-wider">Order Book</p>
      {/* Asks */}
      <div className="space-y-0.5 mb-1">
        {orderBook.asks.slice(0, 5).reverse().map((ask, i) => (
          <div
            key={`ask-${i}`}
            className={`flex items-center justify-between text-[10px] py-0.5 px-1 rounded transition-all ${
              flash[`ask-${i}`] ? "bg-red-500/10" : ""
            }`}
          >
            <span className="font-mono text-red-400">{ask.price.toFixed(priceDecimals)}</span>
            <span className="font-mono text-white/40">{ask.size.toFixed(2)}</span>
            <div
              className="h-1 rounded-full bg-red-500/20 absolute right-3"
              style={{ width: `${Math.min(ask.total * 2, 60)}px` }}
            />
          </div>
        ))}
      </div>
      {/* Spread */}
      <div className="text-center text-[10px] font-mono text-[#06B6D4] py-1 border-y border-white/[0.05] my-1">
        {formatPrice(asset.price, asset.symbol)}
        <span className="text-white/30 ml-2 text-[9px]">SPREAD</span>
      </div>
      {/* Bids */}
      <div className="space-y-0.5 mt-1">
        {orderBook.bids.slice(0, 5).map((bid, i) => (
          <div
            key={`bid-${i}`}
            className={`flex items-center justify-between text-[10px] py-0.5 px-1 rounded transition-all ${
              flash[`bid-${i}`] ? "bg-emerald-500/10" : ""
            }`}
          >
            <span className="font-mono text-emerald-400">{bid.price.toFixed(priceDecimals)}</span>
            <span className="font-mono text-white/40">{bid.size.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TradePage() {
  const { toast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState<Asset>(ASSETS[0]);
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [chartRange, setChartRange] = useState<"1H" | "1D" | "1W" | "1M" | "1Y">("1D");
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [orderQty, setOrderQty] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [positions, setPositions] = useState(INITIAL_POSITIONS.map(p => ({
    ...p,
    currentPrice: ASSETS.find(a => a.symbol === p.symbol)?.price || p.currentPrice,
  })));

  const [orderBook, setOrderBook] = useState(() => generateOrderBook(selectedAsset.price));

  // Update order book every 2s
  useEffect(() => {
    const t = setInterval(() => {
      setOrderBook(generateOrderBook(selectedAsset.price));
    }, 2000);
    return () => clearInterval(t);
  }, [selectedAsset]);

  const chartData = useMemo(
    () => generatePriceData(selectedAsset, chartRange),
    [selectedAsset.symbol, chartRange]
  );

  const filteredAssets = useMemo(() =>
    ASSETS.filter(a =>
      a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 8),
    [searchQuery]
  );

  const watchlistAssets = useMemo(() =>
    watchlist.map(sym => ASSETS.find(a => a.symbol === sym)).filter(Boolean) as Asset[],
    [watchlist]
  );

  const toggleWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  }, []);

  const handleSelectAsset = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setShowSearch(false);
    setSearchQuery("");
    setOrderQty("");
    setLimitPrice(formatPrice(asset.price, asset.symbol));
    setStopPrice(formatPrice(asset.price * 0.99, asset.symbol));
  }, []);

  const placeOrder = useCallback((type: string) => {
    const qty = parseFloat(orderQty);
    if (!qty || qty <= 0) {
      toast({ title: "Invalid quantity", description: "Enter a positive quantity.", variant: "destructive" });
      return;
    }
    if ((type === "limit" || type === "stop-limit") && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      toast({ title: "Invalid price", description: "Enter a valid limit price.", variant: "destructive" });
      return;
    }
    const price = type === "market" ? selectedAsset.price : parseFloat(limitPrice);
    toast({
      title: `Order placed — ${orderSide.toUpperCase()} ${qty} ${selectedAsset.symbol} @ $${formatPrice(price, selectedAsset.symbol)}`,
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} order submitted successfully.`,
    });
    setOrderQty("");
  }, [orderQty, limitPrice, selectedAsset, orderSide, toast]);

  const closePosition = useCallback((symbol: string) => {
    setPositions(prev => prev.filter(p => p.symbol !== symbol));
    toast({ title: `Position closed — ${symbol}`, description: "Order executed at market price." });
  }, [toast]);

  const isUp = selectedAsset.change >= 0;

  const estimatedCost = parseFloat(orderQty) > 0
    ? (parseFloat(orderQty) * selectedAsset.price).toFixed(2)
    : "—";

  // Daily P&L summary
  const totalPnl = positions.reduce((sum, p) => sum + (p.currentPrice - p.entryPrice) * p.qty, 0);
  const winCount = positions.filter(p => p.currentPrice > p.entryPrice).length;

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-screen animate-fade-in">
      {/* ── LEFT PANEL ── */}
      <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 border-r border-white/[0.05] flex flex-col bg-[#050508]">
        {/* Search */}
        <div className="p-4 border-b border-white/[0.05]">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              placeholder="Search ticker or name…"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-sm text-white/80 placeholder-white/25 outline-none focus:border-[#4F46E5]/50 transition-all"
            />
          </div>
          {/* Search dropdown */}
          {showSearch && searchQuery && (
            <div className="absolute z-50 mt-1 w-72 glass rounded-xl border border-white/[0.1] shadow-2xl overflow-hidden">
              {filteredAssets.length === 0 ? (
                <p className="text-xs text-white/30 p-3">No results</p>
              ) : filteredAssets.map(asset => (
                <button
                  key={asset.symbol}
                  onClick={() => handleSelectAsset(asset)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold text-white/90">{asset.symbol}</p>
                    <p className="text-[10px] text-white/35">{asset.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-white/70">${formatPrice(asset.price, asset.symbol)}</p>
                    <p className={`font-mono text-[10px] font-semibold ${asset.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {asset.change >= 0 ? "+" : ""}{asset.change}%
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Watchlist */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-3">Watchlist</p>
            <div className="space-y-1">
              {watchlistAssets.map(asset => (
                <button
                  key={asset.symbol}
                  onClick={() => handleSelectAsset(asset)}
                  className={`w-full flex items-center gap-2 p-2.5 rounded-xl transition-all ${
                    selectedAsset.symbol === asset.symbol
                      ? "bg-[#4F46E5]/15 border border-[#4F46E5]/25"
                      : "hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <div className="flex-1 text-left">
                    <p className="font-mono text-sm font-semibold text-white/90">{asset.symbol}</p>
                    <p className="text-[9px] text-white/35 truncate">{asset.name}</p>
                  </div>
                  <SparklineMini asset={asset} />
                  <div className="text-right min-w-[56px]">
                    <p className="font-mono text-xs text-white/70">${formatPrice(asset.price, asset.symbol)}</p>
                    <p className={`font-mono text-[10px] font-semibold ${asset.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {asset.change >= 0 ? "+" : ""}{asset.change}%
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); toggleWatchlist(asset.symbol); }}
                    className="text-[#F59E0B]/60 hover:text-[#F59E0B] ml-1"
                  >
                    <StarOff size={11} />
                  </button>
                </button>
              ))}
              {/* Add from ASSETS not in watchlist */}
              {ASSETS.filter(a => !watchlist.includes(a.symbol)).slice(0, 3).map(asset => (
                <button
                  key={asset.symbol}
                  onClick={() => toggleWatchlist(asset.symbol)}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl text-white/30 hover:text-white/60 transition-all hover:bg-white/[0.04] border border-dashed border-white/[0.06]"
                >
                  <Star size={11} />
                  <span className="font-mono text-xs">{asset.symbol}</span>
                  <span className="text-[9px] text-white/25">{asset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Order Book */}
          <div className="p-4 pt-0">
            <OrderBook asset={selectedAsset} orderBook={orderBook} />
          </div>
        </ScrollArea>
      </div>

      {/* ── CENTER PANEL ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Asset header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.05] flex-wrap gap-y-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-2xl text-white">{selectedAsset.symbol}</span>
              <Badge className="text-[9px] capitalize bg-white/[0.06] text-white/40 border-white/[0.08]">
                {selectedAsset.category}
              </Badge>
              <button
                onClick={() => toggleWatchlist(selectedAsset.symbol)}
                className={watchlist.includes(selectedAsset.symbol) ? "text-[#F59E0B]" : "text-white/25 hover:text-[#F59E0B]"}
              >
                <Star size={14} />
              </button>
            </div>
            <p className="text-xs text-white/35">{selectedAsset.name}</p>
          </div>
          <div className="flex items-end gap-3">
            <span className={`font-mono text-3xl font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
              ${formatPrice(selectedAsset.price, selectedAsset.symbol)}
            </span>
            <div className="mb-1">
              <Badge className={`text-xs font-mono font-semibold ${isUp ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-red-500/15 text-red-400 border-red-500/25"}`}>
                {isUp ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                {isUp ? "+" : ""}{selectedAsset.change}%
              </Badge>
            </div>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] text-white/30">24h Volume</p>
            <p className="font-mono text-xs text-white/60">{selectedAsset.volume}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Chart */}
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center gap-1 mb-3">
              {(["1H", "1D", "1W", "1M", "1Y"] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    chartRange === r
                      ? "bg-[#4F46E5] text-white"
                      : "text-white/35 hover:text-white/70 hover:bg-white/[0.05]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isUp ? "#10B981" : "#EF4444"} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={isUp ? "#10B981" : "#EF4444"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} tickLine={false} axisLine={false} width={60}
                    tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v.toFixed(2)}`}
                  />
                  <Tooltip
                    contentStyle={{ background: "rgba(8,11,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }}
                    formatter={(v: number) => [`$${formatPrice(v, selectedAsset.symbol)}`, selectedAsset.symbol]}
                  />
                  <Area type="monotone" dataKey="price" stroke={isUp ? "#10B981" : "#EF4444"} strokeWidth={2} fill="url(#priceGrad)" dot={false} animationDuration={600} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Order Form */}
          <div className="px-6 pb-4">
            <div className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">Place Order</p>
              
              {/* Buy/Sell toggle */}
              <div className="flex rounded-xl overflow-hidden border border-white/[0.08] mb-3">
                <button
                  onClick={() => setOrderSide("buy")}
                  className={`flex-1 py-2 text-sm font-semibold transition-all ${
                    orderSide === "buy" ? "bg-emerald-500 text-white" : "text-white/30 hover:text-white/60"
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setOrderSide("sell")}
                  className={`flex-1 py-2 text-sm font-semibold transition-all ${
                    orderSide === "sell" ? "bg-red-500 text-white" : "text-white/30 hover:text-white/60"
                  }`}
                >
                  Sell
                </button>
              </div>

              <Tabs defaultValue="market" className="w-full">
                <TabsList className="w-full bg-white/[0.04] mb-3 h-8">
                  <TabsTrigger value="market" className="flex-1 text-xs h-6">Market</TabsTrigger>
                  <TabsTrigger value="limit" className="flex-1 text-xs h-6">Limit</TabsTrigger>
                  <TabsTrigger value="stop-limit" className="flex-1 text-xs h-6">Stop-Limit</TabsTrigger>
                </TabsList>

                {/* Market */}
                <TabsContent value="market" className="space-y-3 mt-0">
                  <div>
                    <label className="text-[10px] text-white/40 mb-1 block">Quantity</label>
                    <Input
                      value={orderQty}
                      onChange={e => setOrderQty(e.target.value)}
                      placeholder="0.00"
                      type="number"
                      min="0"
                      className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm h-9"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/35">Est. Cost</span>
                    <span className="font-mono text-white/70">${estimatedCost}</span>
                  </div>
                  <Button
                    onClick={() => placeOrder("market")}
                    className={`w-full font-semibold ${orderSide === "buy" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"} text-white`}
                  >
                    {orderSide === "buy" ? "Buy" : "Sell"} {selectedAsset.symbol}
                  </Button>
                </TabsContent>

                {/* Limit */}
                <TabsContent value="limit" className="space-y-3 mt-0">
                  <div>
                    <label className="text-[10px] text-white/40 mb-1 block">Quantity</label>
                    <Input value={orderQty} onChange={e => setOrderQty(e.target.value)} placeholder="0.00" type="number" min="0"
                      className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1 block">Limit Price</label>
                    <Input value={limitPrice} onChange={e => setLimitPrice(e.target.value)} placeholder={formatPrice(selectedAsset.price, selectedAsset.symbol)} type="number" min="0"
                      className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm h-9" />
                  </div>
                  <Button onClick={() => placeOrder("limit")}
                    className={`w-full font-semibold ${orderSide === "buy" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"} text-white`}>
                    Place Limit Order
                  </Button>
                </TabsContent>

                {/* Stop-Limit */}
                <TabsContent value="stop-limit" className="space-y-3 mt-0">
                  <div>
                    <label className="text-[10px] text-white/40 mb-1 block">Quantity</label>
                    <Input value={orderQty} onChange={e => setOrderQty(e.target.value)} placeholder="0.00" type="number" min="0"
                      className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1 block">Stop Price</label>
                    <Input value={stopPrice} onChange={e => setStopPrice(e.target.value)} placeholder="Stop" type="number" min="0"
                      className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1 block">Limit Price</label>
                    <Input value={limitPrice} onChange={e => setLimitPrice(e.target.value)} placeholder="Limit" type="number" min="0"
                      className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm h-9" />
                  </div>
                  <Button onClick={() => placeOrder("stop-limit")}
                    className={`w-full font-semibold ${orderSide === "buy" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"} text-white`}>
                    Place Stop-Limit Order
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Positions */}
          <div className="px-6 pb-4">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Open Positions</p>
                <span className="text-[10px] text-white/30">{positions.length} positions</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {positions.map(pos => {
                  const pnl = (pos.currentPrice - pos.entryPrice) * pos.qty;
                  const pnlPct = ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
                  const isPosPnl = pnl >= 0;
                  return (
                    <div key={pos.symbol} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02]">
                      <div className="flex-1">
                        <p className="font-mono text-sm font-semibold text-white/90">{pos.symbol}</p>
                        <p className="text-[10px] text-white/30">{pos.qty} × ${formatPrice(pos.entryPrice, pos.symbol)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xs text-white/70">${formatPrice(pos.currentPrice, pos.symbol)}</p>
                        <p className={`font-mono text-[10px] font-semibold ${isPosPnl ? "text-emerald-400" : "text-red-400"}`}>
                          {isPosPnl ? "+" : ""}${pnl.toFixed(2)} ({isPosPnl ? "+" : ""}{pnlPct.toFixed(2)}%)
                        </p>
                      </div>
                      <button
                        onClick={() => closePosition(pos.symbol)}
                        className="text-[10px] px-2 py-1 rounded-lg border border-white/[0.1] text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all"
                      >
                        Close
                      </button>
                    </div>
                  );
                })}
                {positions.length === 0 && (
                  <p className="text-xs text-white/25 text-center py-6">No open positions</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT MINI PANEL ── */}
      <div className="w-full lg:w-64 xl:w-72 flex-shrink-0 border-l border-white/[0.05] flex flex-col bg-[#050508]">
        {/* Daily P&L */}
        <div className="p-4 border-b border-white/[0.05]">
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-3">Daily P&L</p>
          <div className="glass rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Unrealized</span>
              <span className={`font-mono font-semibold ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Realized</span>
              <span className="font-mono text-white/60">+$841.20</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Win Rate</span>
              <span className="font-mono text-[#F59E0B]">{positions.length > 0 ? Math.round(winCount / positions.length * 100) : 0}%</span>
            </div>
            <div className="h-px bg-white/[0.05] my-1" />
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Total</span>
              <span className={`font-mono font-bold text-sm ${(totalPnl + 841.20) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                +${(totalPnl + 841.20).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="flex-1 p-4 overflow-y-auto">
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-3">Recent Trades</p>
          <div className="space-y-1">
            {RECENT_TRADES.map((trade, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
                <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                  trade.side === "B" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                }`}>
                  {trade.side}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs font-semibold text-white/80">{trade.qty} {trade.symbol}</p>
                  <p className="font-mono text-[9px] text-white/30">@{trade.price.toLocaleString()}</p>
                </div>
                <span className="text-[9px] text-white/25 flex-shrink-0">{trade.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
