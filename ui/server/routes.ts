import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertUserSettingSchema } from "@shared/schema";
import crypto from "crypto";
import rateLimit from "express-rate-limit";

// ─── XSS Sanitizer ───────────────────────────────────────────────────────────
function sanitize(str: string): string {
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// ─── In-memory price cache ────────────────────────────────────────────────────
interface PriceCache {
  data: Record<string, unknown>;
  fetchedAt: number;
}
let priceCache: PriceCache | null = null;
let forexCache: PriceCache | null = null;
const PRICE_CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Mock fallback data (used when CoinGecko is unavailable)
const MOCK_PRICES: Record<string, { usd: number; cad: number; change24h: number }> = {
  BTC: { usd: 95000, cad: 129200, change24h: 2.3 },
  ETH: { usd: 3200, cad: 4352, change24h: 1.8 },
  SOL: { usd: 175, cad: 238, change24h: 4.1 },
  BNB: { usd: 580, cad: 788, change24h: 0.9 },
  MATIC: { usd: 0.72, cad: 0.98, change24h: -0.5 },
};

const MOCK_FOREX: Record<string, number> = {
  "CAD/USD": 0.735,
  "EUR/USD": 1.085,
  "GBP/USD": 1.272,
  "JPY/USD": 0.0065,
};

// ─── Lightweight JWT-like token helpers (HMAC-SHA256, no external lib) ────────
// Use env vars in production; fall back to a randomly-seeded default in dev/sandbox.
// The fallback is generated at process start so it changes on each restart (invalidates old JWTs on redeploy — acceptable for a prototype).
const _devFallback = () => require("crypto").randomBytes(32).toString("hex");
const JWT_SECRET: string = process.env.JWT_SECRET || _devFallback();
const CEO_JWT_SECRET: string = process.env.CEO_JWT_SECRET || _devFallback();
if (!process.env.JWT_SECRET) console.warn("[WARN] JWT_SECRET not set — using ephemeral secret. Set JWT_SECRET in production.");

function signToken(payload: object, secret: string = JWT_SECRET!): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyToken(token: string, secret: string = JWT_SECRET!): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    if (expected !== sig) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Record<string, unknown>;
    if (typeof payload.exp === "number" && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

function generateHex(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

// CEO lockout tracking (in-memory; use Redis/DB in production)
const ceoFailedAttempts: Map<string, { count: number; lockedUntil: number }> = new Map();

function getCeoAttempts(ip: string) {
  return ceoFailedAttempts.get(ip) || { count: 0, lockedUntil: 0 };
}

function recordCeoFailure(ip: string) {
  const cur = getCeoAttempts(ip);
  const count = cur.count + 1;
  ceoFailedAttempts.set(ip, {
    count,
    lockedUntil: count >= 3 ? Date.now() + 5 * 60 * 1000 : cur.lockedUntil,
  });
}

function resetCeoAttempts(ip: string) {
  ceoFailedAttempts.delete(ip);
}

// CEO JWT middleware
function requireCeoAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const payload = verifyToken(auth.slice(7), CEO_JWT_SECRET);
  if (!payload || payload.role !== "ceo") {
    return res.status(401).json({ error: "Invalid CEO token" });
  }
  next();
}

export function registerRoutes(httpServer: Server, app: Express) {
  // ─── Rate Limiting ────────────────────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });
  const strictLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests on this endpoint." },
  });
  app.use("/api/", limiter);
  app.use("/api/auth/", strictLimiter);
  app.use("/api/ceo/", strictLimiter);

  // ─── GET /api/prices — real crypto prices (CoinGecko, 60s cache) ─────────────
  app.get("/api/prices", async (_req, res) => {
    const now = Date.now();
    if (priceCache && now - priceCache.fetchedAt < PRICE_CACHE_TTL_MS) {
      return res.json(priceCache.data);
    }
    try {
      const url =
        "https://api.coingecko.com/api/v3/simple/price" +
        "?ids=bitcoin,ethereum,solana,binancecoin,matic-network" +
        "&vs_currencies=usd,cad" +
        "&include_24hr_change=true";
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`CoinGecko HTTP ${response.status}`);
      const raw = (await response.json()) as Record<string, Record<string, number>>;
      const idToSymbol: Record<string, string> = {
        bitcoin: "BTC", ethereum: "ETH", solana: "SOL",
        binancecoin: "BNB", "matic-network": "MATIC",
      };
      const prices: Record<string, { usd: number; cad: number; change24h: number }> = {};
      for (const [id, data] of Object.entries(raw)) {
        const symbol = idToSymbol[id];
        if (symbol) {
          prices[symbol] = {
            usd: data["usd"] ?? 0,
            cad: data["cad"] ?? 0,
            change24h: Math.round((data["usd_24h_change"] ?? 0) * 100) / 100,
          };
        }
      }
      const out = { prices, fetchedAt: new Date().toISOString(), source: "coingecko" };
      priceCache = { data: out, fetchedAt: now };
      return res.json(out);
    } catch (err) {
      const fallback = {
        prices: MOCK_PRICES,
        fetchedAt: new Date().toISOString(),
        source: "mock",
        error: String(err instanceof Error ? err.message : err),
      };
      priceCache = { data: fallback, fetchedAt: now };
      return res.json(fallback);
    }
  });

  // ─── GET /api/market/live — combined crypto + forex ───────────────────────────
  app.get("/api/market/live", async (_req, res) => {
    const now = Date.now();

    // Crypto prices
    let cryptoData: Record<string, { usd: number; cad: number; change24h: number }> = { ...MOCK_PRICES };
    let cryptoSource = "mock";
    if (priceCache && now - priceCache.fetchedAt < PRICE_CACHE_TTL_MS) {
      const c = priceCache.data as { prices: typeof MOCK_PRICES; source: string };
      cryptoData = c.prices;
      cryptoSource = c.source;
    } else {
      try {
        const url =
          "https://api.coingecko.com/api/v3/simple/price" +
          "?ids=bitcoin,ethereum,solana,binancecoin,matic-network" +
          "&vs_currencies=usd,cad&include_24hr_change=true";
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const raw = (await response.json()) as Record<string, Record<string, number>>;
          const idToSymbol: Record<string, string> = {
            bitcoin: "BTC", ethereum: "ETH", solana: "SOL",
            binancecoin: "BNB", "matic-network": "MATIC",
          };
          for (const [id, data] of Object.entries(raw)) {
            const sym = idToSymbol[id];
            if (sym) {
              cryptoData[sym] = {
                usd: data["usd"] ?? 0,
                cad: data["cad"] ?? 0,
                change24h: Math.round((data["usd_24h_change"] ?? 0) * 100) / 100,
              };
            }
          }
          cryptoSource = "coingecko";
          priceCache = {
            data: { prices: cryptoData, fetchedAt: new Date().toISOString(), source: cryptoSource },
            fetchedAt: now,
          };
        }
      } catch { /* use mock */ }
    }

    // Forex from Frankfurter
    let forexData: Record<string, number> = { ...MOCK_FOREX };
    let forexSource = "mock";
    if (forexCache && now - forexCache.fetchedAt < PRICE_CACHE_TTL_MS) {
      forexData = forexCache.data as Record<string, number>;
      forexSource = "frankfurter";
    } else {
      try {
        const fxRes = await fetch(
          "https://api.frankfurter.app/latest?from=USD&to=CAD,EUR,GBP,JPY",
          { signal: AbortSignal.timeout(5000) }
        );
        if (fxRes.ok) {
          const fxRaw = (await fxRes.json()) as { rates: Record<string, number> };
          const r = fxRaw.rates;
          forexData = {
            "CAD/USD": r["CAD"] ? Math.round((1 / r["CAD"]) * 10000) / 10000 : MOCK_FOREX["CAD/USD"],
            "EUR/USD": r["EUR"] ? Math.round((1 / r["EUR"]) * 10000) / 10000 : MOCK_FOREX["EUR/USD"],
            "GBP/USD": r["GBP"] ? Math.round((1 / r["GBP"]) * 10000) / 10000 : MOCK_FOREX["GBP/USD"],
            "JPY/USD": r["JPY"] ? Math.round((1 / r["JPY"]) * 100000) / 100000 : MOCK_FOREX["JPY/USD"],
          };
          forexSource = "frankfurter";
          forexCache = { data: forexData, fetchedAt: now };
        }
      } catch { /* use mock */ }
    }

    return res.json({
      crypto: cryptoData,
      forex: forexData,
      fetchedAt: new Date().toISOString(),
      sources: { crypto: cryptoSource, forex: forexSource },
    });
  });

  // GET /api/agents
  app.get("/api/agents", (_req, res) => {
    const data = storage.getAgents();
    res.json(data);
  });

  // GET /api/agents/:id
  app.get("/api/agents/:id", (req, res) => {
    const agent = storage.getAgent(Number(req.params.id));
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  });

  // PATCH /api/agents/:id/copy-trade  [auth required]
  app.patch("/api/agents/:id/copy-trade", (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    if (!verifyToken(auth.slice(7))) return res.status(401).json({ error: "Invalid token" });
    const { enabled } = req.body;
    const agent = storage.updateAgentCopyTrade(Number(req.params.id), Boolean(enabled));
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  });

  // GET /api/agents/:id/messages
  app.get("/api/agents/:id/messages", (req, res) => {
    const msgs = storage.getMessages(Number(req.params.id));
    res.json(msgs);
  });

  // POST /api/agents/:id/messages  [XSS-sanitized]
  app.post("/api/agents/:id/messages", (req, res) => {
    const agentId = Number(req.params.id);
    // XSS fix: sanitize and truncate the content field before parsing/storing
    const content = sanitize(String(req.body.content || "").slice(0, 2000));
    const body = insertMessageSchema.parse({ ...req.body, content, agentId });
    const msg = storage.insertMessage(body);
    res.json(msg);
  });

  // GET /api/trades
  app.get("/api/trades", (_req, res) => {
    const data = storage.getTrades();
    res.json(data);
  });

  // GET /api/settings
  app.get("/api/settings", (_req, res) => {
    const data = storage.getSettings();
    const obj: Record<string, string> = {};
    for (const s of data) obj[s.key] = s.value;
    res.json(obj);
  });

  // PATCH /api/settings
  // Allowlist of writable setting keys — prevents arbitrary DB writes from unauthenticated callers.
  const ALLOWED_SETTING_KEYS = new Set([
    "theme", "notifications", "riskLevel", "maxPositionSize",
    "stopLossPercent", "takeProfitPercent", "currency", "language",
    "timezone", "autoRefresh", "soundEnabled",
    "notificationsEnabled", "pushNotificationsEnabled",
    "howItWorksCollapsed",
  ]);

  app.patch("/api/settings", (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    if (!verifyToken(auth.slice(7))) return res.status(401).json({ error: "Invalid token" });
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ error: "key and value required" });
    if (!ALLOWED_SETTING_KEYS.has(key)) return res.status(400).json({ error: "Invalid setting key" });
    const setting = storage.upsertSetting(key, String(value));
    res.json(setting);
  });

  // GET /api/portfolio — aggregated portfolio data
  app.get("/api/portfolio", (_req, res) => {
    const allAgents = storage.getAgents();
    const totalPnl = allAgents.reduce((sum, a) => sum + a.pnl, 0);
    const copyAgents = allAgents.filter((a) => a.copyTradeEnabled === 1);

    // 30-day performance data (simulated)
    const performance = Array.from({ length: 30 }, (_, i) => {
      const base = 42000;
      const growth = i * 200 + Math.sin(i * 0.5) * 800;
      return {
        day: i + 1,
        value: Math.round(base + growth),
      };
    });

    // allocation
    const allocation = [
      { name: "Stocks", value: 40 },
      { name: "Crypto", value: 35 },
      { name: "Forex", value: 15 },
      { name: "Bonds", value: 7 },
      { name: "Commodities", value: 3 },
    ];

    res.json({
      totalValue: 47823,
      dayChange: 1234,
      dayChangePercent: 2.6,
      totalPnl,
      copyAgentCount: copyAgents.length,
      estimatedCut: 892,
      agents: allAgents,
      performance,
      allocation,
    });
  });

  // GET /api/market — market pulse data
  app.get("/api/market", (_req, res) => {
    const tickers = [
      { symbol: "BTC", name: "Bitcoin", price: 67234, change: 2.3, category: "Crypto" },
      { symbol: "ETH", name: "Ethereum", price: 3891, change: 1.8, category: "Crypto" },
      { symbol: "SOL", name: "Solana", price: 168.42, change: 4.2, category: "Crypto" },
      { symbol: "AAPL", name: "Apple", price: 189.44, change: 0.9, category: "Stocks" },
      { symbol: "NVDA", name: "NVIDIA", price: 487.22, change: 2.1, category: "Stocks" },
      { symbol: "TSLA", name: "Tesla", price: 248.73, change: -1.4, category: "Stocks" },
      { symbol: "MSFT", name: "Microsoft", price: 415.27, change: 0.6, category: "Stocks" },
      { symbol: "EUR/USD", name: "Euro/Dollar", price: 1.0823, change: -0.1, category: "Forex" },
      { symbol: "GBP/USD", name: "Pound/Dollar", price: 1.2734, change: 0.2, category: "Forex" },
      { symbol: "Gold", name: "Gold", price: 2341, change: 0.7, category: "Commodities" },
      { symbol: "WTI", name: "Crude Oil", price: 77.45, change: -0.8, category: "Commodities" },
      { symbol: "S&P500", name: "S&P 500", price: 5234, change: 1.2, category: "Indices" },
    ];

    const sentiment = [
      { market: "Crypto", label: "Greed", value: 78 },
      { market: "Stocks", label: "Neutral", value: 52 },
      { market: "Forex", label: "Fear", value: 34 },
      { market: "Commodities", label: "Neutral", value: 55 },
      { market: "Bonds", label: "Fear", value: 30 },
    ];

    const news = [
      { id: 1, headline: "Fed signals potential rate cut in September amid cooling inflation", source: "Bloomberg", time: "2m ago", sentiment: "bullish", agents: ["Luna", "Echo"] },
      { id: 2, headline: "NVIDIA surpasses $1T market cap on AI chip demand surge", source: "Reuters", time: "8m ago", sentiment: "bullish", agents: ["Cipher"] },
      { id: 3, headline: "Bitcoin ETF sees record $1.2B daily inflow", source: "CoinDesk", time: "15m ago", sentiment: "bullish", agents: ["Shadow"] },
      { id: 4, headline: "EUR/USD faces pressure as ECB holds rates steady", source: "FX Street", time: "22m ago", sentiment: "bearish", agents: ["Pixel"] },
      { id: 5, headline: "Gold hits 3-month high as dollar weakens", source: "Kitco", time: "31m ago", sentiment: "bullish", agents: ["Blaze"] },
      { id: 6, headline: "S&P 500 extends winning streak to 8 sessions", source: "MarketWatch", time: "45m ago", sentiment: "bullish", agents: ["Luna", "Cipher"] },
    ];

    const regions = [
      { code: "US", name: "United States", change: 1.8, category: "Stocks" },
      { code: "CN", name: "China", change: -0.4, category: "Stocks" },
      { code: "JP", name: "Japan", change: 0.9, category: "Stocks" },
      { code: "DE", name: "Germany", change: 0.3, category: "Stocks" },
      { code: "GB", name: "UK", change: 0.7, category: "Stocks" },
      { code: "FR", name: "France", change: 0.5, category: "Stocks" },
      { code: "IN", name: "India", change: 2.1, category: "Stocks" },
      { code: "BR", name: "Brazil", change: -1.2, category: "Stocks" },
      { code: "AU", name: "Australia", change: 0.4, category: "Stocks" },
      { code: "CA", name: "Canada", change: 1.1, category: "Stocks" },
      { code: "KR", name: "South Korea", change: 1.5, category: "Stocks" },
      { code: "RU", name: "Russia", change: -2.3, category: "Stocks" },
    ];

    res.json({ tickers, sentiment, news, regions });
  });

  // ────────────────── AUTH ENDPOINTS ─────────────────────────────────────

  // POST /api/auth/qr-token — generate a one-time QR login token
  app.post("/api/auth/qr-token", (_req, res) => {
    storage.cleanExpiredTokens();
    const token = generateHex(16); // 32-char hex
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 min
    const qrData = `homeforai://auth?token=${token}&expires=${expiresAt}`;
    storage.createAuthToken({ token, expiresAt, used: 0 });
    res.json({ token, qrData, expiresAt });
  });

  // POST /api/auth/email — send magic link (mock, no real email)
  app.post("/api/auth/email", (req, res) => {
    const { email } = req.body as { email: string };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    // Generate a magic-link token
    const token = generateHex(16);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min
    storage.createAuthToken({ token, email, expiresAt, used: 0 });
    // TODO: Replace with real email delivery (SendGrid, Resend, AWS SES, etc.)
    res.json({ success: true, message: "Magic link sent. Check your email." }); // token NOT returned — use /api/auth/verify with the link
  });

  // POST /api/auth/verify — verify a magic-link / QR token
  app.post("/api/auth/verify", (req, res) => {
    const { token } = req.body as { token: string };
    if (!token) return res.status(400).json({ error: "Token required" });
    const record = storage.getAuthToken(token);
    if (!record) return res.status(401).json({ error: "Invalid token" });
    if (record.used) return res.status(401).json({ error: "Token already used" });
    if (record.expiresAt < Date.now()) return res.status(401).json({ error: "Token expired" });
    storage.markTokenUsed(token);

    // Find or auto-create user
    let user = record.email ? storage.getUserByEmail(record.email) : undefined;
    if (!user && record.email) {
      user = storage.createUser({
        email: record.email,
        username: record.email.split("@")[0],
        agentId: "luna",
        riskProfile: "balanced",
        createdAt: Date.now(),
        kycStatus: "unverified",
      });
    }
    if (!user) return res.status(401).json({ error: "No user associated with this token" });

    const jwt = signToken({ sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 86400 * 7 });
    res.json({ success: true, token: jwt, user: { id: user.id, email: user.email, username: user.username, agentId: user.agentId, riskProfile: user.riskProfile } });
  });

  // POST /api/auth/register — create new user account
  app.post("/api/auth/register", (req, res) => {
    const { email, username, agentId, riskProfile } = req.body as {
      email: string; username: string; agentId: string; riskProfile: string;
    };
    if (!email || !username) return res.status(400).json({ error: "email and username required" });
    const existing = storage.getUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already registered" });
    const user = storage.createUser({
      email,
      username,
      agentId: agentId || "luna",
      riskProfile: riskProfile || "balanced",
      createdAt: Date.now(),
      kycStatus: "unverified",
    });
    const jwt = signToken({ sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 86400 * 7 });
    res.json({ success: true, token: jwt, user: { id: user.id, email: user.email, username: user.username, agentId: user.agentId, riskProfile: user.riskProfile } });
  });

  // GET /api/auth/me — return current user from JWT
  app.get("/api/auth/me", (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const payload = verifyToken(auth.slice(7));
    if (!payload) return res.status(401).json({ error: "Invalid or expired token" });
    const user = storage.getUserById(payload.sub as number);
    if (!user) return res.status(401).json({ error: "User not found" });
    res.json({ id: user.id, email: user.email, username: user.username, agentId: user.agentId, riskProfile: user.riskProfile, kycStatus: user.kycStatus });
  });

  // POST /api/auth/kyc — update KYC status
  app.post("/api/auth/kyc", (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const payload = verifyToken(auth.slice(7));
    if (!payload) return res.status(401).json({ error: "Invalid or expired token" });
    storage.updateUserKyc(payload.sub as number, "pending");
    res.json({ success: true, kycStatus: "pending" });
  });

  // ────────────────── CEO ENDPOINTS ──────────────────────────────────────

  // POST /api/ceo/login — password + 2FA, returns CEO JWT
  // NOTE: CEO: Change password immediately via /ceo/change-password before production
  app.post("/api/ceo/login", (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const { password, twoFaCode } = req.body as { password: string; twoFaCode: string };

    // Check lockout — after 3 failures show "Page not found" per spec
    const attempts = getCeoAttempts(ip);
    if (attempts.count >= 3 && attempts.lockedUntil > Date.now()) {
      // Do NOT reveal lockout message; return 404 to obscure existence
      return res.status(404).json({ error: "Not found" });
    }

    if (!password) {
      recordCeoFailure(ip);
      return res.status(404).json({ error: "Not found" });
    }

    // Verify password hash
    const hashRecord = storage.getCeoSetting("ceo_password_hash");
    if (!hashRecord) return res.status(500).json({ error: "Configuration error" });

    // Compare hash using stored salt — see note in storage.ts about upgrading to bcrypt
    const saltRecord = storage.getCeoSetting("ceo_salt");
    const salt = saltRecord?.value || "homeforai_ceo_salt_2026";
    const inputHash = crypto
      .createHash("sha256")
      .update(password + salt)
      .digest("hex");

    if (inputHash !== hashRecord.value) {
      recordCeoFailure(ip);
      const cur = getCeoAttempts(ip);
      if (cur.count >= 3) {
        return res.status(404).json({ error: "Not found" });
      }
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify 2FA code
    const codeRecord = storage.getCeoSetting("ceo_2fa_code");
    // TODO: Replace with Twilio SMS / AWS SNS OTP in production
    if (!codeRecord || twoFaCode !== codeRecord.value) {
      return res.status(401).json({ error: "Invalid 2FA code" });
    }

    resetCeoAttempts(ip);
    const token = signToken(
      { role: "ceo", exp: Math.floor(Date.now() / 1000) + 3600 * 8 }, // 8h session
      CEO_JWT_SECRET
    );
    res.json({ success: true, token });
  });

  // GET /api/ceo/stats — revenue stats (CEO JWT required)
  app.get("/api/ceo/stats", requireCeoAuth, (_req, res) => {
    const revenue = storage.getPlatformRevenue();
    const allTime = revenue.reduce((s, r) => s + r.amount, 0);

    const today = new Date().toISOString().split("T")[0];
    const todayRev = revenue.filter(r => r.date === today).reduce((s, r) => s + r.amount, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekRev = revenue
      .filter(r => r.date >= weekStart.toISOString().split("T")[0])
      .reduce((s, r) => s + r.amount, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    const monthRev = revenue
      .filter(r => r.date >= monthStart.toISOString().split("T")[0])
      .reduce((s, r) => s + r.amount, 0);

    const allAgents = storage.getAgents();
    const users = storage.getAllUsers();

    res.json({
      revenue: {
        allTime: Math.round(allTime * 100) / 100,
        today: Math.round(todayRev * 100) / 100,
        thisWeek: Math.round(weekRev * 100) / 100,
        thisMonth: Math.round(monthRev * 100) / 100,
        dailySeries: revenue.map(r => ({ date: r.date, amount: r.amount })),
      },
      users: {
        total: users.length,
        activeToday: Math.min(users.length, 3), // mock
        newThisWeek: Math.min(users.length, 1), // mock
      },
      agents: {
        total: allAgents.length,
        trading: allAgents.filter(a => a.status === "TRADING").length,
      },
    });
  });

  // GET /api/ceo/users — full user list (CEO JWT required)
  app.get("/api/ceo/users", requireCeoAuth, (_req, res) => {
    const allUsers = storage.getAllUsers();
    // Return sanitized list (no password hashes)
    const result = allUsers.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      agentId: u.agentId,
      riskProfile: u.riskProfile,
      joinedAt: new Date(u.createdAt).toISOString(),
      kycStatus: u.kycStatus,
      // Mock financials
      totalDeposited: 1000 + Math.floor(Math.random() * 9000),
      totalProfitGenerated: 50 + Math.floor(Math.random() * 2000),
      platformFeePaid: Math.floor(Math.random() * 300),
    }));
    res.json(result);
  });

  // GET /api/ceo/health — platform health
  app.get("/api/ceo/health", requireCeoAuth, (_req, res) => {
    const allAgents = storage.getAgents();
    const emergencyStop = storage.getCeoSetting("emergency_stop");

    res.json({
      uptime: "99.97%",
      apiLatency: "42ms",
      dbSize: "1.2MB",
      emergencyStop: emergencyStop?.value === "true",
      agents: allAgents.map(a => ({
        id: a.id,
        name: a.name,
        emoji: a.emoji,
        status: a.status,
        tradesToday: Math.floor(Math.random() * 12),
        winRate: a.winRate,
        totalProfitGenerated: a.totalReturn,
      })),
      copyTrade: {
        activeCopies: allAgents.filter(a => a.copyTradeEnabled).length,
        volumeToday: Math.floor(Math.random() * 50000) + 10000,
      },
    });
  });

  // POST /api/ceo/emergency-stop — kill switch (CEO JWT required)
  app.post("/api/ceo/emergency-stop", requireCeoAuth, (req, res) => {
    const { stop } = req.body as { stop: boolean };
    storage.upsertCeoSetting("emergency_stop", stop ? "true" : "false");
    res.json({ success: true, emergencyStop: stop });
  });

  // GET /api/ceo/settings — get CEO settings (CEO JWT required)
  app.get("/api/ceo/settings", requireCeoAuth, (_req, res) => {
    const all = storage.getAllCeoSettings();
    const obj: Record<string, string> = {};
    for (const s of all) {
      if (s.key !== "ceo_password_hash" && s.key !== "ceo_2fa_code") {
        obj[s.key] = s.value;
      }
    }
    res.json(obj);
  });

  // PATCH /api/ceo/settings — update CEO settings (CEO JWT required)
  app.patch("/api/ceo/settings", requireCeoAuth, (req, res) => {
    const { key, value } = req.body as { key: string; value: string };
    const ALLOWED = new Set(["payout_wallet", "payout_schedule", "payout_threshold", "emergency_stop"]);
    if (!ALLOWED.has(key)) return res.status(400).json({ error: "Invalid key" });
    storage.upsertCeoSetting(key, value);
    res.json({ success: true });
  });

  // POST /api/ceo/broadcast — broadcast message to all users (CEO JWT required)
  app.post("/api/ceo/broadcast", requireCeoAuth, (req, res) => {
    const { message } = req.body as { message: string };
    if (!message) return res.status(400).json({ error: "Message required" });
    // TODO: Replace with real push notification / email system
    // For now, store in settings as latest broadcast
    storage.upsertSetting("lastBroadcast" as any, message);
    res.json({ success: true, recipients: storage.getAllUsers().length });
  });

  // ────────────────── MARKET DATA ENDPOINTS ──────────────────────────────────

  // GET /api/market/assets — returns all 20 assets with full market data
  app.get("/api/market/assets", (_req, res) => {
    const seed = Math.floor(Date.now() / (1000 * 60 * 5)); // refreshes every 5 min
    const rng = (n: number, min: number, max: number) => {
      const x = Math.abs(Math.sin(seed * 9301 + n * 49297 + 233)) % 1;
      return min + x * (max - min);
    };

    const ASSET_DATA = [
      { symbol: "BTC",  name: "Bitcoin",       basePrice: 67000,     mcap: 1320000, vol: 42800 },
      { symbol: "ETH",  name: "Ethereum",      basePrice: 3400,      mcap: 408000,  vol: 18400 },
      { symbol: "BNB",  name: "BNB",           basePrice: 610,       mcap: 91000,   vol: 1800  },
      { symbol: "SOL",  name: "Solana",        basePrice: 187,       mcap: 82000,   vol: 4100  },
      { symbol: "ADA",  name: "Cardano",       basePrice: 0.48,      mcap: 17000,   vol: 890   },
      { symbol: "DOT",  name: "Polkadot",      basePrice: 7.2,       mcap: 10000,   vol: 420   },
      { symbol: "AVAX", name: "Avalanche",     basePrice: 38,        mcap: 15600,   vol: 780   },
      { symbol: "MATIC",name: "Polygon",       basePrice: 0.72,      mcap: 6800,    vol: 330   },
      { symbol: "LINK", name: "Chainlink",     basePrice: 14.5,      mcap: 8500,    vol: 520   },
      { symbol: "UNI",  name: "Uniswap",       basePrice: 9.8,       mcap: 5900,    vol: 280   },
      { symbol: "ATOM", name: "Cosmos",        basePrice: 8.4,       mcap: 3200,    vol: 190   },
      { symbol: "XRP",  name: "XRP",           basePrice: 0.62,      mcap: 34000,   vol: 2900  },
      { symbol: "DOGE", name: "Dogecoin",      basePrice: 0.184,     mcap: 26000,   vol: 1400  },
      { symbol: "SHIB", name: "Shiba Inu",     basePrice: 0.0000245, mcap: 14400,   vol: 820   },
      { symbol: "LTC",  name: "Litecoin",      basePrice: 82,        mcap: 6100,    vol: 380   },
      { symbol: "BCH",  name: "Bitcoin Cash",  basePrice: 390,       mcap: 7700,    vol: 320   },
      { symbol: "XLM",  name: "Stellar",       basePrice: 0.11,      mcap: 3200,    vol: 210   },
      { symbol: "ALGO", name: "Algorand",      basePrice: 0.19,      mcap: 1600,    vol: 140   },
      { symbol: "VET",  name: "VeChain",       basePrice: 0.028,     mcap: 2000,    vol: 180   },
      { symbol: "FIL",  name: "Filecoin",      basePrice: 5.8,       mcap: 3100,    vol: 220   },
    ];

    const assets = ASSET_DATA.map((a, i) => {
      const change24h = rng(i, -8, 8);
      const priceVariation = 1 + rng(i + 100, -0.02, 0.02);
      const price = a.basePrice * priceVariation;
      const high24h = price * (1 + Math.abs(rng(i + 200, 0.005, 0.04)));
      const low24h = price * (1 - Math.abs(rng(i + 300, 0.005, 0.04)));
      const sparkline: number[] = [];
      let sp = price * (1 - change24h / 100);
      for (let j = 0; j < 7; j++) {
        sp = sp * (1 + rng(i * 7 + j + 1000, -0.015, 0.015));
        sparkline.push(Math.round(sp * 10000) / 10000);
      }
      sparkline.push(Math.round(price * 10000) / 10000);
      return {
        symbol: a.symbol,
        name: a.name,
        price: Math.round(price * 10000) / 10000,
        change24h: Math.round(change24h * 100) / 100,
        high24h: Math.round(high24h * 10000) / 10000,
        low24h: Math.round(low24h * 10000) / 10000,
        volume24h: Math.round(a.vol * (0.9 + rng(i + 400, 0, 0.2))),
        marketCap: Math.round(a.mcap * (0.98 + rng(i + 500, 0, 0.04))),
        sparkline,
        category: "Crypto",
      };
    });

    res.json(assets);
  });

  // GET /api/trade/candles?symbol=BTC&timeframe=1h — 100 OHLC candles
  app.get("/api/trade/candles", (req, res) => {
    const symbol = String(req.query.symbol || "BTC");
    const timeframe = String(req.query.timeframe || "1h");

    const basePrices: Record<string, number> = {
      BTC: 67000, ETH: 3400, BNB: 610, SOL: 187, ADA: 0.48, XRP: 0.62, DOGE: 0.184,
    };
    const basePrice = basePrices[symbol] || 67000;

    const timeframeMs: Record<string, number> = {
      "1m": 60000, "5m": 300000, "15m": 900000,
      "1h": 3600000, "4h": 14400000, "1D": 86400000,
    };
    const intervalMs = timeframeMs[timeframe] || 3600000;
    const now = Date.now();
    const seed = Math.floor(now / 3600000);
    const symbolSeed = symbol.split("").reduce((s, c) => s + c.charCodeAt(0), 0);

    const candles = [];
    let price = basePrice * 0.92; // start 8% lower
    for (let i = 99; i >= 0; i--) {
      const t = now - i * intervalMs;
      const k = seed + symbolSeed + i;
      const change = (Math.sin(k * 0.3) * 0.012 + Math.cos(k * 0.7) * 0.008) * basePrice;
      const open = price;
      const noise1 = Math.abs(Math.sin(k * 1.3) * 0.008) * basePrice;
      const noise2 = Math.abs(Math.cos(k * 1.7) * 0.008) * basePrice;
      const close = open + change;
      const high = Math.max(open, close) + noise1;
      const low = Math.min(open, close) - noise2;
      const volume = Math.abs(Math.sin(k * 2.1) * 500 + 200);
      candles.push({
        time: t,
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: Math.round(volume * 100) / 100,
      });
      price = close;
    }

    res.json(candles);
  });

  // GET /api/trade/depth?symbol=BTC — bid/ask depth data
  app.get("/api/trade/depth", (req, res) => {
    const symbol = String(req.query.symbol || "BTC");
    const basePrices: Record<string, number> = {
      BTC: 67000, ETH: 3400, BNB: 610, SOL: 187, ADA: 0.48, XRP: 0.62, DOGE: 0.184,
    };
    const mid = basePrices[symbol] || 67000;
    const spread = mid * 0.0002;

    const bids: { price: number; amount: number; total: number }[] = [];
    const asks: { price: number; amount: number; total: number }[] = [];
    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 0; i < 50; i++) {
      const bidPrice = mid - spread - i * mid * 0.0004;
      const amount = Math.abs(Math.sin((i + 1) * 0.8) * 3 + 0.5);
      bidTotal += amount;
      bids.push({
        price: Math.round(bidPrice * 100) / 100,
        amount: Math.round(amount * 1000) / 1000,
        total: Math.round(bidTotal * 1000) / 1000,
      });

      const askPrice = mid + spread + i * mid * 0.0004;
      const askAmount = Math.abs(Math.cos((i + 1) * 0.9) * 2.5 + 0.8);
      askTotal += askAmount;
      asks.push({
        price: Math.round(askPrice * 100) / 100,
        amount: Math.round(askAmount * 1000) / 1000,
        total: Math.round(askTotal * 1000) / 1000,
      });
    }

    res.json({ bids, asks, mid: Math.round(mid * 100) / 100, spread: Math.round(spread * 100) / 100 });
  });

  // GET /api/trade/recent?symbol=BTC — last 30 trades
  app.get("/api/trade/recent", (req, res) => {
    const symbol = String(req.query.symbol || "BTC");
    const basePrices: Record<string, number> = {
      BTC: 67000, ETH: 3400, BNB: 610, SOL: 187, ADA: 0.48, XRP: 0.62, DOGE: 0.184,
    };
    const basePrice = basePrices[symbol] || 67000;
    const now = Date.now();
    const seed = Math.floor(now / 30000);

    const trades = Array.from({ length: 30 }, (_, i) => {
      const k = seed + i * 7 + 13;
      const side = Math.sin(k) > 0 ? "BUY" : "SELL";
      const priceDelta = Math.sin(k * 1.5) * basePrice * 0.001;
      const price = basePrice + priceDelta;
      const amount = Math.abs(Math.cos(k * 0.7) * 0.8 + 0.1);
      return {
        id: seed * 30 + i,
        time: now - i * 2000 - Math.abs(Math.sin(k) * 5000),
        price: Math.round(price * 100) / 100,
        amount: Math.round(amount * 10000) / 10000,
        side,
      };
    });

    res.json(trades);
  });

  // GET /api/portfolio/equity-curve — 90-day equity curve
  app.get("/api/portfolio/equity-curve", (_req, res) => {
    const now = Date.now();
    const DAY_MS = 86400000;
    let value = 10000;
    const curve = [];
    for (let i = 89; i >= 0; i--) {
      const t = now - i * DAY_MS;
      const date = new Date(t).toISOString().split("T")[0];
      const dailyReturn = 0.003 + Math.sin(i * 0.4) * 0.008 + Math.cos(i * 0.7) * 0.005;
      const noise = Math.sin(i * 13.7) * 0.012;
      value = value * (1 + dailyReturn + noise);
      if (value < 8000) value = 8000;
      curve.push({ date, value: Math.round(value) });
    }
    res.json({ curve, initialValue: 10000, currentValue: Math.round(value) });
  });

  // GET /api/portfolio/positions — open positions
  app.get("/api/portfolio/positions", (_req, res) => {
    const seed = Math.floor(Date.now() / (1000 * 60 * 10));
    const rng = (n: number) => Math.abs(Math.sin(seed + n * 9301)) % 1;

    const basePositions = [
      { asset: "BTC",  direction: "LONG",  entryPrice: 64200, currentPrice: 67000, amount: 0.42 },
      { asset: "ETH",  direction: "LONG",  entryPrice: 3180,  currentPrice: 3400,  amount: 2.8  },
      { asset: "SOL",  direction: "SHORT", entryPrice: 198,   currentPrice: 187,   amount: 15   },
      { asset: "BNB",  direction: "LONG",  entryPrice: 590,   currentPrice: 610,   amount: 3.5  },
      { asset: "AVAX", direction: "LONG",  entryPrice: 36,    currentPrice: 38,    amount: 50   },
    ];

    const positions = basePositions.map((p, i) => {
      const cpVariation = 1 + (rng(i) - 0.5) * 0.02;
      const currentPrice = Math.round(p.currentPrice * cpVariation * 100) / 100;
      const pnlPerUnit = p.direction === "LONG"
        ? currentPrice - p.entryPrice
        : p.entryPrice - currentPrice;
      const pnl = Math.round(pnlPerUnit * p.amount * 100) / 100;
      const pnlPct = Math.round((pnlPerUnit / p.entryPrice) * 10000) / 100;
      return { ...p, currentPrice, pnl, pnlPct };
    });

    res.json(positions);
  });

  // GET /api/agents/feed — last 20 agent trades for live feed
  app.get("/api/agents/feed", (_req, res) => {
    const now = Date.now();
    const seed = Math.floor(now / 15000); // refreshes every 15s
    const agentList = [
      { name: "Luna",   emoji: "🐱" },
      { name: "Nova",   emoji: "🐈" },
      { name: "Shadow", emoji: "🐈‍⬛" },
      { name: "Blaze",  emoji: "🦁" },
      { name: "Cipher", emoji: "🐯" },
      { name: "Echo",   emoji: "🐻" },
      { name: "Pixel",  emoji: "🐼" },
      { name: "Nexus",  emoji: "🐨" },
    ];
    const assetList = ["BTC", "ETH", "SOL", "BNB", "AVAX", "MATIC", "LINK", "DOT"];
    const basePricesF: Record<string, number> = {
      BTC: 67000, ETH: 3400, SOL: 187, BNB: 610,
      AVAX: 38, MATIC: 0.72, LINK: 14.5, DOT: 7.2,
    };

    const feed = Array.from({ length: 20 }, (_, i) => {
      const k = seed + i * 7 + 3;
      const agentIdx = Math.floor(Math.abs(Math.sin(k * 1.1)) * agentList.length) % agentList.length;
      const assetIdx = Math.floor(Math.abs(Math.sin(k * 0.9)) * assetList.length) % assetList.length;
      const agent = agentList[agentIdx];
      const asset = assetList[assetIdx];
      const side = Math.sin(k * 1.7) > 0 ? "BUY" : "SELL";
      const basePrice = basePricesF[asset] || 100;
      const price = Math.round(basePrice * (1 + Math.sin(k * 0.3) * 0.005) * 100) / 100;
      const amount = Math.round((Math.abs(Math.cos(k * 1.3)) * 0.9 + 0.01) * 10000) / 10000;
      const timeAgo = i * 45 + Math.floor(Math.abs(Math.sin(k)) * 30);
      return {
        id: seed * 20 + i,
        agentName: agent.name,
        agentEmoji: agent.emoji,
        side,
        asset,
        price,
        amount,
        timeAgo,
      };
    });

    res.json(feed);
  });
}