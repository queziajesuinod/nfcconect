import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  nfcTags, InsertNfcTag, NfcTag,
  nfcUsers, InsertNfcUser, NfcUser,
  connectionLogs, InsertConnectionLog,
  dynamicLinks, InsertDynamicLink
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

export async function getNfcUserByTagId(tagId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(nfcUsers).where(eq(nfcUsers.tagId, tagId)).limit(1);
  return result[0];
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
  
  return db.select().from(nfcUsers).orderBy(desc(nfcUsers.createdAt));
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
