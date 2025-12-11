import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

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
  // Geolocation fields
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  radiusMeters: int("radiusMeters").default(100), // Default 100 meters radius
  enableCheckin: boolean("enableCheckin").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NfcTag = typeof nfcTags.$inferSelect;
export type InsertNfcTag = typeof nfcTags.$inferInsert;

/**
 * NFC Users - users registered through NFC tag first connection
 * Now identified by deviceId (unique per device), can connect to multiple tags
 */
export const nfcUsers = mysqlTable("nfc_users", {
  id: int("id").autoincrement().primaryKey(),
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NfcUser = typeof nfcUsers.$inferSelect;
export type InsertNfcUser = typeof nfcUsers.$inferInsert;

/**
 * User-Tag Relationships - many-to-many relationship between users and tags
 */
export const userTagRelations = mysqlTable("user_tag_relations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tagId: int("tagId").notNull(),
  firstConnectionAt: timestamp("firstConnectionAt").defaultNow().notNull(),
  lastConnectionAt: timestamp("lastConnectionAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserTagRelation = typeof userTagRelations.$inferSelect;
export type InsertUserTagRelation = typeof userTagRelations.$inferInsert;

/**
 * Connection Logs - tracks all NFC tag interactions
 */
export const connectionLogs = mysqlTable("connection_logs", {
  id: int("id").autoincrement().primaryKey(),
  tagId: int("tagId").notNull(),
  nfcUserId: int("nfcUserId"),
  action: mysqlEnum("action", ["first_read", "validation", "redirect", "update", "block", "checkin"]).notNull(),
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
export const checkins = mysqlTable("checkins", {
  id: int("id").autoincrement().primaryKey(),
  tagId: int("tagId").notNull(),
  nfcUserId: int("nfcUserId").notNull(),
  latitude: varchar("latitude", { length: 32 }).notNull(),
  longitude: varchar("longitude", { length: 32 }).notNull(),
  distanceMeters: int("distanceMeters"), // Distance from tag location
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


/**
 * Check-in Schedules - defines automatic check-in periods for tags
 * Allows setting specific days and time ranges for automatic check-in
 */
export const checkinSchedules = mysqlTable("checkin_schedules", {
  id: int("id").autoincrement().primaryKey(),
  tagId: int("tagId").notNull(),
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CheckinSchedule = typeof checkinSchedules.$inferSelect;
export type InsertCheckinSchedule = typeof checkinSchedules.$inferInsert;

/**
 * Automatic Check-ins - records of check-ins performed automatically by the system
 */
export const automaticCheckins = mysqlTable("automatic_checkins", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("scheduleId").notNull(),
  tagId: int("tagId").notNull(),
  nfcUserId: int("nfcUserId").notNull(),
  // User's location at the time of automatic check-in
  userLatitude: varchar("userLatitude", { length: 32 }),
  userLongitude: varchar("userLongitude", { length: 32 }),
  distanceMeters: int("distanceMeters"),
  isWithinRadius: boolean("isWithinRadius").default(false).notNull(),
  // Schedule period info
  scheduledDate: timestamp("scheduledDate").notNull(), // The date this check-in was scheduled for
  periodStart: varchar("periodStart", { length: 8 }).notNull(), // "08:00"
  periodEnd: varchar("periodEnd", { length: 8 }).notNull(), // "10:00"
  checkinTime: timestamp("checkinTime").notNull(), // Actual time of check-in (middle of period)
  status: mysqlEnum("status", ["pending", "completed", "failed", "missed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AutomaticCheckin = typeof automaticCheckins.$inferSelect;
export type InsertAutomaticCheckin = typeof automaticCheckins.$inferInsert;

/**
 * User Location Updates - tracks user locations for automatic check-in verification
 * Users can update their location periodically for the system to verify proximity
 */
export const userLocationUpdates = mysqlTable("user_location_updates", {
  id: int("id").autoincrement().primaryKey(),
  nfcUserId: int("nfcUserId").notNull(),
  latitude: varchar("latitude", { length: 32 }).notNull(),
  longitude: varchar("longitude", { length: 32 }).notNull(),
  accuracy: int("accuracy"), // GPS accuracy in meters
  deviceInfo: text("deviceInfo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserLocationUpdate = typeof userLocationUpdates.$inferSelect;
export type InsertUserLocationUpdate = typeof userLocationUpdates.$inferInsert;
