import { pgTable, pgEnum, serial, varchar, text, boolean, timestamp, integer, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Perfis table - existing table from dev_iecg schema
 * Stores user profiles/roles
 */
export const perfis = pgTable("Perfis", {
  id: uuid("id").primaryKey().defaultRandom(),
  descricao: varchar("descricao", { length: 255 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Perfil = typeof perfis.$inferSelect;
export type InsertPerfil = typeof perfis.$inferInsert;

/**
 * Users table - existing table from dev_iecg schema
 * Used for JWT authentication
 */
export const users = pgTable("Users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  active: boolean("active").default(true),
  perfilId: uuid("perfilId"),
  passwordHash: varchar("passwordHash", { length: 255 }),
  salt: varchar("salt", { length: 255 }),
  username: varchar("username", { length: 255 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  telefone: text("telefone"),
  cpf: text("cpf"),
  endereco: text("endereco"),
}, (table) => ({
  emailIdx: index("Users_email_idx").on(table.email),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Refresh Tokens - stores refresh tokens for session renewal
 * Allows users to stay logged in without re-entering credentials
 */
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: uuid("userId").notNull(),
  token: varchar("token", { length: 512 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"), // NULL = token válido, SET = token revogado
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;

/**
 * NFC Tags - stores information about physical NFC tags
 */
export const nfcTags = pgTable("nfc_tags", {
  id: serial("id").primaryKey(),
  uid: varchar("uid", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  description: text("description"),
  status: pgEnum("nfc_status", ["active", "inactive", "blocked"])("status").default("active").notNull(),
  redirectUrl: text("redirectUrl"),
  // Geolocation fields
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  radiusMeters: integer("radiusMeters").default(100), // Default 100 meters radius
  enableCheckin: boolean("enableCheckin").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type NfcTag = typeof nfcTags.$inferSelect;
export type InsertNfcTag = typeof nfcTags.$inferInsert;

/**
 * NFC Users - users registered through NFC tag first connection
 * Now identified by deviceId (unique per device), can connect to multiple tags
 */
export const nfcUsers = pgTable("nfc_users", {
  id: serial("id").primaryKey(),
  deviceId: varchar("deviceId", { length: 64 }).notNull().unique(), // Unique device identifier - now the main identifier
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  deviceInfo: text("deviceInfo"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  // Geolocation at first registration
  registrationLatitude: varchar("registrationLatitude", { length: 32 }),
  registrationLongitude: varchar("registrationLongitude", { length: 32 }),
  isValidated: boolean("isValidated").default(false).notNull(),
  firstConnectionAt: timestamp("firstConnectionAt").defaultNow().notNull(),
  lastConnectionAt: timestamp("lastConnectionAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type NfcUser = typeof nfcUsers.$inferSelect;
export type InsertNfcUser = typeof nfcUsers.$inferInsert;

/**
 * User-Tag Relationships - many-to-many relationship between users and tags
 */
export const userTagRelations = pgTable("user_tag_relations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tagId: integer("tagId").notNull(),
  firstConnectionAt: timestamp("firstConnectionAt").defaultNow().notNull(),
  lastConnectionAt: timestamp("lastConnectionAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserTagRelation = typeof userTagRelations.$inferSelect;
export type InsertUserTagRelation = typeof userTagRelations.$inferInsert;

/**
 * Connection Logs - tracks all NFC tag interactions
 */
export const connectionLogs = pgTable("connection_logs", {
  id: serial("id").primaryKey(),
  tagId: integer("tagId").notNull(),
  nfcUserId: integer("nfcUserId"),
  action: pgEnum("action", ["first_read", "validation", "redirect", "update", "block", "checkin"])("action").notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  // Geolocation at time of action
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConnectionLog = typeof connectionLogs.$inferSelect;
export type InsertConnectionLog = typeof connectionLogs.$inferInsert;

/**
 * Check-ins - records of users checking in at NFC tag locations
 */
export const checkins = pgTable("checkins", {
  id: serial("id").primaryKey(),
  tagId: integer("tagId").notNull(),
  nfcUserId: integer("nfcUserId").notNull(),
  latitude: varchar("latitude", { length: 32 }).notNull(),
  longitude: varchar("longitude", { length: 32 }).notNull(),
  distanceMeters: integer("distanceMeters"), // Distance from tag location
  isWithinRadius: boolean("isWithinRadius").default(false).notNull(),
  deviceInfo: text("deviceInfo"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Checkin = typeof checkins.$inferSelect;
export type InsertCheckin = typeof checkins.$inferInsert;

/**
 * Dynamic Links - personalized URLs for each user
 */
export const dynamicLinks = pgTable("dynamic_links", {
  id: serial("id").primaryKey(),
  nfcUserId: integer("nfcUserId"),
  groupId: integer("groupId"),
  shortCode: varchar("shortCode", { length: 32 }).notNull().unique(),
  targetUrl: text("targetUrl").notNull(),
  title: varchar("title", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  clickCount: integer("clickCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
  deviceTagUnique: uniqueIndex("device_link_activations_device_tag_unique").on(table.deviceId, table.tagId),
  deviceNullUnique: uniqueIndex("device_link_activations_device_null_unique")
    .on(table.deviceId)
    .where(sql`${table.tagId} is null`),
}));

export type DeviceLinkActivation = typeof deviceLinkActivations.$inferSelect;
export type InsertDeviceLinkActivation = typeof deviceLinkActivations.$inferInsert;

export const userEvolutionIntegrations = pgTable("user_evolution_integrations", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  instanceName: text("instance_name").notNull(),
  connectionStatus: text("connection_status"),
  pairingCode: text("pairing_code"),
  rawResponse: text("raw_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userUnique: uniqueIndex("user_evolution_integrations_user_id_idx").on(table.userId),
}));

export type UserEvolutionIntegration = typeof userEvolutionIntegrations.$inferSelect;
export type InsertUserEvolutionIntegration = typeof userEvolutionIntegrations.$inferInsert;


/**
 * Check-in Schedules - defines automatic check-in periods for tags
 * Allows setting specific days and time ranges for automatic check-in
 */
export const checkinSchedules = pgTable("checkin_schedules", {
  id: serial("id").primaryKey(),
  tagId: integer("tagId").notNull(),
  name: varchar("name", { length: 255 }),
  description: text("description"),
  // Days of week (0=Sunday, 1=Monday, ..., 6=Saturday) stored as comma-separated string
  daysOfWeek: varchar("daysOfWeek", { length: 32 }).notNull(), // e.g., "0,3,6" for Sun, Wed, Sat
  startTime: varchar("startTime", { length: 8 }).notNull(), // Format: "HH:MM" e.g., "08:00"
  endTime: varchar("endTime", { length: 8 }).notNull(), // Format: "HH:MM" e.g., "10:00"
  isActive: boolean("isActive").default(true).notNull(),
  // Timezone for the schedule
  timezone: varchar("timezone", { length: 64 }).default("America/Sao_Paulo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CheckinSchedule = typeof checkinSchedules.$inferSelect;
export type InsertCheckinSchedule = typeof checkinSchedules.$inferInsert;

/**
 * Automatic Check-ins - records of check-ins performed automatically by the system
 */
export const automaticCheckins = pgTable("automatic_checkins", {
  id: serial("id").primaryKey(),
  scheduleId: integer("scheduleId").notNull(),
  tagId: integer("tagId").notNull(),
  nfcUserId: integer("nfcUserId").notNull(),
  // User's location at the time of automatic check-in
  userLatitude: varchar("userLatitude", { length: 32 }),
  userLongitude: varchar("userLongitude", { length: 32 }),
  distanceMeters: integer("distanceMeters"),
  isWithinRadius: boolean("isWithinRadius").default(false).notNull(),
  // Schedule period info
  scheduledDate: timestamp("scheduledDate").notNull(), // The date this check-in was scheduled for
  periodStart: varchar("periodStart", { length: 8 }).notNull(), // "08:00"
  periodEnd: varchar("periodEnd", { length: 8 }).notNull(), // "10:00"
  checkinTime: timestamp("checkinTime").notNull(), // Actual time of check-in (middle of period)
  status: pgEnum("checkin_status", ["pending", "completed", "failed", "missed"])("status").default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AutomaticCheckin = typeof automaticCheckins.$inferSelect;
export type InsertAutomaticCheckin = typeof automaticCheckins.$inferInsert;

/**
 * User Location Updates - tracks user locations for automatic check-in verification
 * Users can update their location periodically for the system to verify proximity
 */
export const userLocationUpdates = pgTable("user_location_updates", {
  id: serial("id").primaryKey(),
  nfcUserId: integer("nfcUserId").notNull(),
  latitude: varchar("latitude", { length: 32 }).notNull(),
  longitude: varchar("longitude", { length: 32 }).notNull(),
  accuracy: integer("accuracy"), // GPS accuracy in meters
  deviceInfo: text("deviceInfo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserLocationUpdate = typeof userLocationUpdates.$inferSelect;
export type InsertUserLocationUpdate = typeof userLocationUpdates.$inferInsert;

/**
 * Schedule-Tag Relations - many-to-many relationship between schedules and tags
 * Allows one schedule to apply to multiple tags
 */
export const scheduleTagRelations = pgTable("schedule_tag_relations", {
  id: serial("id").primaryKey(),
  scheduleId: integer("scheduleId").notNull(),
  tagId: integer("tagId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScheduleTagRelation = typeof scheduleTagRelations.$inferSelect;
export type InsertScheduleTagRelation = typeof scheduleTagRelations.$inferInsert;


/**
 * Notification Groups - groups of users for targeted notifications and links
 * Groups can be associated with schedules to automatically add users who check-in
 */
export const notificationGroups = pgTable("notification_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Custom redirect URL for this group (overrides tag's default URL)
  redirectUrl: text("redirectUrl"),
  // Color for visual identification
  color: varchar("color", { length: 7 }).default("#3B82F6").notNull(), // Hex color
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type NotificationGroup = typeof notificationGroups.$inferSelect;
export type InsertNotificationGroup = typeof notificationGroups.$inferInsert;

export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userName: uniqueIndex("message_templates_user_id_name").on(table.userId, table.name),
}));

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = typeof messageTemplates.$inferInsert;

export const broadcastSettings = pgTable("broadcast_settings", {
  userId: uuid("user_id").primaryKey(),
  delayMs: integer("delay_ms").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type BroadcastSetting = typeof broadcastSettings.$inferSelect;
export type InsertBroadcastSetting = typeof broadcastSettings.$inferInsert;

/**
 * Group-Schedule Relations - links groups to schedules
 * When a user checks in to a schedule, they are automatically added to linked groups
 */
export const groupScheduleRelations = pgTable("group_schedule_relations", {
  id: serial("id").primaryKey(),
  groupId: integer("groupId").notNull(),
  scheduleId: integer("scheduleId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GroupScheduleRelation = typeof groupScheduleRelations.$inferSelect;
export type InsertGroupScheduleRelation = typeof groupScheduleRelations.$inferInsert;

/**
 * Group-User Relations - users that belong to a group
 * Users are added automatically when they check-in to a linked schedule
 */
export const groupUserRelations = pgTable("group_user_relations", {
  id: serial("id").primaryKey(),
  groupId: integer("groupId").notNull(),
  nfcUserId: integer("nfcUserId").notNull(),
  // How the user was added to the group
  addedBy: pgEnum("added_by", ["auto", "manual"])("addedBy").default("auto").notNull(),
  // Reference to the schedule that triggered auto-add (if applicable)
  sourceScheduleId: integer("sourceScheduleId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GroupUserRelation = typeof groupUserRelations.$inferSelect;
export type InsertGroupUserRelation = typeof groupUserRelations.$inferInsert;
