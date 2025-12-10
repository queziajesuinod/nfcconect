import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow (admin users).
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * NFC Tags - stores information about physical NFC tags
 */
export const nfcTags = mysqlTable("nfc_tags", {
  id: int("id").autoincrement().primaryKey(),
  uid: varchar("uid", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  description: text("description"),
  status: mysqlEnum("status", ["active", "inactive", "blocked"]).default("active").notNull(),
  redirectUrl: text("redirectUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NfcTag = typeof nfcTags.$inferSelect;
export type InsertNfcTag = typeof nfcTags.$inferInsert;

/**
 * NFC Users - users registered through NFC tag first connection
 */
export const nfcUsers = mysqlTable("nfc_users", {
  id: int("id").autoincrement().primaryKey(),
  tagId: int("tagId").notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  deviceInfo: text("deviceInfo"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  isValidated: boolean("isValidated").default(false).notNull(),
  firstConnectionAt: timestamp("firstConnectionAt").defaultNow().notNull(),
  lastConnectionAt: timestamp("lastConnectionAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NfcUser = typeof nfcUsers.$inferSelect;
export type InsertNfcUser = typeof nfcUsers.$inferInsert;

/**
 * Connection Logs - tracks all NFC tag interactions
 */
export const connectionLogs = mysqlTable("connection_logs", {
  id: int("id").autoincrement().primaryKey(),
  tagId: int("tagId").notNull(),
  nfcUserId: int("nfcUserId"),
  action: mysqlEnum("action", ["first_read", "validation", "redirect", "update", "block"]).notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConnectionLog = typeof connectionLogs.$inferSelect;
export type InsertConnectionLog = typeof connectionLogs.$inferInsert;

/**
 * Dynamic Links - personalized URLs for each user
 */
export const dynamicLinks = mysqlTable("dynamic_links", {
  id: int("id").autoincrement().primaryKey(),
  nfcUserId: int("nfcUserId").notNull(),
  shortCode: varchar("shortCode", { length: 32 }).notNull().unique(),
  targetUrl: text("targetUrl").notNull(),
  title: varchar("title", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  clickCount: int("clickCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DynamicLink = typeof dynamicLinks.$inferSelect;
export type InsertDynamicLink = typeof dynamicLinks.$inferInsert;
