import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Agents table
export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  status: text("status").notNull().default("IDLE"), // TRADING | IDLE | ANALYZING
  market: text("market").notNull(), // Stocks | Crypto | Forex | Bonds | Commodities
  asset: text("asset").notNull(),
  pnl: real("pnl").notNull().default(0),
  pnlPercent: real("pnl_percent").notNull().default(0),
  winRate: real("win_rate").notNull().default(0),
  totalReturn: real("total_return").notNull().default(0),
  copyTradeEnabled: integer("copy_trade_enabled").notNull().default(0),
  sparklineData: text("sparkline_data").notNull().default("[]"), // JSON array
});

export const insertAgentSchema = createInsertSchema(agents).omit({ id: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// Trades table
export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull(),
  asset: text("asset").notNull(),
  side: text("side").notNull(), // BUY | SELL
  quantity: real("quantity").notNull(),
  price: real("price").notNull(),
  pnl: real("pnl"),
  timestamp: text("timestamp").notNull(),
});

export const insertTradeSchema = createInsertSchema(trades).omit({ id: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

// Messages table
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull(),
  role: text("role").notNull(), // user | agent
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// User settings table
export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertUserSettingSchema = createInsertSchema(userSettings).omit({ id: true });
export type InsertUserSetting = z.infer<typeof insertUserSettingSchema>;
export type UserSetting = typeof userSettings.$inferSelect;

// Users table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  username: text('username').notNull(),
  agentId: text('agent_id').notNull().default('luna'),
  riskProfile: text('risk_profile').notNull().default('balanced'),
  createdAt: integer('created_at').notNull(),
  kycStatus: text('kyc_status').notNull().default('unverified'), // unverified | pending | verified
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Auth tokens table
export const authTokens = sqliteTable('auth_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull().unique(),
  email: text('email'),
  expiresAt: integer('expires_at').notNull(),
  used: integer('used').notNull().default(0),
});

export const insertAuthTokenSchema = createInsertSchema(authTokens).omit({ id: true });
export type InsertAuthToken = z.infer<typeof insertAuthTokenSchema>;
export type AuthToken = typeof authTokens.$inferSelect;

// CEO Settings table
// NOTE: CEO: Change the password immediately via /ceo/change-password before production
export const ceoSettings = sqliteTable('ceo_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
});

export const insertCeoSettingSchema = createInsertSchema(ceoSettings).omit({ id: true });
export type InsertCeoSetting = z.infer<typeof insertCeoSettingSchema>;
export type CeoSetting = typeof ceoSettings.$inferSelect;

// Platform Revenue table — tracks 15% platform cut from copy trades
export const platformRevenue = sqliteTable('platform_revenue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  amount: real('amount').notNull().default(0),
  userId: integer('user_id'),
  agentId: integer('agent_id'),
  tradeId: integer('trade_id'),
  type: text('type').notNull().default('copy_trade_fee'),
});

export const insertPlatformRevenueSchema = createInsertSchema(platformRevenue).omit({ id: true });
export type InsertPlatformRevenue = z.infer<typeof insertPlatformRevenueSchema>;
export type PlatformRevenue = typeof platformRevenue.$inferSelect;
