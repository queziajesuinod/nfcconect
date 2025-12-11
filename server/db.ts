import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  nfcTags, InsertNfcTag, NfcTag,
  nfcUsers, InsertNfcUser, NfcUser,
  userTagRelations, InsertUserTagRelation,
  connectionLogs, InsertConnectionLog,
  dynamicLinks, InsertDynamicLink,
  checkins, InsertCheckin,
  checkinSchedules, InsertCheckinSchedule,
  automaticCheckins, InsertAutomaticCheckin,
  userLocationUpdates, InsertUserLocationUpdate,
  scheduleTagRelations, InsertScheduleTagRelation
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS (Admin Auth) ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ NFC TAG FUNCTIONS ============

export async function createNfcTag(tag: InsertNfcTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(nfcTags).values(tag);
  return { id: result[0].insertId };
}

export async function getNfcTagByUid(uid: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(nfcTags).where(eq(nfcTags.uid, uid)).limit(1);
  return result[0];
}

export async function getNfcTagById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(nfcTags).where(eq(nfcTags.id, id)).limit(1);
  return result[0];
}

export async function getAllNfcTags() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(nfcTags).orderBy(desc(nfcTags.createdAt));
}

export async function updateNfcTag(id: number, data: Partial<InsertNfcTag>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(nfcTags).set(data).where(eq(nfcTags.id, id));
}

export async function deleteNfcTag(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(nfcTags).where(eq(nfcTags.id, id));
}

// ============ NFC USER FUNCTIONS ============

export async function createNfcUser(user: InsertNfcUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(nfcUsers).values(user);
  return { id: result[0].insertId };
}

// Get user by deviceId (unique identifier)
export async function getNfcUserByDeviceId(deviceId: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(nfcUsers).where(eq(nfcUsers.deviceId, deviceId)).limit(1);
  return result[0];
}

// Check if user is connected to a specific tag
export async function getUserTagRelation(userId: number, tagId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(userTagRelations)
    .where(and(eq(userTagRelations.userId, userId), eq(userTagRelations.tagId, tagId)))
    .limit(1);
  return result[0];
}

// Create user-tag relationship
export async function createUserTagRelation(data: InsertUserTagRelation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(userTagRelations).values(data);
  return { id: result[0].insertId };
}

// Update user-tag relationship (last connection)
export async function updateUserTagRelation(userId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(userTagRelations)
    .set({ lastConnectionAt: new Date() })
    .where(and(eq(userTagRelations.userId, userId), eq(userTagRelations.tagId, tagId)));
}

// Get all users connected to a specific tag
export async function getAllNfcUsersByTagId(tagId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: nfcUsers.id,
    deviceId: nfcUsers.deviceId,
    name: nfcUsers.name,
    email: nfcUsers.email,
    phone: nfcUsers.phone,
    firstConnectionAt: userTagRelations.firstConnectionAt,
    lastConnectionAt: userTagRelations.lastConnectionAt,
  })
  .from(userTagRelations)
  .innerJoin(nfcUsers, eq(userTagRelations.userId, nfcUsers.id))
  .where(eq(userTagRelations.tagId, tagId))
  .orderBy(desc(userTagRelations.createdAt));
}

// Get all tags connected to a specific user
export async function getTagsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: nfcTags.id,
    uid: nfcTags.uid,
    name: nfcTags.name,
    firstConnectionAt: userTagRelations.firstConnectionAt,
    lastConnectionAt: userTagRelations.lastConnectionAt,
  })
  .from(userTagRelations)
  .innerJoin(nfcTags, eq(userTagRelations.tagId, nfcTags.id))
  .where(eq(userTagRelations.userId, userId))
  .orderBy(desc(userTagRelations.createdAt));
}

export async function getNfcUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(nfcUsers).where(eq(nfcUsers.id, id)).limit(1);
  return result[0];
}

export async function getAllNfcUsers() {
  const db = await getDb();
  if (!db) return [];
  
  // Get all users with their connected tags count
  const result = await db.select({
    id: nfcUsers.id,
    deviceId: nfcUsers.deviceId,
    name: nfcUsers.name,
    email: nfcUsers.email,
    phone: nfcUsers.phone,
    deviceInfo: nfcUsers.deviceInfo,
    ipAddress: nfcUsers.ipAddress,
    userAgent: nfcUsers.userAgent,
    registrationLatitude: nfcUsers.registrationLatitude,
    registrationLongitude: nfcUsers.registrationLongitude,
    isValidated: nfcUsers.isValidated,
    firstConnectionAt: nfcUsers.firstConnectionAt,
    lastConnectionAt: nfcUsers.lastConnectionAt,
    createdAt: nfcUsers.createdAt,
    updatedAt: nfcUsers.updatedAt,
  })
  .from(nfcUsers)
  .orderBy(desc(nfcUsers.createdAt));
  
  return result;
}

export async function updateNfcUser(id: number, data: Partial<InsertNfcUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(nfcUsers).set(data).where(eq(nfcUsers.id, id));
}

export async function validateNfcUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(nfcUsers).set({ 
    isValidated: true,
    lastConnectionAt: new Date()
  }).where(eq(nfcUsers.id, id));
}

export async function deleteNfcUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(nfcUsers).where(eq(nfcUsers.id, id));
}

// ============ CONNECTION LOG FUNCTIONS ============

export async function createConnectionLog(log: InsertConnectionLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(connectionLogs).values(log);
  return { id: result[0].insertId };
}

export async function getConnectionLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(connectionLogs).orderBy(desc(connectionLogs.createdAt)).limit(limit);
}

export async function getConnectionLogsByTagId(tagId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(connectionLogs)
    .where(eq(connectionLogs.tagId, tagId))
    .orderBy(desc(connectionLogs.createdAt));
}

export async function getConnectionLogsByUserId(nfcUserId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(connectionLogs)
    .where(eq(connectionLogs.nfcUserId, nfcUserId))
    .orderBy(desc(connectionLogs.createdAt));
}

// ============ DYNAMIC LINK FUNCTIONS ============

export async function createDynamicLink(link: InsertDynamicLink) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(dynamicLinks).values(link);
  return { id: result[0].insertId };
}

export async function getDynamicLinkByShortCode(shortCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(dynamicLinks)
    .where(eq(dynamicLinks.shortCode, shortCode))
    .limit(1);
  return result[0];
}

export async function getDynamicLinksByUserId(nfcUserId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(dynamicLinks)
    .where(eq(dynamicLinks.nfcUserId, nfcUserId))
    .orderBy(desc(dynamicLinks.createdAt));
}

export async function getAllDynamicLinks() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(dynamicLinks).orderBy(desc(dynamicLinks.createdAt));
}

export async function updateDynamicLink(id: number, data: Partial<InsertDynamicLink>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(dynamicLinks).set(data).where(eq(dynamicLinks.id, id));
}

export async function incrementLinkClickCount(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(dynamicLinks)
    .set({ clickCount: sql`${dynamicLinks.clickCount} + 1` })
    .where(eq(dynamicLinks.id, id));
}

export async function deleteDynamicLink(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(dynamicLinks).where(eq(dynamicLinks.id, id));
}

// ============ CHECK-IN FUNCTIONS ============

export async function createCheckin(checkin: InsertCheckin) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(checkins).values(checkin);
  return { id: result[0].insertId };
}

export async function getCheckinsByTagId(tagId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(checkins)
    .where(eq(checkins.tagId, tagId))
    .orderBy(desc(checkins.createdAt))
    .limit(limit);
}

export async function getCheckinsByUserId(nfcUserId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(checkins)
    .where(eq(checkins.nfcUserId, nfcUserId))
    .orderBy(desc(checkins.createdAt))
    .limit(limit);
}

export async function getAllCheckins(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select({
    id: checkins.id,
    tagId: checkins.tagId,
    nfcUserId: checkins.nfcUserId,
    latitude: checkins.latitude,
    longitude: checkins.longitude,
    distanceMeters: checkins.distanceMeters,
    isWithinRadius: checkins.isWithinRadius,
    deviceInfo: checkins.deviceInfo,
    ipAddress: checkins.ipAddress,
    createdAt: checkins.createdAt,
    userName: nfcUsers.name,
    userEmail: nfcUsers.email,
    tagUid: nfcTags.uid,
    tagName: nfcTags.name,
  })
    .from(checkins)
    .leftJoin(nfcUsers, eq(checkins.nfcUserId, nfcUsers.id))
    .leftJoin(nfcTags, eq(checkins.tagId, nfcTags.id))
    .orderBy(desc(checkins.createdAt))
    .limit(limit);
  
  return results.map(r => ({
    ...r,
    nfcUser: r.userName || r.userEmail ? { name: r.userName, email: r.userEmail } : null,
    tag: r.tagUid ? { uid: r.tagUid, name: r.tagName } : null,
  }));
}

export async function getCheckinStats() {
  const db = await getDb();
  if (!db) return { totalCheckins: 0, checkinsWithinRadius: 0, checkinsOutsideRadius: 0, checkinsToday: 0 };
  
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(checkins);
  const [withinRadius] = await db.select({ count: sql<number>`count(*)` }).from(checkins)
    .where(eq(checkins.isWithinRadius, true));
  const [outsideRadius] = await db.select({ count: sql<number>`count(*)` }).from(checkins)
    .where(eq(checkins.isWithinRadius, false));
  
  // Get today's checkins
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayCount] = await db.select({ count: sql<number>`count(*)` }).from(checkins)
    .where(sql`${checkins.createdAt} >= ${today}`);
  
  return {
    totalCheckins: Number(total?.count || 0),
    checkinsWithinRadius: Number(withinRadius?.count || 0),
    checkinsOutsideRadius: Number(outsideRadius?.count || 0),
    checkinsToday: Number(todayCount?.count || 0)
  };
}

// ============ STATISTICS FUNCTIONS ============

export async function getStats() {
  const db = await getDb();
  if (!db) return { totalTags: 0, totalUsers: 0, totalConnections: 0, totalLinks: 0 };
  
  const [tagsCount] = await db.select({ count: sql<number>`count(*)` }).from(nfcTags);
  const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(nfcUsers);
  const [logsCount] = await db.select({ count: sql<number>`count(*)` }).from(connectionLogs);
  const [linksCount] = await db.select({ count: sql<number>`count(*)` }).from(dynamicLinks);
  
  return {
    totalTags: Number(tagsCount?.count || 0),
    totalUsers: Number(usersCount?.count || 0),
    totalConnections: Number(logsCount?.count || 0),
    totalLinks: Number(linksCount?.count || 0)
  };
}


// ============ CHECK-IN SCHEDULE FUNCTIONS ============

export async function createCheckinSchedule(schedule: InsertCheckinSchedule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(checkinSchedules).values(schedule);
  return { id: result[0].insertId };
}

export async function getCheckinScheduleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(checkinSchedules).where(eq(checkinSchedules.id, id)).limit(1);
  return result[0];
}

export async function getCheckinSchedulesByTagId(tagId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(checkinSchedules)
    .where(eq(checkinSchedules.tagId, tagId))
    .orderBy(desc(checkinSchedules.createdAt));
}

export async function getAllCheckinSchedules() {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select({
    id: checkinSchedules.id,
    tagId: checkinSchedules.tagId,
    name: checkinSchedules.name,
    description: checkinSchedules.description,
    daysOfWeek: checkinSchedules.daysOfWeek,
    startTime: checkinSchedules.startTime,
    endTime: checkinSchedules.endTime,
    isActive: checkinSchedules.isActive,
    timezone: checkinSchedules.timezone,
    createdAt: checkinSchedules.createdAt,
    updatedAt: checkinSchedules.updatedAt,
    tagUid: nfcTags.uid,
    tagName: nfcTags.name,
  })
    .from(checkinSchedules)
    .leftJoin(nfcTags, eq(checkinSchedules.tagId, nfcTags.id))
    .orderBy(desc(checkinSchedules.createdAt));
  
  return results.map(r => ({
    ...r,
    tag: r.tagUid ? { uid: r.tagUid, name: r.tagName } : null,
  }));
}

export async function getActiveSchedulesForDay(dayOfWeek: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all active schedules and filter by day
  const allSchedules = await db.select({
    id: checkinSchedules.id,
    tagId: checkinSchedules.tagId,
    name: checkinSchedules.name,
    daysOfWeek: checkinSchedules.daysOfWeek,
    startTime: checkinSchedules.startTime,
    endTime: checkinSchedules.endTime,
    timezone: checkinSchedules.timezone,
    tagLatitude: nfcTags.latitude,
    tagLongitude: nfcTags.longitude,
    tagRadiusMeters: nfcTags.radiusMeters,
  })
    .from(checkinSchedules)
    .leftJoin(nfcTags, eq(checkinSchedules.tagId, nfcTags.id))
    .where(eq(checkinSchedules.isActive, true));
  
  // Filter schedules that include the specified day
  return allSchedules.filter(s => {
    const days = s.daysOfWeek.split(',').map(d => parseInt(d.trim()));
    return days.includes(dayOfWeek);
  });
}

export async function updateCheckinSchedule(id: number, data: Partial<InsertCheckinSchedule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(checkinSchedules).set(data).where(eq(checkinSchedules.id, id));
}

export async function deleteCheckinSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(checkinSchedules).where(eq(checkinSchedules.id, id));
}

// ============ AUTOMATIC CHECK-IN FUNCTIONS ============

export async function createAutomaticCheckin(checkin: InsertAutomaticCheckin) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(automaticCheckins).values(checkin);
  return { id: result[0].insertId };
}

export async function getAllAutomaticCheckins(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select({
    id: automaticCheckins.id,
    scheduleId: automaticCheckins.scheduleId,
    tagId: automaticCheckins.tagId,
    nfcUserId: automaticCheckins.nfcUserId,
    userLatitude: automaticCheckins.userLatitude,
    userLongitude: automaticCheckins.userLongitude,
    distanceMeters: automaticCheckins.distanceMeters,
    isWithinRadius: automaticCheckins.isWithinRadius,
    scheduledDate: automaticCheckins.scheduledDate,
    periodStart: automaticCheckins.periodStart,
    periodEnd: automaticCheckins.periodEnd,
    checkinTime: automaticCheckins.checkinTime,
    status: automaticCheckins.status,
    errorMessage: automaticCheckins.errorMessage,
    createdAt: automaticCheckins.createdAt,
    userName: nfcUsers.name,
    userEmail: nfcUsers.email,
    tagUid: nfcTags.uid,
    tagName: nfcTags.name,
    scheduleName: checkinSchedules.name,
  })
    .from(automaticCheckins)
    .leftJoin(nfcUsers, eq(automaticCheckins.nfcUserId, nfcUsers.id))
    .leftJoin(nfcTags, eq(automaticCheckins.tagId, nfcTags.id))
    .leftJoin(checkinSchedules, eq(automaticCheckins.scheduleId, checkinSchedules.id))
    .orderBy(desc(automaticCheckins.createdAt))
    .limit(limit);
  
  return results.map(r => ({
    ...r,
    nfcUser: r.userName || r.userEmail ? { name: r.userName, email: r.userEmail } : null,
    tag: r.tagUid ? { uid: r.tagUid, name: r.tagName } : null,
    schedule: r.scheduleName ? { name: r.scheduleName } : null,
  }));
}

export async function getAutomaticCheckinsByScheduleId(scheduleId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(automaticCheckins)
    .where(eq(automaticCheckins.scheduleId, scheduleId))
    .orderBy(desc(automaticCheckins.createdAt))
    .limit(limit);
}

export async function updateAutomaticCheckinStatus(id: number, status: string, errorMessage?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(automaticCheckins)
    .set({ status: status as any, errorMessage: errorMessage || null })
    .where(eq(automaticCheckins.id, id));
}

// ============ USER LOCATION UPDATE FUNCTIONS ============

export async function createUserLocationUpdate(update: InsertUserLocationUpdate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(userLocationUpdates).values(update);
  return { id: result[0].insertId };
}

export async function getLatestUserLocation(nfcUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(userLocationUpdates)
    .where(eq(userLocationUpdates.nfcUserId, nfcUserId))
    .orderBy(desc(userLocationUpdates.createdAt))
    .limit(1);
  return result[0];
}

export async function getUsersWithRecentLocation(minutesAgo = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
  
  // Get latest location for each user within the time window
  const locations = await db.select({
    nfcUserId: userLocationUpdates.nfcUserId,
    latitude: userLocationUpdates.latitude,
    longitude: userLocationUpdates.longitude,
    accuracy: userLocationUpdates.accuracy,
    createdAt: userLocationUpdates.createdAt,
    userName: nfcUsers.name,
    userEmail: nfcUsers.email,
    deviceId: nfcUsers.deviceId,
  })
    .from(userLocationUpdates)
    .leftJoin(nfcUsers, eq(userLocationUpdates.nfcUserId, nfcUsers.id))
    .where(sql`${userLocationUpdates.createdAt} >= ${cutoffTime}`)
    .orderBy(desc(userLocationUpdates.createdAt));
  
  // Get unique users with their latest location
  const userMap = new Map<number, typeof locations[0]>();
  for (const loc of locations) {
    if (!userMap.has(loc.nfcUserId)) {
      userMap.set(loc.nfcUserId, loc);
    }
  }
  
  return Array.from(userMap.values());
}

export async function getUsersByTagIdWithRecentLocation(tagId: number, minutesAgo = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
  
  // Get users associated with this tag through userTagRelations
  const tagUserRelations = await db.select({
    userId: userTagRelations.userId,
  }).from(userTagRelations).where(eq(userTagRelations.tagId, tagId));
  
  const usersWithLocation = [];
  
  for (const relation of tagUserRelations) {
    const [user] = await db.select().from(nfcUsers).where(eq(nfcUsers.id, relation.userId)).limit(1);
    if (!user) continue;
    
    const [latestLocation] = await db.select().from(userLocationUpdates)
      .where(and(
        eq(userLocationUpdates.nfcUserId, user.id),
        sql`${userLocationUpdates.createdAt} >= ${cutoffTime}`
      ))
      .orderBy(desc(userLocationUpdates.createdAt))
      .limit(1);
    
    if (latestLocation) {
      usersWithLocation.push({
        user,
        location: latestLocation,
      });
    }
  }
  
  return usersWithLocation;
}

// Check if user already has a check-in for a schedule on a specific date
export async function hasUserCheckinForScheduleToday(scheduleId: number, nfcUserId: number, date: Date) {
  const db = await getDb();
  if (!db) return false;
  
  // Get start and end of the day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(automaticCheckins)
    .where(
      and(
        eq(automaticCheckins.scheduleId, scheduleId),
        eq(automaticCheckins.nfcUserId, nfcUserId),
        gte(automaticCheckins.scheduledDate, startOfDay),
        lte(automaticCheckins.scheduledDate, endOfDay)
      )
    );
  
  return (result[0]?.count || 0) > 0;
}

// ============ SCHEDULE-TAG RELATIONS FUNCTIONS ============

export async function getScheduleTagRelations(scheduleId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select({
    id: scheduleTagRelations.id,
    scheduleId: scheduleTagRelations.scheduleId,
    tagId: scheduleTagRelations.tagId,
    tagUid: nfcTags.uid,
    tagName: nfcTags.name,
    tagLatitude: nfcTags.latitude,
    tagLongitude: nfcTags.longitude,
    tagRadiusMeters: nfcTags.radiusMeters,
  })
    .from(scheduleTagRelations)
    .leftJoin(nfcTags, eq(scheduleTagRelations.tagId, nfcTags.id))
    .where(eq(scheduleTagRelations.scheduleId, scheduleId));
  
  return results;
}

export async function addScheduleTagRelation(scheduleId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if relation already exists
  const existing = await db.select()
    .from(scheduleTagRelations)
    .where(and(
      eq(scheduleTagRelations.scheduleId, scheduleId),
      eq(scheduleTagRelations.tagId, tagId)
    ))
    .limit(1);
  
  if (existing.length > 0) return { id: existing[0].id };
  
  const result = await db.insert(scheduleTagRelations).values({ scheduleId, tagId });
  return { id: result[0].insertId };
}

export async function removeScheduleTagRelation(scheduleId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(scheduleTagRelations)
    .where(and(
      eq(scheduleTagRelations.scheduleId, scheduleId),
      eq(scheduleTagRelations.tagId, tagId)
    ));
}

export async function setScheduleTagRelations(scheduleId: number, tagIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete all existing relations for this schedule
  await db.delete(scheduleTagRelations)
    .where(eq(scheduleTagRelations.scheduleId, scheduleId));
  
  // Add new relations
  if (tagIds.length > 0) {
    const values = tagIds.map(tagId => ({ scheduleId, tagId }));
    await db.insert(scheduleTagRelations).values(values);
  }
}

export async function getAllCheckinSchedulesWithTags() {
  const db = await getDb();
  if (!db) return [];
  
  // Get all schedules
  const schedules = await db.select({
    id: checkinSchedules.id,
    tagId: checkinSchedules.tagId, // Legacy single tag
    name: checkinSchedules.name,
    description: checkinSchedules.description,
    daysOfWeek: checkinSchedules.daysOfWeek,
    startTime: checkinSchedules.startTime,
    endTime: checkinSchedules.endTime,
    isActive: checkinSchedules.isActive,
    timezone: checkinSchedules.timezone,
    createdAt: checkinSchedules.createdAt,
    updatedAt: checkinSchedules.updatedAt,
  })
    .from(checkinSchedules)
    .orderBy(desc(checkinSchedules.createdAt));
  
  // For each schedule, get its tags
  const schedulesWithTags = await Promise.all(schedules.map(async (schedule) => {
    // Get tags from the new relation table
    const tagRelations = await getScheduleTagRelations(schedule.id);
    
    // If no relations exist but there's a legacy tagId, include that
    let tags = tagRelations.map(r => ({
      id: r.tagId,
      uid: r.tagUid,
      name: r.tagName,
      latitude: r.tagLatitude,
      longitude: r.tagLongitude,
      radiusMeters: r.tagRadiusMeters,
    }));
    
    if (tags.length === 0 && schedule.tagId) {
      // Fallback to legacy single tag
      const [legacyTag] = await db.select().from(nfcTags).where(eq(nfcTags.id, schedule.tagId)).limit(1);
      if (legacyTag) {
        tags = [{
          id: legacyTag.id,
          uid: legacyTag.uid,
          name: legacyTag.name,
          latitude: legacyTag.latitude,
          longitude: legacyTag.longitude,
          radiusMeters: legacyTag.radiusMeters,
        }];
      }
    }
    
    return {
      ...schedule,
      tags,
      // Keep legacy tag field for backwards compatibility
      tag: tags.length > 0 ? { uid: tags[0].uid, name: tags[0].name } : null,
    };
  }));
  
  return schedulesWithTags;
}

export async function getActiveSchedulesForDayWithTags(dayOfWeek: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all active schedules
  const allSchedules = await db.select({
    id: checkinSchedules.id,
    tagId: checkinSchedules.tagId,
    name: checkinSchedules.name,
    daysOfWeek: checkinSchedules.daysOfWeek,
    startTime: checkinSchedules.startTime,
    endTime: checkinSchedules.endTime,
    timezone: checkinSchedules.timezone,
  })
    .from(checkinSchedules)
    .where(eq(checkinSchedules.isActive, true));
  
  // Filter schedules that include the specified day
  const filteredSchedules = allSchedules.filter(s => {
    const days = s.daysOfWeek.split(',').map(d => parseInt(d.trim()));
    return days.includes(dayOfWeek);
  });
  
  // For each schedule, get its tags with location info
  const schedulesWithTags = await Promise.all(filteredSchedules.map(async (schedule) => {
    const tagRelations = await getScheduleTagRelations(schedule.id);
    
    let tags = tagRelations.map(r => ({
      id: r.tagId,
      uid: r.tagUid,
      name: r.tagName,
      latitude: r.tagLatitude,
      longitude: r.tagLongitude,
      radiusMeters: r.tagRadiusMeters,
    }));
    
    // Fallback to legacy single tag
    if (tags.length === 0 && schedule.tagId) {
      const [legacyTag] = await db.select().from(nfcTags).where(eq(nfcTags.id, schedule.tagId)).limit(1);
      if (legacyTag) {
        tags = [{
          id: legacyTag.id,
          uid: legacyTag.uid,
          name: legacyTag.name,
          latitude: legacyTag.latitude,
          longitude: legacyTag.longitude,
          radiusMeters: legacyTag.radiusMeters,
        }];
      }
    }
    
    return {
      ...schedule,
      tags,
    };
  }));
  
  return schedulesWithTags;
}
