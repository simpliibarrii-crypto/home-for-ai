import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Star, StarOff, TrendingUp, TrendingDown, ChevronDown,
  Clock, X, BarChart2
} from "lucide-react";
import {
  ComposedChart, AreaChart, Area, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";

// ─── Data ─────────────────────────────────────────────────────────────────────
interface Asset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: string;
  category: "stock" | "crypto" | "forex" | "etf" | "bond";
  volatility: number;
}

const ASSETS: Asset[] = [
  { symbol: "AAPL",    name: "Apple Inc.",            price: 213.55,   change: 1.24,  volume: "58.2M",  category: "stock",  volatility: 1   },
  { symbol: "MSFT",    name: "Microsoft Corp.",        price: 422.80,   change: 0.87,  volume: "22.1M",  category: "stock",  volatility: 1   },
  { symbol: "GOOGL",   name: "Alphabet Inc.",          price: 178.92,   change: -0.43, volume: "25.4M",  category: "stock",  volatility: 1.1 },
  { symbol: "AMZN",    name: "Amazon.com Inc.",        price: 194.31,   change: 1.78,  volume: "43.8M",  category: "stock",  volatility: 1.2 },
  { symbol: "TSLA",    name: "Tesla Inc.",             price: 248.42,   change: -2.14, volume: "118.3M", category: "stock",  volatility: 2.5 },
  { symbol: "NVDA",    name: "NVIDIA Corp.",           price: 1208.88,  change: 3.42,  volume: "41.2M",  category: "stock",  volatility: 2.2 },
  { symbol: "META",    name: "Meta Platforms",         price: 512.14,   change: 0.94,  volume: "18.7M",  category: "stock",  volatility: 1.3 },
  { symbol: "NFLX",    name: "Netflix Inc.",           price: 712.50,   change: -1.08, volume: "4.2M",   category: "stock",  volatility: 1.8 },
  { symbol: "BTC",     name: "Bitcoin",               price: 98420.00, change: 2.14,  volume: "$42.8B", category: "crypto", volatility: 4   },
  { symbol: "ETH",     name: "Ethereum",              price: 3412.50,  change: 1.87,  volume: "$18.4B", category: "crypto", volatility: 4.5 },
  { symbol: "SOL",     name: "Solana",                price: 187.42,   change: 4.21,  volume: "$4.1B",  category: "crypto", volatility: 6   },
  { symbol: "BNB",     name: "BNB",                   price: 612.30,   change: 0.88,  volume: "$1.8B",  category: "crypto", volatility: 3.5 },
  { symbol: "XRP",     name: "XRP",                   price: 0.6241,   change: -1.24, volume: "$2.9B",  category: "crypto", volatility: 5   },
  { symbol: "ADA",     name: "Cardano",               price: 0.4812,   change: 2.41,  volume: "$0.9B",  category: "crypto", volatility: 5.5 },
  { symbol: "DOGE",    name: "Dogecoin",              price: 0.1842,   change: -3.12, volume: "$1.4B",  category: "crypto", volatility: 7   },
  { symbol: "EUR/USD", name: "Euro / US Dollar",      price: 1.0842,   change: 0.12,  volume: "$2.1T",  category: "forex",  volatility: 0.3 },
  { symbol: "GBP/USD", name: "British Pound / USD",   price: 1.2712,   change: -0.08, volume: "$0.8T",  category: "forex",  volatility: 0.4 },
  { symbol: "USD/JPY", name: "US Dollar / Yen",       price: 154.82,   change: 0.24,  volume: "$1.2T",  category: "forex",  volatility: 0.35},
  { symbol: "SPY",     name: "SPDR S&P 500 ETF",      price: 542.18,   change: 0.87,  volume: "85.4M",  category: "etf",    volatility: 0.8 },
  { symbol: "QQQ",     name: "Invesco QQQ Trust",     price: 468.92,   change: 1.12,  volume: "45.2M",  category: "etf",    volatility: 1   },
  { symbol: "TLT",     name: "iShares 20+ Yr Treasury", price: 88.42,  change: -0.34, volume: "22.1M",  category: "bond",   volatility: 0.2 },
];

const DEFAULT_WATCHLIST = ["AAPL", "BTC", "ETH", "TSLA", "NVDA", "SPY"];
const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1D"] as const;
type Timeframe = typeof TIMEFRAMES[number];

// ─── API types ────────────────────────────────────────────────────────────────
interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number; }
interface DepthLevel { price: number; amount: number; total: number; }
interface DepthData { bids: DepthLevel[]; asks: DepthLevel[]; mid: number; spread: number; }
interface RecentTrade { id: number; time: number; price: number; amount: number; side: "BUY" | "SELL"; }
interface LivePrices { prices: Record<string, { usd: number; cad: number; change24h: number }>; fetchedAt: string; source: string; }

function formatPrice(p: number, sym: string): string {
  if (sym === "EUR/USD" || sym === "GBP/USD" || sym === "USD/JPY") return p.toFixed(4);
  if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p < 0.01) return p.toFixed(6);
  return p.toFixed(2);
}

function getLivePrice(sym: string, fallback: number, live?: LivePrices): number {
  const map: Record<string, string> = { BTC: "BTC", ETH: "ETH", SOL: "SOL", BNB: "BNB", MATIC: "MATIC" };
  const k = map[sym];
  return (k && live?.prices?.[k]?.usd) ? live.prices[k].usd : fallback;
}

function getLiveChange(sym: string, fallback: number, live?: LivePrices): number {
  const map: Record<string, string> = { BTC: "BTC", ETH: "ETH", SOL: "SOL", BNB: "BNB", MATIC: "MATIC" };
  const k = map[sym];
  return (k && live?.prices?.[k]) ? live.prices[k].change24h : fallback;
}

// ─── Flash Number ─────────────────────────────────────────────────────────────
function FlashNum({ value, cls = "" }: { value: number; cls?: string }) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) {
      setFlash(value > prev.current ? "up" : "down");
      prev.current = value;
      const t = setTimeout(() => setFlash(null), 600);
      return () => clearTimeout(t);
    }
  }, [value]);
  const bg = flash === "up" ? "bg-emerald-500/20" : flash === "down" ? "bg-red-500/20" : "";
  return <span className={`rounded px-0.5 transition-colors duration-300 ${bg} ${cls}`}>{value}</span>;
}

// ─── Custom Candlestick ───────────────────────────────────────────────────────
function CandlestickBar(props: {
  x?: number; y?: number; width?: number; height?: number;
  open?: number; high?: number; low?: number; close?: number;
  chartHigh?: number; chartLow?: number; totalHeight?: number;
}) {
  const { x = 0, width = 0, open = 0, high = 0, low = 0, close = 0, chartHigh = 0, chartLow = 0, totalHeight = 0 } = props;
  if (chartHigh === chartLow || !totalHeight) return null;

  const range = chartHigh - chartLow;
  const toY = (val: number) => totalHeight - ((val - chartLow) / range) * totalHeight;

  const isUp = close >= open;
  const color = isUp ? "#10B981" : "#EF4444";

  const bodyTop = Math.min(toY(open), toY(close));
  const bodyHeight = Math.max(Math.abs(toY(open) - toY(close)), 1);
  const wickTop = toY(high);
  const wickBottom = toY(low);
  const cx = x + width / 2;

  return (
    <g>
      {/* Wick */}
      <line x1={cx} y1={wickTop} x2={cx} y2={bodyTop} stroke={color} strokeWidth={1} />
      <line x1={cx} y1={bodyTop + bodyHeight} x2={cx} y2={wickBottom} stroke={color} strokeWidth={1} />
      {/* Body */}
      <rect x={x + 1} y={bodyTop} width={Math.max(width - 2, 1)} height={bodyHeight} fill={color} fillOpacity={0.9} />
    </g>
  );
}

// ─── Order form component (unchanged functionality) ──────────────────────────
function OrderForm({ asset, isUp, livePrices }: { asset: Asset; isUp: boolean; livePrices?: LivePrices }) {
  const { toast } = useToast();
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [orderQty, setOrderQty] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");

  const price = getLivePrice(asset.symbol, asset.price, livePrices);
  const estimatedCost = parseFloat(orderQty) > 0 ? (parseFloat(orderQty) * price).toFixed(2) : "—";

  const place = (type: string) => {
    if (!orderQty || isNaN(parseFloat(orderQty))) {
      toast({ title: "Enter a quantity", variant: "destructive" });
      return;
    }
    toast({
      title: `Order placed — ${orderSide.toUpperCase()} ${orderQty} ${asset.symbol}`,
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} order submitted.`,
    });
    setOrderQty("");
  };

  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">Place Order</p>
      <div className="flex rounded-xl overflow-hidden border border-white/[0.08] mb-3">
        <button onClick={() => setOrderSide("buy")} className={`flex-1 py-2 text-sm font-semibold transition-all ${orderSide === "buy" ? "bg-emerald-500 text-white" : "text-white/30 hover:text-white/60"}`}>Buy</button>
        <button onClick={() => setOrderSide("sell")} className={`flex-1 py-2 text-sm font-semibold transition-all ${orderSide === "sell" ? "bg-red-500 text-white" : "text-white/30 hover:text-white/60"}`}>Sell</button>
      </div>
      <Tabs defaultValue="market" className="w-full">
        <TabsList className="w-full bg-white/[0.04] mb-3 h-8">
          <TabsTrigger value="market" className="flex-1 text-xs h-6">Market</TabsTrigger>
          <TabsTrigger value="limit" className="flex-1 text-xs h-6">Limit</TabsTrigger>
          <TabsTrigger value="stop-limit" className="flex-1 text-xs h-6">Stop-Limit</TabsTrigger>
        </TabsList>
        <TabsContent value="market" className="space-y-3 mt-0">
          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Quantity</label>
            <Input value={orderQty} onChange={e => setOrderQty(e.target.value)} placeholder="0.00" type="number" min="0" className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm h-9" />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/35">Est. Cost</span>
            <span className="font-mono text-white/70">${estimatedCost}</span>
          </div>
          <Button onClick={() => place("market")} className={`w-full font-semibold ${orderSide === "buy" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"} text-white`}>
            {orderSide === "buy" ? "Buy" : "Sell"} {asset.symbol}
          </Button>
        </TabsContent>
        <TabsContent value="limit" className="space-y-3 mt-0">
          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Quantity</label>
            <Input value={orderQty} onChange={e => setOrderQty(e.target.value)} placeholder="0.00" type="number" min="0" className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm h-9" />
          </div>
          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Limit Price</label>
            <Input value={limitPrice} onChange={e => setLimitPrice(e.target.value)} placeholder={formatPrice(price, asset.symbol)} type="number" min="0" className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm h-9" />
          </div>
          <Button onClick={() => place("limit")} className={`w-full font-semibold ${orderSide === "buy" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"} text-white`}>
            Place Limit Order
          </Button>
        </TabsContent>
        <TabsContent value="stop-limit" className="space-y-3 mt-0">
          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Quantity</label>
            <Input value={orderQty} onChange={e => setOrderQty(e.target.value)} placeholder="0.00" type="number" min="0" className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm h-9" />
          </div>
          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Stop Price</label>
            <Input value={stopPrice} onChange={e => setStopPrice(e.target.value)} placeholder="Stop" type="number" min="0" className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm h-9" />
          </div>
          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Limit Price</label>
            <Input value={limitPrice} onChange={e => setLimitPrice(e.target.value)} placeholder="Limit" type="number" min="0" className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm h-9" />
          </div>
          <Button onClick={() => place("stop-limit")} className={`w-full font-semibold ${orderSide === "buy" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"} text-white`}>
            Place Stop-Limit Order
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Trade Page ───────────────────────────────────────────────────────────────
export default function TradePage() {
  const [selectedAsset, setSelectedAsset] = useState<Asset>(ASSETS.find(a => a.symbol === "BTC") || ASSETS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [watchlist, setWatchlist] = useState(DEFAULT_WATCHLIST);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: livePrices } = useQuery<LivePrices>({ queryKey: ["/api/prices"], refetchInterval: 30000 });

  const { data: candles, isLoading: candlesLoading } = useQuery<Candle[]>({
    queryKey: [`/api/trade/candles?symbol=${selectedAsset.symbol}&timeframe=${timeframe}`],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/trade/candles?symbol=${selectedAsset.symbol}&timeframe=${timeframe}`);
      return r.json();
    },
    refetchInterval: 30000,
  });

  const { data: depthData } = useQuery<DepthData>({
    queryKey: [`/api/trade/depth?symbol=${selectedAsset.symbol}`],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/trade/depth?symbol=${selectedAsset.symbol}`);
      return r.json();
    },
    refetchInterval: 15000,
  });

  const { data: recentTrades } = useQuery<RecentTrade[]>({
    queryKey: [`/api/trade/recent?symbol=${selectedAsset.symbol}`],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/trade/recent?symbol=${selectedAsset.symbol}`);
      return r.json();
    },
    refetchInterval: 10000,
  });

  const watchlistAssets = useMemo(() => ASSETS.filter(a => watchlist.includes(a.symbol)), [watchlist]);
  const filteredAssets = useMemo(() =>
    ASSETS.filter(a => a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || a.name.toLowerCase().includes(searchQuery.toLowerCase())),
  [searchQuery]);

  const toggleWatchlist = useCallback((sym: string) => {
    setWatchlist(prev => prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]);
  }, []);

  const handleSelectAsset = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setSearchQuery("");
    setShowSearch(false);
  }, []);

  const livePrice = getLivePrice(selectedAsset.symbol, selectedAsset.price, livePrices);
  const liveChange = getLiveChange(selectedAsset.symbol, selectedAsset.change, livePrices);
  const isUp = liveChange >= 0;

  // Compute chart bounds from candles
  const chartBounds = useMemo(() => {
    if (!candles || candles.length === 0) return { min: 0, max: 0 };
    const min = Math.min(...candles.map(c => c.low)) * 0.9995;
    const max = Math.max(...candles.map(c => c.high)) * 1.0005;
    return { min, max };
  }, [candles]);

  // Depth chart data — interleave bids/asks
  const depthChartData = useMemo(() => {
    if (!depthData) return [];
    const mid = depthData.mid;
    const data: { price: number; bids?: number; asks?: number }[] = [];
    // Bids (left side, descending price)
    [...depthData.bids].reverse().forEach(b => {
      data.push({ price: b.price, bids: b.total });
    });
    // Asks (right side, ascending price)
    depthData.asks.forEach(a => {
      data.push({ price: a.price, asks: a.total });
    });
    return data.sort((a, b) => a.price - b.price);
  }, [depthData]);

  // Stats from candles
  const stats = useMemo(() => {
    if (!candles || candles.length === 0) return { high: 0, low: 0, volume: 0, open: 0 };
    const last = candles[candles.length - 1];
    const high = Math.max(...candles.map(c => c.high));
    const low = Math.min(...candles.map(c => c.low));
    const volume = candles.reduce((s, c) => s + c.volume, 0);
    return { high, low, volume: Math.round(volume), open: candles[0].open };
  }, [candles]);

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-screen animate-fade-in">
      {/* ── LEFT PANEL: asset search + watchlist ── */}
      <div className="w-full lg:w-72 flex-shrink-0 border-r border-white/[0.05] flex flex-col bg-[#050508]">
        <div className="p-4 border-b border-white/[0.05] relative">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              placeholder="Search ticker…"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-sm text-white/80 placeholder-white/25 outline-none focus:border-[#4F46E5]/50 transition-all"
            />
          </div>
          {showSearch && searchQuery && (
            <div className="absolute z-50 mt-1 left-4 right-4 glass rounded-xl border border-white/[0.1] shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
              {filteredAssets.length === 0 ? (
                <p className="text-xs text-white/30 p-3">No results</p>
              ) : filteredAssets.map(asset => (
                <button key={asset.symbol} onClick={() => handleSelectAsset(asset)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.05] transition-colors text-left">
                  <div>
                    <p className="font-mono text-sm font-semibold text-white/90">{asset.symbol}</p>
                    <p className="text-[10px] text-white/35">{asset.name}</p>
                  </div>
                  <p className={`font-mono text-[10px] font-semibold ${asset.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {asset.change >= 0 ? "+" : ""}{asset.change}%
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-3">Watchlist</p>
            <div className="space-y-1">
              {watchlistAssets.map(asset => (
                <button key={asset.symbol} onClick={() => handleSelectAsset(asset)} className={`w-full flex items-center gap-2 p-2.5 rounded-xl transition-all ${selectedAsset.symbol === asset.symbol ? "bg-[#4F46E5]/15 border border-[#4F46E5]/25" : "hover:bg-white/[0.04] border border-transparent"}`}>
                  <div className="flex-1 text-left">
                    <p className="font-mono text-sm font-semibold text-white/90">{asset.symbol}</p>
                    <p className="text-[9px] text-white/35 truncate">{asset.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-white/70">${formatPrice(asset.price, asset.symbol)}</p>
                    <p className={`font-mono text-[10px] font-semibold ${asset.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>{asset.change >= 0 ? "+" : ""}{asset.change}%</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleWatchlist(asset.symbol); }} className="text-[#F59E0B]/60 hover:text-[#F59E0B] ml-1"><StarOff size={11} /></button>
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* ── CENTER: charts + order form ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Price Info Bar */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-white/[0.05] flex-wrap gap-y-2 bg-[#050508]">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-xl text-white">{selectedAsset.symbol}</span>
            <Badge className="text-[9px] capitalize bg-white/[0.06] text-white/40 border-white/[0.08]">{selectedAsset.category}</Badge>
            <button onClick={() => toggleWatchlist(selectedAsset.symbol)} className={watchlist.includes(selectedAsset.symbol) ? "text-[#F59E0B]" : "text-white/25 hover:text-[#F59E0B]"}>
              <Star size={14} />
            </button>
          </div>
          <div className="flex items-end gap-3">
            <span className={`font-mono text-2xl font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
              ${formatPrice(livePrice, selectedAsset.symbol)}
            </span>
            <Badge className={`text-xs font-mono font-semibold mb-1 ${isUp ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-red-500/15 text-red-400 border-red-500/25"}`}>
              {isUp ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
              {isUp ? "+" : ""}{liveChange.toFixed(2)}%
            </Badge>
          </div>
          <div className="flex items-center gap-4 ml-auto flex-wrap">
            {stats.high > 0 && (
              <>
                <div className="text-right">
                  <p className="text-[9px] text-white/30">24h High</p>
                  <p className="font-mono text-xs text-white/60">${formatPrice(stats.high, selectedAsset.symbol)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-white/30">24h Low</p>
                  <p className="font-mono text-xs text-white/60">${formatPrice(stats.low, selectedAsset.symbol)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-white/30">24h Volume</p>
                  <p className="font-mono text-xs text-white/60">{stats.volume.toLocaleString()}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Timeframe Tabs */}
          <div className="flex items-center gap-1 px-4 pt-4 pb-2">
            {TIMEFRAMES.map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)} className={`px-3 py-1 text-xs rounded-lg font-mono font-medium transition-all ${timeframe === tf ? "bg-[#4F46E5] text-white" : "text-white/35 hover:text-white/70 hover:bg-white/[0.05]"}`}>
                {tf}
              </button>
            ))}
          </div>

          {/* Candlestick Chart */}
          <div className="px-4 pb-2">
            <div className="glass rounded-2xl p-3">
              <div style={{ height: 240 }}>
                {candlesLoading ? (
                  <div className="h-full flex items-center justify-center text-white/30 text-sm">Loading chart…</div>
                ) : candles && candles.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={candles} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <XAxis
                        dataKey="time"
                        tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8 }}
                        tickLine={false}
                        axisLine={false}
                        interval={Math.floor(candles.length / 6)}
                        tickFormatter={v => {
                          const d = new Date(v);
                          return timeframe === "1D" ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                        }}
                      />
                      <YAxis
                        domain={[chartBounds.min, chartBounds.max]}
                        tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8 }}
                        tickLine={false}
                        axisLine={false}
                        width={65}
                        tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v.toFixed(2)}`}
                        orientation="right"
                      />
                      <Tooltip
                        contentStyle={{ background: "rgba(5,5,8,0.98)", border: "1px solid rgba(79,70,229,0.3)", borderRadius: "8px", fontSize: "11px" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const c = payload[0].payload as Candle;
                          const cu = c.close >= c.open;
                          return (
                            <div className="text-xs font-mono p-2 space-y-0.5">
                              <div className="text-white/40 mb-1">{new Date(c.time).toLocaleString()}</div>
                              <div className="flex gap-3">
                                <span className="text-white/40">O</span><span className={cu ? "text-emerald-400" : "text-red-400"}>${formatPrice(c.open, selectedAsset.symbol)}</span>
                                <span className="text-white/40">H</span><span className="text-white/70">${formatPrice(c.high, selectedAsset.symbol)}</span>
                              </div>
                              <div className="flex gap-3">
                                <span className="text-white/40">L</span><span className="text-white/70">${formatPrice(c.low, selectedAsset.symbol)}</span>
                                <span className="text-white/40">C</span><span className={cu ? "text-emerald-400" : "text-red-400"}>${formatPrice(c.close, selectedAsset.symbol)}</span>
                              </div>
                              <div><span className="text-white/40">V</span> {c.volume.toFixed(0)}</div>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="close"
                        shape={(props: {
                          x?: number; y?: number; width?: number; height?: number;
                          payload?: Candle;
                        }) => {
                          const c = props.payload;
                          if (!c) return <g />;
                          return (
                            <CandlestickBar
                              x={props.x} width={props.width}
                              open={c.open} high={c.high} low={c.low} close={c.close}
                              chartHigh={chartBounds.max} chartLow={chartBounds.min}
                              totalHeight={236}
                            />
                          );
                        }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-white/20 text-sm">No data</div>
                )}
              </div>
            </div>
          </div>

          {/* Volume Bars */}
          {candles && candles.length > 0 && (
            <div className="px-4 pb-2">
              <div className="glass rounded-2xl p-3" style={{ height: 80 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={candles} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={[0, "auto"]} />
                    <Bar dataKey="volume" radius={[2, 2, 0, 0]}>
                      {candles.map((c, i) => (
                        <Cell key={i} fill={c.close >= c.open ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)"} />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Depth Chart */}
          <div className="px-4 pb-2">
            <div className="glass rounded-2xl p-3">
              <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2">Order Book Depth</p>
              <div style={{ height: 150 }}>
                {depthData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={depthChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="bidGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="askGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="price" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v > 1000 ? Math.round(v).toLocaleString() : v.toFixed(4)}`} interval="preserveStartEnd" />
                      <YAxis hide />
                      <Tooltip contentStyle={{ background: "rgba(5,5,8,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "10px" }} />
                      <ReferenceLine x={depthData.mid} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                      <Area type="stepAfter" dataKey="bids" stroke="#10B981" fill="url(#bidGrad)" strokeWidth={1.5} dot={false} connectNulls={false} />
                      <Area type="stepBefore" dataKey="asks" stroke="#EF4444" fill="url(#askGrad)" strokeWidth={1.5} dot={false} connectNulls={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-white/20 text-sm">Loading depth…</div>
                )}
              </div>
            </div>
          </div>

          {/* Trade History Tape */}
          <div className="px-4 pb-4">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05]">
                <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Trade History</p>
                <span className="text-[10px] text-white/25 font-mono">Last 30</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      <th className="px-3 py-2 text-left text-[10px] text-white/30 font-medium">Time</th>
                      <th className="px-3 py-2 text-right text-[10px] text-white/30 font-medium">Price</th>
                      <th className="px-3 py-2 text-right text-[10px] text-white/30 font-medium">Amount</th>
                      <th className="px-3 py-2 text-right text-[10px] text-white/30 font-medium">Side</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTrades ? recentTrades.map((t) => {
                      const isBuy = t.side === "BUY";
                      const d = new Date(t.time);
                      return (
                        <tr key={t.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${isBuy ? "hover:bg-emerald-500/[0.02]" : "hover:bg-red-500/[0.02]"}`}>
                          <td className="px-3 py-1.5 font-mono text-white/30">{d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                          <td className={`px-3 py-1.5 font-mono text-right font-medium ${isBuy ? "text-emerald-400" : "text-red-400"}`}>${formatPrice(t.price, selectedAsset.symbol)}</td>
                          <td className="px-3 py-1.5 font-mono text-right text-white/50">{t.amount.toFixed(4)}</td>
                          <td className="px-3 py-1.5 text-right">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isBuy ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>{t.side}</span>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-white/25">Loading trades…</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Order Form */}
          <div className="px-4 pb-6">
            <OrderForm asset={selectedAsset} isUp={isUp} livePrices={livePrices} />
          </div>
        </div>
      </div>
    </div>
  );
}
