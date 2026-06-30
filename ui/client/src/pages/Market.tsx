import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Newspaper, X, TrendingUp as TradeIcon } from "lucide-react";
import { useLocation } from "wouter";
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area
} from "recharts";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Ticker {
  symbol: string;
  name: string;
  price: number;
  change: number;
  category: string;
}

interface SentimentItem {
  market: string;
  label: string;
  value: number;
}

interface NewsItem {
  id: number;
  headline: string;
  source: string;
  time: string;
  sentiment: string;
  agents: string[];
}

interface Region {
  code: string;
  name: string;
  change: number;
  category: string;
}

interface MarketData {
  tickers: Ticker[];
  sentiment: SentimentItem[];
  news: NewsItem[];
  regions: Region[];
}

// ─── Country data ─────────────────────────────────────────────────────────────

interface CountryInfo {
  name: string;
  flag: string;
  index: string;
  value: number;
  change1d: number;
  ytd: number;
  marketCap: string;
  currency: string;
}

// Seeded pseudo-random for consistent colors
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getCountryChange(isoCode: string): number {
  const hash = isoCode.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const r = seededRandom(hash);
  return parseFloat(((r * 6) - 3).toFixed(2)); // -3% to +3%
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
  RUS: { name: "Russia", flag: "🇷🇺", index: "MOEX", value: 3241.50, change1d: -2.11, ytd: -8.4, marketCap: "$0.6T", currency: "RUB" },
  ZAF: { name: "South Africa", flag: "🇿🇦", index: "JSE", value: 73421.00, change1d: 0.54, ytd: 5.3, marketCap: "$0.4T", currency: "ZAR" },
  SAU: { name: "Saudi Arabia", flag: "🇸🇦", index: "Tadawul", value: 12041.30, change1d: 0.77, ytd: 8.9, marketCap: "$2.8T", currency: "SAR" },
  CHE: { name: "Switzerland", flag: "🇨🇭", index: "SMI", value: 11892.40, change1d: -0.18, ytd: 7.2, marketCap: "$1.8T", currency: "CHF" },
  SWE: { name: "Sweden", flag: "🇸🇪", index: "OMX 30", value: 2541.30, change1d: 0.63, ytd: 9.4, marketCap: "$0.7T", currency: "SEK" },
  NLD: { name: "Netherlands", flag: "🇳🇱", index: "AEX", value: 894.20, change1d: -0.34, ytd: 11.8, marketCap: "$1.2T", currency: "EUR" },
  ESP: { name: "Spain", flag: "🇪🇸", index: "IBEX 35", value: 10842.50, change1d: 0.21, ytd: 6.1, marketCap: "$0.8T", currency: "EUR" },
  ITA: { name: "Italy", flag: "🇮🇹", index: "FTSE MIB", value: 33412.80, change1d: -0.64, ytd: 14.2, marketCap: "$0.9T", currency: "EUR" },
  SGP: { name: "Singapore", flag: "🇸🇬", index: "STI", value: 3412.80, change1d: 0.44, ytd: 4.6, marketCap: "$0.6T", currency: "SGD" },
  HKG: { name: "Hong Kong", flag: "🇭🇰", index: "Hang Seng", value: 18412.30, change1d: -0.92, ytd: -3.4, marketCap: "$3.2T", currency: "HKD" },
  TWN: { name: "Taiwan", flag: "🇹🇼", index: "TAIEX", value: 21432.40, change1d: 1.23, ytd: 28.4, marketCap: "$2.1T", currency: "TWD" },
  NOR: { name: "Norway", flag: "🇳🇴", index: "OBX", value: 1241.30, change1d: 0.87, ytd: 5.8, marketCap: "$0.3T", currency: "NOK" },
  POL: { name: "Poland", flag: "🇵🇱", index: "WIG20", value: 2341.80, change1d: -0.33, ytd: 3.2, marketCap: "$0.2T", currency: "PLN" },
  ARG: { name: "Argentina", flag: "🇦🇷", index: "MERVAL", value: 1284120.00, change1d: 2.41, ytd: 142.3, marketCap: "$0.3T", currency: "ARS" },
  IDN: { name: "Indonesia", flag: "🇮🇩", index: "IDX Composite", value: 7412.30, change1d: 0.56, ytd: 4.1, marketCap: "$0.7T", currency: "IDR" },
  TUR: { name: "Turkey", flag: "🇹🇷", index: "BIST 100", value: 9841.20, change1d: -1.42, ytd: 67.4, marketCap: "$0.4T", currency: "TRY" },
  NZL: { name: "New Zealand", flag: "🇳🇿", index: "NZX 50", value: 11842.30, change1d: 0.18, ytd: 2.4, marketCap: "$0.1T", currency: "NZD" },
  BEL: { name: "Belgium", flag: "🇧🇪", index: "BEL 20", value: 3891.40, change1d: -0.27, ytd: 5.7, marketCap: "$0.4T", currency: "EUR" },
};

function getCountryInfo(isoCode: string): CountryInfo | null {
  if (COUNTRY_DATA[isoCode]) return COUNTRY_DATA[isoCode];
  // Generate fallback for unknown countries
  const hash = isoCode.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const change = parseFloat(((seededRandom(hash) * 6) - 3).toFixed(2));
  return null; // skip unknown countries
}

// ─── Generate mock price series ───────────────────────────────────────────────

function generatePriceSeries(baseValue: number, points: number = 30, volatility: number = 0.008) {
  const data = [];
  let price = baseValue * 0.9;
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.48) * volatility;
    price = price * (1 + change);
    data.push({
      day: i + 1,
      price: parseFloat(price.toFixed(2)),
      open: parseFloat((price * (1 - Math.random() * 0.005)).toFixed(2)),
      close: parseFloat(price.toFixed(2)),
      high: parseFloat((price * (1 + Math.random() * 0.007)).toFixed(2)),
      low: parseFloat((price * (1 - Math.random() * 0.007)).toFixed(2)),
    });
  }
  return data;
}

// ─── Country Chart ────────────────────────────────────────────────────────────

function CountryChart({ info }: { info: CountryInfo }) {
  const data = useMemo(() => generatePriceSeries(info.value), [info.index]);
  const isUp = info.change1d >= 0;

  return (
    <ResponsiveContainer width="100%" height={160}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={isUp ? "#10B981" : "#EF4444"} stopOpacity={0.3} />
            <stop offset="95%" stopColor={isUp ? "#10B981" : "#EF4444"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" hide />
        <YAxis domain={["auto", "auto"]} hide />
        <Tooltip
          contentStyle={{
            background: "rgba(8,11,20,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: "11px",
            color: "rgba(255,255,255,0.8)",
          }}
          formatter={(v: number) => [v.toLocaleString(), "Price"]}
          labelFormatter={(l) => `Day ${l}`}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={isUp ? "#10B981" : "#EF4444"}
          strokeWidth={1.5}
          fill="url(#chartGradient)"
          dot={false}
          activeDot={{ r: 3, fill: isUp ? "#10B981" : "#EF4444" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── Country slide-over panel ─────────────────────────────────────────────────

function CountrySheet({
  isoCode,
  open,
  onClose,
}: {
  isoCode: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const info = isoCode ? getCountryInfo(isoCode) : null;

  if (!info) return null;

  const isUp = info.change1d >= 0;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-[380px] sm:w-[420px] bg-[#050508] border-white/[0.08] p-0 overflow-y-auto"
      >
        <SheetHeader className="p-5 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{info.flag}</span>
              <div>
                <SheetTitle className="text-white/90 font-display text-base">
                  {info.name}
                </SheetTitle>
                <p className="text-xs text-white/40 mt-0.5">{info.index}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-white/40"
            >
              <X size={14} />
            </button>
          </div>
        </SheetHeader>

        <div className="p-5 space-y-5">
          {/* Price header */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="font-mono text-2xl font-bold text-white">
                  {info.value.toLocaleString()}
                </p>
                <p className="text-xs text-white/40 mt-0.5">{info.currency}</p>
              </div>
              <div className="text-right">
                <Badge
                  className={`text-xs font-mono font-semibold ${
                    isUp
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                      : "bg-red-500/15 text-red-400 border-red-500/25"
                  }`}
                >
                  {isUp ? "+" : ""}{info.change1d}%
                </Badge>
                <p className="text-[10px] text-white/30 mt-1">1D Change</p>
              </div>
            </div>

            {/* Chart */}
            <CountryChart info={info} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Index Value", value: info.value.toLocaleString() },
              { label: "YTD Return", value: `${info.ytd > 0 ? "+" : ""}${info.ytd}%`, color: info.ytd >= 0 ? "text-emerald-400" : "text-red-400" },
              { label: "Market Cap", value: info.marketCap },
              { label: "Currency", value: info.currency },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass rounded-xl p-3">
                <p className="text-[10px] text-white/35 mb-1">{label}</p>
                <p className={`font-mono text-sm font-semibold ${color || "text-white/80"}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Trade button */}
          <Button
            className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold gap-2"
            onClick={() => {
              onClose();
              navigate("/trade");
            }}
          >
            <TradeIcon size={14} />
            Trade This Market
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Interactive World Map ────────────────────────────────────────────────────

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO numeric to ISO alpha-3 mapping for key countries
const NUM_TO_ALPHA3: Record<string, string> = {
  "840": "USA", "124": "CAN", "826": "GBR", "392": "JPN", "276": "DEU",
  "156": "CHN", "076": "BRA", "356": "IND", "036": "AUS", "250": "FRA",
  "410": "KOR", "484": "MEX", "643": "RUS", "710": "ZAF", "682": "SAU",
  "756": "CHE", "752": "SWE", "528": "NLD", "724": "ESP", "380": "ITA",
  "702": "SGP", "344": "HKG", "158": "TWN", "578": "NOR", "616": "POL",
  "032": "ARG", "360": "IDN", "792": "TUR", "554": "NZL", "056": "BEL",
};

function getColorForChange(change: number): string {
  if (change > 2) return "rgba(16,185,129,0.75)";
  if (change > 1) return "rgba(16,185,129,0.55)";
  if (change > 0) return "rgba(16,185,129,0.35)";
  if (change > -1) return "rgba(239,68,68,0.30)";
  if (change > -2) return "rgba(239,68,68,0.50)";
  return "rgba(239,68,68,0.70)";
}

function InteractiveWorldMap({ onCountryClick }: { onCountryClick: (iso: string) => void }) {
  const [hoveredCountry, setHoveredCountry] = useState<{ iso: string; name: string; change: number; x: number; y: number } | null>(null);

  return (
    <div className="relative w-full overflow-x-auto">
      <ComposableMap
        projectionConfig={{ scale: 147, center: [0, 10] }}
        style={{ width: "100%", height: "auto", minWidth: 320 }}
      >
        <ZoomableGroup zoom={1} minZoom={1} maxZoom={5}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const numId = geo.id?.toString().padStart(3, "0") || "";
                const isoAlpha3 = NUM_TO_ALPHA3[numId] || "";
                const info = isoAlpha3 ? COUNTRY_DATA[isoAlpha3] : null;
                const change = info ? info.change1d : getCountryChange(isoAlpha3 || numId);
                const fillColor = getColorForChange(change);
                const isKnown = !!info;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => {
                      if (isKnown) onCountryClick(isoAlpha3);
                    }}
                    onMouseEnter={(evt) => {
                      const name = geo.properties?.name || "Unknown";
                      const nativeEvt = evt.nativeEvent;
                      const x = nativeEvt.clientX;
                      const y = nativeEvt.clientY;
                      setHoveredCountry({ iso: isoAlpha3, name, change, x, y });
                    }}
                    onMouseLeave={() => setHoveredCountry(null)}
                    style={{
                      default: {
                        fill: isKnown ? fillColor : "rgba(255,255,255,0.06)",
                        stroke: "rgba(255,255,255,0.07)",
                        strokeWidth: 0.5,
                        outline: "none",
                        cursor: isKnown ? "pointer" : "default",
                        transition: "fill 0.2s ease",
                      },
                      hover: {
                        fill: isKnown ? fillColor.replace(/[\d.]+\)$/, "1)") : "rgba(255,255,255,0.12)",
                        stroke: isKnown ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)",
                        strokeWidth: 0.8,
                        outline: "none",
                        cursor: isKnown ? "pointer" : "default",
                      },
                      pressed: {
                        fill: "#4F46E5",
                        outline: "none",
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {hoveredCountry && (
        <div
          className="fixed z-50 pointer-events-none glass rounded-lg px-3 py-2 text-xs"
          style={{ left: hoveredCountry.x + 12, top: hoveredCountry.y - 10 }}
        >
          <p className="font-semibold text-white/90">{hoveredCountry.name}</p>
          {hoveredCountry.iso && COUNTRY_DATA[hoveredCountry.iso] && (
            <>
              <p className="text-white/50 text-[10px]">{COUNTRY_DATA[hoveredCountry.iso].index}</p>
              <p className={`font-mono text-[10px] font-semibold ${hoveredCountry.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {hoveredCountry.change >= 0 ? "+" : ""}{hoveredCountry.change}%
              </p>
            </>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-white/40">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-emerald-500/50" />
          <span>Positive</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-red-500/50" />
          <span>Negative</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-white/10" />
          <span>No data</span>
        </div>
        <span className="ml-auto">Click a country to explore · Scroll to zoom</span>
      </div>
    </div>
  );
}

// ─── Original helper components ───────────────────────────────────────────────

function formatPrice(price: number, symbol: string) {
  if (symbol.includes("/")) return price.toFixed(4);
  if (price > 1000) return `$${price.toLocaleString()}`;
  if (price < 10) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(2)}`;
}

function SentimentMeter({ item }: { item: SentimentItem }) {
  const labelColor =
    item.label === "Greed" ? "text-emerald-400" :
    item.label === "Fear" ? "text-red-400" : "text-amber-400";

  return (
    <div className="glass rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50 font-medium">{item.market}</span>
        <span className={`text-xs font-semibold ${labelColor}`}>{item.label} {item.value}%</span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden bg-white/10">
        <div
          className="absolute h-full rounded-full transition-all"
          style={{
            width: `${item.value}%`,
            background: item.value > 60 ? "#10B981" : item.value > 40 ? "#F59E0B" : "#EF4444",
          }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-white/20">
        <span>Extreme Fear</span>
        <span>Extreme Greed</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketPage() {
  const { data, isLoading } = useQuery<MarketData>({
    queryKey: ["/api/market"],
  });

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleCountryClick = useCallback((iso: string) => {
    setSelectedCountry(iso);
    setSheetOpen(true);
  }, []);

  if (isLoading || !data) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        {[...Array(3)].map((_, i) => <div key={i} className="glass rounded-2xl h-40 animate-pulse" />)}
      </div>
    );
  }

  const gainers = [...data.tickers].filter(t => t.change > 0).sort((a, b) => b.change - a.change).slice(0, 5);
  const losers = [...data.tickers].filter(t => t.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-xl text-white/90">Market Intelligence</h1>
        <p className="text-sm text-white/35 mt-0.5">Global markets, live sentiment, breaking news</p>
      </div>

      {/* Interactive World Map */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-display font-semibold text-sm text-white/60 mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse" />
          Interactive Global Market Map
          <span className="ml-auto text-[10px] text-white/30 font-normal">Click any highlighted country for details</span>
        </h3>
        <InteractiveWorldMap onCountryClick={handleCountryClick} />
      </div>

      {/* Main grid: gainers/losers + sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gainers */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-sm text-emerald-400 mb-3 flex items-center gap-2">
            <TrendingUp size={14} />
            Top Gainers
          </h3>
          <div className="space-y-2">
            {gainers.map((t) => (
              <div
                key={t.symbol}
                className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0"
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-white/80">{t.symbol}</p>
                  <p className="text-[10px] text-white/30">{t.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-white/60">{formatPrice(t.price, t.symbol)}</p>
                  <p className="font-mono text-xs text-emerald-400 font-medium">+{t.change}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Losers */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-sm text-red-400 mb-3 flex items-center gap-2">
            <TrendingDown size={14} />
            Top Losers
          </h3>
          <div className="space-y-2">
            {losers.map((t) => (
              <div
                key={t.symbol}
                className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0"
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-white/80">{t.symbol}</p>
                  <p className="text-[10px] text-white/30">{t.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-white/60">{formatPrice(t.price, t.symbol)}</p>
                  <p className="font-mono text-xs text-red-400 font-medium">{t.change}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment */}
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-white/60">Market Sentiment</h3>
          {data.sentiment.map((item) => (
            <SentimentMeter key={item.market} item={item} />
          ))}
        </div>
      </div>

      {/* News Feed */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.05]">
          <Newspaper size={14} className="text-white/40" />
          <h3 className="font-display font-semibold text-sm text-white/70">Live Intelligence Feed</h3>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-[#06B6D4]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse" />
            LIVE
          </div>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {data.news.map((item) => (
            <div
              key={item.id}
              className="px-5 py-4 hover:bg-white/[0.02] transition-colors flex items-start gap-4"
              data-testid={`news-item-${item.id}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                item.sentiment === "bullish" ? "bg-emerald-400" : "bg-red-400"
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/75 leading-snug">{item.headline}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-white/30">{item.source}</span>
                  <span className="text-[10px] text-white/20">·</span>
                  <span className="text-[10px] text-white/25">{item.time}</span>
                  {item.agents.length > 0 && (
                    <>
                      <span className="text-[10px] text-white/20">·</span>
                      <span className="text-[10px] text-[#4F46E5]/80">
                        Reacting: {item.agents.join(", ")}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className={`text-[9px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                item.sentiment === "bullish"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>
                {item.sentiment === "bullish" ? "↑ Bullish" : "↓ Bearish"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Country detail sheet */}
      <CountrySheet
        isoCode={selectedCountry}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
