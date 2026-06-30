import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, sql } from "drizzle-orm";
import {
  agents, trades, messages, userSettings, users, authTokens, ceoSettings, platformRevenue,
  type Agent, type InsertAgent,
  type Trade, type InsertTrade,
  type Message, type InsertMessage,
  type UserSetting, type InsertUserSetting,
  type User, type InsertUser,
  type AuthToken, type InsertAuthToken,
  type CeoSetting, type InsertCeoSetting,
  type PlatformRevenue, type InsertPlatformRevenue,
} from "@shared/schema";
import crypto from "crypto";

const sqlite = new Database("data.db");
const db = drizzle(sqlite);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'IDLE',
    market TEXT NOT NULL,
    asset TEXT NOT NULL,
    pnl REAL NOT NULL DEFAULT 0,
    pnl_percent REAL NOT NULL DEFAULT 0,
    win_rate REAL NOT NULL DEFAULT 0,
    total_return REAL NOT NULL DEFAULT 0,
    copy_trade_enabled INTEGER NOT NULL DEFAULT 0,
    sparkline_data TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    asset TEXT NOT NULL,
    side TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    pnl REAL,
    timestamp TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    agent_id TEXT NOT NULL DEFAULT 'luna',
    risk_profile TEXT NOT NULL DEFAULT 'balanced',
    created_at INTEGER NOT NULL,
    kyc_status TEXT NOT NULL DEFAULT 'unverified'
  );
  CREATE TABLE IF NOT EXISTS auth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    email TEXT,
    expires_at INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS ceo_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS platform_revenue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    user_id INTEGER,
    agent_id INTEGER,
    trade_id INTEGER,
    type TEXT NOT NULL DEFAULT 'copy_trade_fee'
  );
`);

// Add kyc_status column if missing (migration for existing DBs)
try {
  sqlite.exec(`ALTER TABLE users ADD COLUMN kyc_status TEXT NOT NULL DEFAULT 'unverified'`);
} catch { /* column already exists */ }

// Seed agents if empty
function seedAgents() {
  const existing = db.select().from(agents).all();
  if (existing.length > 0) return;

  const agentData: InsertAgent[] = [
    {
      name: "Luna",
      emoji: "🐱",
      status: "TRADING",
      market: "Stocks",
      asset: "AAPL",
      pnl: 2847,
      pnlPercent: 12.3,
      winRate: 78,
      totalReturn: 2847,
      copyTradeEnabled: 1,
      sparklineData: JSON.stringify([42, 48, 45, 52, 58, 55, 62, 68, 65, 72, 78, 75]),
    },
    {
      name: "Shadow",
      emoji: "🐈‍⬛",
      status: "TRADING",
      market: "Crypto",
      asset: "BTC",
      pnl: 8920,
      pnlPercent: 34.1,
      winRate: 82,
      totalReturn: 8920,
      copyTradeEnabled: 1,
      sparklineData: JSON.stringify([30, 35, 32, 40, 45, 55, 52, 60, 65, 70, 68, 75]),
    },
    {
      name: "Pixel",
      emoji: "😸",
      status: "ANALYZING",
      market: "Forex",
      asset: "EUR/USD",
      pnl: -234,
      pnlPercent: -1.2,
      winRate: 61,
      totalReturn: -234,
      copyTradeEnabled: 0,
      sparklineData: JSON.stringify([55, 52, 50, 48, 46, 44, 47, 45, 43, 42, 44, 45]),
    },
    {
      name: "Nova",
      emoji: "😻",
      status: "IDLE",
      market: "Crypto",
      asset: "ETH",
      pnl: 1205,
      pnlPercent: 8.7,
      winRate: 74,
      totalReturn: 1205,
      copyTradeEnabled: 0,
      sparklineData: JSON.stringify([40, 42, 44, 46, 44, 48, 50, 52, 50, 54, 56, 58]),
    },
    {
      name: "Blaze",
      emoji: "🙀",
      status: "TRADING",
      market: "Commodities",
      asset: "Gold",
      pnl: 445,
      pnlPercent: 3.2,
      winRate: 69,
      totalReturn: 445,
      copyTradeEnabled: 1,
      sparklineData: JSON.stringify([45, 47, 46, 48, 50, 49, 51, 53, 52, 54, 53, 55]),
    },
    {
      name: "Echo",
      emoji: "😺",
      status: "IDLE",
      market: "Bonds",
      asset: "US10Y",
      pnl: 89,
      pnlPercent: 0.4,
      winRate: 65,
      totalReturn: 89,
      copyTradeEnabled: 0,
      sparklineData: JSON.stringify([50, 50, 51, 51, 52, 52, 51, 53, 53, 52, 54, 54]),
    },
    {
      name: "Cipher",
      emoji: "🐾",
      status: "TRADING",
      market: "Stocks",
      asset: "NVDA",
      pnl: 3102,
      pnlPercent: 18.9,
      winRate: 85,
      totalReturn: 3102,
      copyTradeEnabled: 1,
      sparklineData: JSON.stringify([35, 38, 40, 45, 50, 48, 55, 58, 62, 65, 68, 72]),
    },
    {
      name: "Mochi",
      emoji: "😽",
      status: "ANALYZING",
      market: "Crypto",
      asset: "SOL",
      pnl: 667,
      pnlPercent: 5.1,
      winRate: 71,
      totalReturn: 667,
      copyTradeEnabled: 0,
      sparklineData: JSON.stringify([42, 44, 43, 45, 47, 46, 48, 50, 49, 51, 52, 54]),
    },
  ];

  for (const agent of agentData) {
    db.insert(agents).values(agent).run();
  }
}

// Seed messages if empty
function seedMessages() {
  const existing = db.select().from(messages).all();
  if (existing.length > 0) return;

  const msgs: InsertMessage[] = [
    {
      agentId: 1,
      role: "agent",
      content: "Good morning. I've identified a momentum opportunity in NVIDIA. Current RSI suggests oversold at 28. Initiating position at $487. Want me to proceed?",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      agentId: 1,
      role: "user",
      content: "Go for it. What's your confidence level?",
      timestamp: new Date(Date.now() - 3600000 * 2 + 60000).toISOString(),
    },
    {
      agentId: 1,
      role: "agent",
      content: "82% based on 6-month pattern matching and current earnings sentiment. Stop-loss set at $461. Expected target: $521 within 72 hours.",
      timestamp: new Date(Date.now() - 3600000 * 2 + 120000).toISOString(),
    },
    {
      agentId: 1,
      role: "agent",
      content: "Position opened. 14 shares of NVDA at $487.22. Your copy trade is active — you're in for 3 shares.",
      timestamp: new Date(Date.now() - 3600000 * 2 + 180000).toISOString(),
    },
    {
      agentId: 2,
      role: "agent",
      content: "Bitcoin just broke above $67,000 resistance. This is a significant breakout. I'm increasing position size by 20%. Market structure looks bullish.",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      agentId: 2,
      role: "user",
      content: "What's your BTC target?",
      timestamp: new Date(Date.now() - 1800000 + 60000).toISOString(),
    },
    {
      agentId: 2,
      role: "agent",
      content: "Initial target: $72,400. If we break that, next resistance is $78,000. Stop-loss at $64,200. Risk/reward ratio: 1:2.8. I'll keep you posted.",
      timestamp: new Date(Date.now() - 1800000 + 120000).toISOString(),
    },
  ];

  for (const msg of msgs) {
    db.insert(messages).values(msg).run();
  }
}

// Seed default settings
function seedSettings() {
  const existing = db.select().from(userSettings).all();
  if (existing.length > 0) return;

  const defaults: InsertUserSetting[] = [
    { key: "theme", value: "deep-space" },
    { key: "riskTolerance", value: "moderate" },
    { key: "maxPositionSize", value: "5000" },
    { key: "enabledMarkets", value: JSON.stringify(["Stocks", "Crypto", "Forex"]) },
    { key: "twoFactorEnabled", value: "true" },
    { key: "immersive3D", value: "false" },
    { key: "notificationsEnabled", value: "true" },
  ];

  for (const setting of defaults) {
    db.insert(userSettings).values(setting).run();
  }
}

// Seed CEO settings
function seedCeoSettings() {
  const existing = db.select().from(ceoSettings).all();
  if (existing.length > 0) return;

  // CEO password: phone number 8193195117, hashed with SHA-256 + salt 'homeforai_ceo_salt_2026'
  // Pre-computed hash (phone + salt): do NOT log or expose this value
  // NOTE: Replace with bcrypt in production: bcrypt.hashSync(phone, 12)
  // CEO: Change this credential immediately before going live
  // TODO: Replace 2FA with Apple Push Notification + DeviceCheck API for real iOS-linked auth
  const passwordHash = "98df1db92418c37e595c2dcec5a6226c0dd69e8c2aedec3aff0f15d623d2302a";

  const ceoDefaults: InsertCeoSetting[] = [
    { key: "ceo_password_hash", value: passwordHash },
    { key: "ceo_salt", value: "homeforai_ceo_salt_2026" },
    { key: "ceo_2fa_code", value: "847291" }, // TODO: Replace with Apple Push Notification + DeviceCheck API in production
    { key: "payout_wallet", value: "" },
    { key: "payout_schedule", value: "weekly" },
    { key: "payout_threshold", value: "500" },
    { key: "emergency_stop", value: "false" },
  ];

  for (const setting of ceoDefaults) {
    db.insert(ceoSettings).values(setting).run();
  }
}

// Seed platform revenue — 30 days of mock data
function seedPlatformRevenue() {
  const existing = db.select().from(platformRevenue).all();
  if (existing.length > 0) return;

  // Realistic daily revenue: $15–$180/day, totaling ~$2,800 all-time
  const dailyAmounts = [
    42, 78, 35, 120, 95, 58, 167, 88, 44, 130,
    72, 180, 55, 99, 147, 63, 29, 115, 82, 155,
    47, 91, 138, 68, 105, 77, 160, 52, 86, 118,
  ];

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().split("T")[0];
    db.insert(platformRevenue).values({
      date: dateStr,
      amount: dailyAmounts[i],
      type: "copy_trade_fee",
    }).run();
  }
}

seedAgents();
seedMessages();
seedSettings();
seedCeoSettings();
seedPlatformRevenue();

export interface IStorage {
  // Agents
  getAgents(): Agent[];
  getAgent(id: number): Agent | undefined;
  updateAgentCopyTrade(id: number, enabled: boolean): Agent | undefined;

  // Trades
  getTrades(): Trade[];
  getTradesByAgent(agentId: number): Trade[];
  insertTrade(trade: InsertTrade): Trade;

  // Messages
  getMessages(agentId: number): Message[];
  insertMessage(message: InsertMessage): Message;

  // Settings
  getSettings(): UserSetting[];
  getSetting(key: string): UserSetting | undefined;
  upsertSetting(key: string, value: string): UserSetting;

  // Users
  createUser(user: InsertUser): User;
  getUserByEmail(email: string): User | undefined;
  getUserById(id: number): User | undefined;
  getAllUsers(): User[];
  updateUserKyc(id: number, kycStatus: string): void;

  // Auth Tokens
  createAuthToken(token: InsertAuthToken): AuthToken;
  getAuthToken(token: string): AuthToken | undefined;
  markTokenUsed(token: string): void;
  cleanExpiredTokens(): void;

  // CEO Settings
  getCeoSetting(key: string): CeoSetting | undefined;
  upsertCeoSetting(key: string, value: string): void;
  getAllCeoSettings(): CeoSetting[];

  // Platform Revenue
  getPlatformRevenue(): PlatformRevenue[];
  insertPlatformRevenue(rev: InsertPlatformRevenue): PlatformRevenue;
}

export const storage: IStorage = {
  getAgents() {
    return db.select().from(agents).all();
  },
  getAgent(id: number) {
    return db.select().from(agents).where(eq(agents.id, id)).get();
  },
  updateAgentCopyTrade(id: number, enabled: boolean) {
    db.update(agents).set({ copyTradeEnabled: enabled ? 1 : 0 }).where(eq(agents.id, id)).run();
    return db.select().from(agents).where(eq(agents.id, id)).get();
  },
  getTrades() {
    return db.select().from(trades).all();
  },
  getTradesByAgent(agentId: number) {
    return db.select().from(trades).where(eq(trades.agentId, agentId)).all();
  },
  insertTrade(trade: InsertTrade) {
    return db.insert(trades).values(trade).returning().get();
  },
  getMessages(agentId: number) {
    return db.select().from(messages).where(eq(messages.agentId, agentId)).all();
  },
  insertMessage(message: InsertMessage) {
    return db.insert(messages).values(message).returning().get();
  },
  getSettings() {
    return db.select().from(userSettings).all();
  },
  getSetting(key: string) {
    return db.select().from(userSettings).where(eq(userSettings.key, key)).get();
  },
  upsertSetting(key: string, value: string) {
    const existing = db.select().from(userSettings).where(eq(userSettings.key, key)).get();
    if (existing) {
      db.update(userSettings).set({ value }).where(eq(userSettings.key, key)).run();
    } else {
      db.insert(userSettings).values({ key, value }).run();
    }
    return db.select().from(userSettings).where(eq(userSettings.key, key)).get()!;
  },

  // Users
  createUser(user: InsertUser) {
    return db.insert(users).values(user).returning().get();
  },
  getUserByEmail(email: string) {
    return db.select().from(users).where(eq(users.email, email)).get();
  },
  getUserById(id: number) {
    return db.select().from(users).where(eq(users.id, id)).get();
  },
  getAllUsers() {
    return db.select().from(users).all();
  },
  updateUserKyc(id: number, kycStatus: string) {
    db.update(users).set({ kycStatus } as any).where(eq(users.id, id)).run();
  },

  // Auth Tokens
  createAuthToken(token: InsertAuthToken) {
    return db.insert(authTokens).values(token).returning().get();
  },
  getAuthToken(token: string) {
    return db.select().from(authTokens).where(eq(authTokens.token, token)).get();
  },
  markTokenUsed(token: string) {
    db.update(authTokens).set({ used: 1 }).where(eq(authTokens.token, token)).run();
  },
  cleanExpiredTokens() {
    const now = Date.now();
    sqlite.prepare('DELETE FROM auth_tokens WHERE expires_at < ?').run(now);
  },

  // CEO Settings
  getCeoSetting(key: string) {
    return db.select().from(ceoSettings).where(eq(ceoSettings.key, key)).get();
  },
  upsertCeoSetting(key: string, value: string) {
    const existing = db.select().from(ceoSettings).where(eq(ceoSettings.key, key)).get();
    if (existing) {
      db.update(ceoSettings).set({ value }).where(eq(ceoSettings.key, key)).run();
    } else {
      db.insert(ceoSettings).values({ key, value }).run();
    }
  },
  getAllCeoSettings() {
    return db.select().from(ceoSettings).all();
  },

  // Platform Revenue
  getPlatformRevenue() {
    return db.select().from(platformRevenue).all();
  },
  insertPlatformRevenue(rev: InsertPlatformRevenue) {
    return db.insert(platformRevenue).values(rev).returning().get();
  },
};
