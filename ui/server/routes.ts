import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertUserSettingSchema } from "@shared/schema";
import crypto from "crypto";

// ─── Lightweight JWT-like token helpers (HMAC-SHA256, no external lib) ────────
const JWT_SECRET = process.env.JWT_SECRET || "homeforai-dev-secret-change-in-prod";

// CEO uses a separate JWT secret for isolation
// CEO: Replace CEO_JWT_SECRET with a strong random value in production
const CEO_JWT_SECRET = process.env.CEO_JWT_SECRET || "homeforai_ceo_jwt_secret_2026";

function signToken(payload: object, secret = JWT_SECRET): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyToken(token: string, secret = JWT_SECRET): Record<string, unknown> | null {
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

  // PATCH /api/agents/:id/copy-trade
  app.patch("/api/agents/:id/copy-trade", (req, res) => {
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

  // POST /api/agents/:id/messages
  app.post("/api/agents/:id/messages", (req, res) => {
    const agentId = Number(req.params.id);
    const body = insertMessageSchema.parse({ ...req.body, agentId });
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
    res.json({ success: true, message: "Magic link sent", token }); // token returned for demo
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
    // Salt loaded from DB (seeded from CEO_SALT env var)
    const saltRecord = storage.getCeoSetting("ceo_salt");
    const salt = saltRecord?.value || "change_this_salt";
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
}
