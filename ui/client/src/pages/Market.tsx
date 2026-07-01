import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Search, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Area
} from "recharts";
import {
  ComposableMap, Geographies, Geography, ZoomableGroup,
} from "react-simple-maps";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
  sparkline: number[];
  category: string;
}

interface Ticker { symbol: string; name: string; price: number; change: number; category: string; }
interface SentimentItem { market: string; label: string; value: number; }
interface NewsItem { id: number; headline: string; source: string; time: string; sentiment: string; agents: string[]; }
interface Region { code: string; name: string; change: number; category: string; }
interface MarketData { tickers: Ticker[]; sentiment: SentimentItem[]; news: NewsItem[]; regions: Region[]; }

// ─── Country data (kept from original) ───────────────────────────────────────
interface CountryInfo { name: string; flag: string; index: string; value: number; change1d: number; ytd: number; marketCap: string; currency: string; }
function seededRandom(seed: number) { const x = Math.sin(seed) * 10000; return x - Math.floor(x); }
function getCountryChange(isoCode: string): number {
  const hash = isoCode.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const r = seededRandom(hash);
  return parseFloat(((r * 6) - 3).toFixed(2));
}
const COUNTRY_DATA: Record<string, CountryInfo> = {
  USA: { name: "United States", flag: "🇺🇸", index: "S&P 500", value: 5432.68, change1d: 0.87, ytd: 12.4, marketCap: "$45.2T", currency: "USD" },
  CAN: { name: "Canada", flag: "🇨🇦", index: "TSX", value: 22415.30, change1d: 0.42, ytd: 7.1, marketCap: "$3.1T", currency: "CAD" },
  GBR: { name: "United Kingdom", flag: "🇬🇧", index: "FTSE 100", value: 8201.45, change1d: -0.23, ytd: 4.8, marketCap: "$4.2T", currency: "GBP" },
  JPN: { name: "Japan", flag: "🇯🇵", index: "Nikkei 225", value: 38945.80, change1d: 1.12, ytd: 18.3, marketCap: "$6.8T", currency: "JPY" },
  DEU: { name: "Germany", flag: "🇩🇪", index: "DAX", value: 18642.20, change1d: -0.55, ytd: 9.2, marketCap: "$2.4T", currency: "EUR" },
  CHN: { name: "China", flag: "🇨🇳", index: "SSE Composite", value: 3127.50, change1d: -1.34, ytd: -5.2, marketCap: "$8.9T", currency: "CNY" },
  BRA: { name: "Brazil", flag: "🇧🇷", index: "Bovespa", value: 128742.00, change1d: 0.68, ytd: 3.4, marketCap: "$1.1T", currency: "BRL" },
  IND: { name: "India", flag: "🇮🇳", index: "BSE Sensex", value: 74512.30, change1d: 1.45, ytd: 22.1, marketCap: "$4.5T", currency: "INR" },
  AUS: { name: "Australia", flag: "🇦🇺", index: "ASX 200", value: 7812.40, change1d: 0.31, ytd: 6.7, marketCap: "$1.9T", currency: "AUD" },
  FRA: { name: "France", flag: "🇫🇷", index: "CAC 40", value: 7892.15, change1d: -0.78, ytd: 3.1, marketCap: "$2.8T", currency: "EUR" },
  KOR: { name: "South Korea", flag: "🇰🇷", index: "KOSPI", value: 2598.40, change1d: 0.92, ytd: 11.2, marketCap: "$1.7T", currency: "KRW" },
  MEX: { name: "Mexico", flag: "🇲🇽", index: "IPC", value: 54231.80, change1d: -0.41, ytd: 2.8, marketCap: "$0.5T", currency: "MXN" },
};
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const ISO_3166: Record<string, string> = {
  "840": "USA", "124": "CAN", "826": "GBR", "392": "JPN", "276": "DEU",
  "156": "CHN", "076": "BRA", "356": "IND", "036": "AUS", "250": "FRA",
  "410": "KOR", "484": "MEX",
};

// ─── Format helpers ──────────────────────────────────────────────────────────
function fmtVol(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "B";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "M";
  return n.toString();
}
function fmtMcap(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "T";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(1) + "B";
  return "$" + n + "M";
}
function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(8);
}

// ─── Sparkline mini chart ─────────────────────────────────────────────────────
function SparklineMini({ data, positive }: { data: number[]; positive: boolean }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ width: 72, height: 28 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line type="monotone" dataKey="v" stroke={positive ? "#10B981" : "#EF4444"} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

type SortKey = "price" | "change24h" | "high24h" | "low24h" | "volume24h" | "marketCap";
type SortDir = "asc" | "desc";
type MarketTab = "All" | "Spot" | "Futures" | "DeFi";

// ─── Markets Table ────────────────────────────────────────────────────────────
function MarketsTable() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<MarketTab>("All");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: assets, isLoading } = useQuery<MarketAsset[]>({
    queryKey: ["/api/market/assets"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/market/assets");
      return r.json();
    },
    refetchInterval: 30000,
  });

  const filtered = useMemo(() => {
    if (!assets) return [];
    let rows = assets;
    if (search) rows = rows.filter(a => a.symbol.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase()));
    rows = [...rows].sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "asc" ? diff : -diff;
    });
    return rows;
  }, [assets, search, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown size={10} className="text-white/20" />;
    return sortDir === "asc" ? <ArrowUp size={10} className="text-[#4F46E5]" /> : <ArrowDown size={10} className="text-[#4F46E5]" />;
  }

  const TABS: MarketTab[] = ["All", "Spot", "Futures", "DeFi"];

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Table header controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] flex-wrap gap-3">
        <div className="flex items-center gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${tab === t ? "bg-[#4F46E5] text-white" : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white/80 placeholder-white/25 outline-none focus:border-[#4F46E5]/50 transition-all w-44"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="px-4 py-2 text-left text-[10px] text-white/30 font-medium">#</th>
              <th className="px-4 py-2 text-left text-[10px] text-white/30 font-medium">Pair</th>
              <th className="px-4 py-2 text-right text-[10px] text-white/30 font-medium cursor-pointer hover:text-white/60" onClick={() => toggleSort("price")}>
                <span className="flex items-center justify-end gap-1">Price <SortIcon k="price" /></span>
              </th>
              <th className="px-4 py-2 text-right text-[10px] text-white/30 font-medium cursor-pointer hover:text-white/60" onClick={() => toggleSort("change24h")}>
                <span className="flex items-center justify-end gap-1">24h % <SortIcon k="change24h" /></span>
              </th>
              <th className="px-4 py-2 text-right text-[10px] text-white/30 font-medium cursor-pointer hover:text-white/60" onClick={() => toggleSort("high24h")}>
                <span className="flex items-center justify-end gap-1">24h High <SortIcon k="high24h" /></span>
              </th>
              <th className="px-4 py-2 text-right text-[10px] text-white/30 font-medium cursor-pointer hover:text-white/60" onClick={() => toggleSort("low24h")}>
                <span className="flex items-center justify-end gap-1">24h Low <SortIcon k="low24h" /></span>
              </th>
              <th className="px-4 py-2 text-right text-[10px] text-white/30 font-medium cursor-pointer hover:text-white/60" onClick={() => toggleSort("volume24h")}>
                <span className="flex items-center justify-end gap-1">Volume <SortIcon k="volume24h" /></span>
              </th>
              <th className="px-4 py-2 text-right text-[10px] text-white/30 font-medium cursor-pointer hover:text-white/60" onClick={() => toggleSort("marketCap")}>
                <span className="flex items-center justify-end gap-1">Mkt Cap <SortIcon k="marketCap" /></span>
              </th>
              <th className="px-4 py-2 text-right text-[10px] text-white/30 font-medium">7D</th>
              <th className="px-4 py-2 text-right text-[10px] text-white/30 font-medium">Trade</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(10)].map((_, i) => (
              <tr key={i} className="border-b border-white/[0.03]">
                {[...Array(10)].map((_, j) => (
                  <td key={j} className="px-4 py-2.5">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-white/25">No assets found</td></tr>
            )}
            {filtered.map((asset, i) => {
              const up = asset.change24h >= 0;
              return (
                <tr key={asset.symbol} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-default">
                  <td className="px-4 py-2.5 font-mono text-white/25">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#4F46E5]/20 border border-[#4F46E5]/30 flex items-center justify-center text-[9px] font-bold text-[#818CF8]">
                        {asset.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-mono font-semibold text-white/90">{asset.symbol}</div>
                        <div className="text-[9px] text-white/30">{asset.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-white/80">${fmtPrice(asset.price)}</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
                    <span className="flex items-center justify-end gap-0.5">
                      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {up ? "+" : ""}{asset.change24h.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-white/50">${fmtPrice(asset.high24h)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-white/50">${fmtPrice(asset.low24h)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-white/50">${fmtVol(asset.volume24h)}M</td>
                  <td className="px-4 py-2.5 text-right font-mono text-white/50">{fmtMcap(asset.marketCap)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end">
                      <SparklineMini data={asset.sparkline} positive={up} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <a href={`/#/trade`}>
                      <button className="text-[10px] px-2.5 py-1 rounded-lg bg-[#4F46E5]/15 border border-[#4F46E5]/25 text-[#818CF8] hover:bg-[#4F46E5]/25 transition-all font-medium">
                        Trade
                      </button>
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── World Map (kept from original) ──────────────────────────────────────────
function WorldMarketMap() {
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleCountryClick(geo: { properties: { name: string }; id: string }) {
    const iso = ISO_3166[geo.id] || geo.id;
    const country = COUNTRY_DATA[iso];
    if (country) {
      setSelectedCountry(country);
      setSheetOpen(true);
    }
  }

  function getCountryColor(geoId: string): string {
    const iso = ISO_3166[geoId] || geoId;
    const change = COUNTRY_DATA[iso]?.change1d ?? getCountryChange(iso);
    if (change > 1.5) return "rgba(16,185,129,0.55)";
    if (change > 0.5) return "rgba(16,185,129,0.3)";
    if (change > 0) return "rgba(16,185,129,0.12)";
    if (change > -0.5) return "rgba(239,68,68,0.12)";
    if (change > -1.5) return "rgba(239,68,68,0.3)";
    return "rgba(239,68,68,0.55)";
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.05]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
        <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">Global Markets</span>
        <div className="ml-auto flex items-center gap-3 text-[9px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500/60 inline-block" />Bullish</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/60 inline-block" />Bearish</span>
        </div>
      </div>
      <div style={{ height: 340 }} className="bg-[#0a0c12]">
        <ComposableMap projectionConfig={{ scale: 145, center: [0, 10] }} style={{ width: "100%", height: "100%" }}>
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const iso = ISO_3166[geo.id] || geo.id;
                  const country = COUNTRY_DATA[iso];
                  const change = country?.change1d ?? getCountryChange(iso);
                  const up = change >= 0;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => handleCountryClick(geo)}
                      style={{
                        default: { fill: getCountryColor(geo.id), stroke: "rgba(255,255,255,0.05)", strokeWidth: 0.5, outline: "none" },
                        hover: { fill: country ? (up ? "rgba(16,185,129,0.75)" : "rgba(239,68,68,0.75)") : "rgba(79,70,229,0.4)", stroke: "rgba(255,255,255,0.2)", strokeWidth: 1, outline: "none", cursor: country ? "pointer" : "default" },
                        pressed: { fill: "rgba(79,70,229,0.6)", outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-80 bg-[#0c0f1a] border-white/[0.08]">
          {selectedCountry && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white flex items-center gap-2">
                  <span className="text-2xl">{selectedCountry.flag}</span>
                  <div>
                    <p className="text-base font-bold">{selectedCountry.name}</p>
                    <p className="text-xs text-white/40 font-normal">{selectedCountry.index} · {selectedCountry.currency}</p>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="glass rounded-xl p-4">
                  <p className="text-xs text-white/40 mb-1">Index Value</p>
                  <p className="font-mono text-2xl font-bold text-white">{selectedCountry.value.toLocaleString()}</p>
                  <p className={`font-mono text-sm mt-1 ${selectedCountry.change1d >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {selectedCountry.change1d >= 0 ? "+" : ""}{selectedCountry.change1d}% today
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass rounded-xl p-3">
                    <p className="text-[10px] text-white/40 mb-1">Market Cap</p>
                    <p className="font-mono text-sm font-semibold text-white/80">{selectedCountry.marketCap}</p>
                  </div>
                  <div className="glass rounded-xl p-3">
                    <p className="text-[10px] text-white/40 mb-1">YTD Return</p>
                    <p className={`font-mono text-sm font-semibold ${selectedCountry.ytd >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {selectedCountry.ytd >= 0 ? "+" : ""}{selectedCountry.ytd}%
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Market Page ──────────────────────────────────────────────────────────────
export default function MarketPage() {
  const { data: marketData } = useQuery<MarketData>({ queryKey: ["/api/market"] });

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-xl text-white/90">Markets</h1>
        <p className="text-sm text-white/35 mt-0.5">Real-time prices across 20 assets</p>
      </div>

      {/* Top stats strip */}
      {marketData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {marketData.tickers.slice(0, 4).map(t => {
            const up = t.change >= 0;
            return (
              <div key={t.symbol} className="glass rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-white/70">{t.symbol}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${up ? "bg-emerald-400" : "bg-red-400"}`} />
                </div>
                <div className="font-mono text-sm font-semibold text-white">${t.price.toLocaleString()}</div>
                <div className={`font-mono text-[10px] ${up ? "text-emerald-400" : "text-red-400"}`}>{up ? "+" : ""}{t.change}%</div>
              </div>
            );
          })}
        </div>
      )}

      {/* World Map */}
      <WorldMarketMap />

      {/* Markets Table */}
      <MarketsTable />
    </div>
  );
}
