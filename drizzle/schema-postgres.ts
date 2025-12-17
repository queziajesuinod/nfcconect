import { pgTable, pgEnum, serial, varchar, text, timestamp, boolean, decimal, uuid, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Core user table backing auth flow (admin users).
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: pgEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Refresh tokens for session management
 */
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: uuid("userId").notNull(),
  token: varchar("token", { length: 512 }).notNull().unique(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revokedAt", { withTimezone: true }),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;

/**
 * NFC Tags table
 */
export const nfcTags = pgTable("nfc_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  uid: varchar("uid", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type NfcTag = typeof nfcTags.$inferSelect;
export type InsertNfcTag = typeof nfcTags.$inferInsert;

/**
 * NFC Users table
 */
export const nfcUsers = pgTable("nfc_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 20 }),
  organization: varchar("organization", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type NfcUser = typeof nfcUsers.$inferSelect;
export type InsertNfcUser = typeof nfcUsers.$inferInsert;

/**
 * Check-in Schedules table
 */
export const checkinSchedules = pgTable("checkin_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  startTime: timestamp("startTime", { withTimezone: true }).notNull(),
  endTime: timestamp("endTime", { withTimezone: true }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type CheckinSchedule = typeof checkinSchedules.$inferSelect;
export type InsertCheckinSchedule = typeof checkinSchedules.$inferInsert;

/**
 * Check-ins table
 */
export const checkins = pgTable("checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  nfcUserId: uuid("nfcUserId").notNull(),
  nfcTagId: uuid("nfcTagId").notNull(),
  scheduleId: uuid("scheduleId"),
  checkinTime: timestamp("checkinTime", { withTimezone: true }).defaultNow().notNull(),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Checkin = typeof checkins.$inferSelect;
export type InsertCheckin = typeof checkins.$inferInsert;

/**
 * Connection Logs table
 */
export const connectionLogs = pgTable("connection_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  status: varchar("status", { length: 50 }).default("success").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type ConnectionLog = typeof connectionLogs.$inferSelect;
export type InsertConnectionLog = typeof connectionLogs.$inferInsert;

/**
 * Dynamic Links table
 */
export const dynamicLinks = pgTable("dynamic_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  shortCode: varchar("shortCode", { length: 50 }).notNull().unique(),
  targetUrl: text("targetUrl").notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type DynamicLink = typeof dynamicLinks.$inferSelect;
export type InsertDynamicLink = typeof dynamicLinks.$inferInsert;

export const deviceLinkActivations = pgTable("device_link_activations", {
  id: serial("id").primaryKey(),
  deviceId: varchar("deviceId", { length: 255 }).notNull(),
  linkId: integer("linkId").notNull(),
  nfcUserId: integer("nfcUserId"),
  tagId: integer("tagId"),
  targetUrl: text("targetUrl").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  deviceTagUnique: index("device_link_activations_device_tag_unique").on(table.deviceId, table.tagId).unique(),
  deviceNullUnique: index("device_link_activations_device_null_unique")
    .on(table.deviceId)
    .unique()
    .where(sql`${table.tagId} is null`),
}));

export type DeviceLinkActivation = typeof deviceLinkActivations.$inferSelect;
export type InsertDeviceLinkActivation = typeof deviceLinkActivations.$inferInsert;

/**
 * Notification Groups table
 */
export const notificationGroups = pgTable("notification_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  redirectUrl: text("redirectUrl"),
  color: varchar("color", { length: 7 }).default("#3B82F6").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type NotificationGroup = typeof notificationGroups.$inferSelect;
export type InsertNotificationGroup = typeof notificationGroups.$inferInsert;

/**
 * Group-User Relations table
 */
export const groupUserRelations = pgTable("group_user_relations", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("groupId").notNull(),
  userId: uuid("userId").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type GroupUserRelation = typeof groupUserRelations.$inferSelect;
export type InsertGroupUserRelation = typeof groupUserRelations.$inferInsert;

/**
 * Group-Schedule Relations table
 */
export const groupScheduleRelations = pgTable("group_schedule_relations", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("groupId").notNull(),
  scheduleId: uuid("scheduleId").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type GroupScheduleRelation = typeof groupScheduleRelations.$inferSelect;
export type InsertGroupScheduleRelation = typeof groupScheduleRelations.$inferInsert;

/**
 * User-Tag Relations table
 */
export const userTagRelations = pgTable("user_tag_relations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId").notNull(),
  tagId: uuid("tagId").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type UserTagRelation = typeof userTagRelations.$inferSelect;
export type InsertUserTagRelation = typeof userTagRelations.$inferInsert;

/**
 * Schedule-Tag Relations table
 */
export const scheduleTagRelations = pgTable("schedule_tag_relations", {
  id: uuid("id").primaryKey().defaultRandom(),
  scheduleId: uuid("scheduleId").notNull(),
  tagId: uuid("tagId").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type ScheduleTagRelation = typeof scheduleTagRelations.$inferSelect;
export type InsertScheduleTagRelation = typeof scheduleTagRelations.$inferInsert;

/**
 * User Location Updates table
 */
export const userLocationUpdates = pgTable("user_location_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  accuracy: decimal("accuracy", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type UserLocationUpdate = typeof userLocationUpdates.$inferSelect;
export type InsertUserLocationUpdate = typeof userLocationUpdates.$inferInsert;

/**
 * Automatic Check-ins table
 */
export const automaticCheckins = pgTable("automatic_checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId").notNull(),
  scheduleId: uuid("scheduleId").notNull(),
  tagId: uuid("tagId").notNull(),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type AutomaticCheckin = typeof automaticCheckins.$inferSelect;
export type InsertAutomaticCheckin = typeof automaticCheckins.$inferInsert;
