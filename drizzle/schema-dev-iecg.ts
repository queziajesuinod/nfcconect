import { pgSchema, pgTable, pgEnum, serial, varchar, text, timestamp, boolean, decimal, uuid, date, index } from "drizzle-orm/pg-core";

/**
 * Define the dev_iecg schema
 */
export const devIecgSchema = pgSchema("dev_iecg");

/**
 * Enum for estado_civil (marital status)
 */
export const estadoCivilEnum = devIecgSchema.enum("enum_Users_estado_civil", [
  "solteiro",
  "casado",
  "divorciado",
  "viuvo",
  "uniao_estavel",
]);

/**
 * Users table - existing table from dev_iecg schema
 * Mapped to existing table structure
 */
export const users = devIecgSchema.table("Users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  active: boolean("active").default(true),
  perfilId: uuid("perfilId"),
  passwordHash: varchar("passwordHash", { length: 255 }),
  image: text("image"),
  salt: varchar("salt", { length: 255 }),
  username: varchar("username", { length: 255 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  data_nascimento: date("data_nascimento"),
  endereco: text("endereco"),
  telefone: text("telefone"),
  cpf: text("cpf"),
  estado_civil: estadoCivilEnum("estado_civil"),
  nome_esposo: varchar("nome_esposo", { length: 255 }),
  profissao: varchar("profissao", { length: 255 }),
  frequenta_celula: boolean("frequenta_celula").default(false),
  batizado: boolean("batizado").default(false),
  encontro: boolean("encontro").default(false),
  escolas: text("escolas"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Refresh tokens for session management
 */
export const refreshTokens = devIecgSchema.table("refresh_tokens", {
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
export const nfcTags = devIecgSchema.table("nfc_tags", {
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
export const nfcUsers = devIecgSchema.table("nfc_users", {
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
export const checkinSchedules = devIecgSchema.table("checkin_schedules", {
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
export const checkins = devIecgSchema.table("checkins", {
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
export const connectionLogs = devIecgSchema.table("connection_logs", {
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
export const dynamicLinks = devIecgSchema.table("dynamic_links", {
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

/**
 * Notification Groups table
 */
export const notificationGroups = devIecgSchema.table("notification_groups", {
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
export const groupUserRelations = devIecgSchema.table("group_user_relations", {
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
export const groupScheduleRelations = devIecgSchema.table("group_schedule_relations", {
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
export const userTagRelations = devIecgSchema.table("user_tag_relations", {
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
export const scheduleTagRelations = devIecgSchema.table("schedule_tag_relations", {
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
export const userLocationUpdates = devIecgSchema.table("user_location_updates", {
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
export const automaticCheckins = devIecgSchema.table("automatic_checkins", {
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
