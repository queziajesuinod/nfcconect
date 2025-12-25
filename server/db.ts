import { eq, desc, sql, and, gte, lte, lt, or, inArray, ilike, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  InsertUser, users, 
  perfis,
  nfcTags, InsertNfcTag, NfcTag,
  nfcUsers, InsertNfcUser, NfcUser,
  userTagRelations, InsertUserTagRelation,
  connectionLogs, InsertConnectionLog,
  dynamicLinks, InsertDynamicLink,
  deviceLinkActivations, DeviceLinkActivation, InsertDeviceLinkActivation,
  userEvolutionIntegrations, UserEvolutionIntegration, InsertUserEvolutionIntegration,
  checkins, InsertCheckin,
  checkinSchedules, InsertCheckinSchedule,
  automaticCheckins, InsertAutomaticCheckin,
  userLocationUpdates, InsertUserLocationUpdate,
  scheduleTagRelations, InsertScheduleTagRelation,
  notificationGroups, InsertNotificationGroup, NotificationGroup,
  messageTemplates, MessageTemplate, InsertMessageTemplate,
  broadcastSettings, BroadcastSetting,
  groupScheduleRelations, InsertGroupScheduleRelation,
  groupUserRelations, InsertGroupUserRelation
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { generateLegacySalt, hashLegacyPassword } from "./_core/password";
import { 
  getAmazonTime, 
  toAmazonTime, 
  getAmazonStartOfDay, 
  getAmazonEndOfDay,
  nowInAmazonTime,
  toAmazonISOString 
} from './utils/timezone';

type DatabaseClient = ReturnType<typeof drizzle>;

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function maskDatabaseUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.password) {
      url.password = "*****";
    }
    return url.toString();
  } catch {
    return rawUrl.replace(/:(\/\/)?[^@]+@/, ":<credentials>@");
  }
}

export async function getDb() {
  if (_db) return _db;

  let connectionString = ENV.databaseUrl;

  if (!connectionString) {
    console.warn("[Database] Missing DATABASE_URL environment variable");
    return null;
  }

  // Force search_path to the configured schema so queries hit the right tables.
  const schema = ENV.dbSchema?.trim();
  if (schema) {
    try {
      const url = new URL(connectionString);
      const options = url.searchParams.get("options");
      const searchPathOption = `--search_path=${schema}`;

      // Preserve existing options and append search_path if not present.
      if (!options || !options.includes("search_path")) {
        const newOptions = options ? `${options} ${searchPathOption}` : searchPathOption;
        url.searchParams.set("options", newOptions);
      }

      connectionString = url.toString();
    } catch (error) {
      console.warn("[Database] Failed to append search_path to connection string:", error);
    }
  }

  console.log("[Database] Connecting to", maskDatabaseUrl(connectionString));

  try {
    _client = postgres(connectionString);

    // Ensure search_path is set even if connection string params are ignored by the driver.
    if (schema) {
      try {
        // postgres tagged template binds as a value, so use unsafe with sanitized identifier.
        const safeSchema = schema.replace(/"/g, "");
        await _client.unsafe(`set search_path to "${safeSchema}"`);
      } catch (err) {
        console.warn("[Database] Failed to set search_path via SQL:", err);
      }
    }

    _db = drizzle(_client);
  } catch (error) {
    console.warn("[Database] Failed to connect:", error);
    _db = null;
    _client = null;
  }

  return _db;
}

// ============ USER FUNCTIONS (Admin Auth) ============

// Removed: upsertUser function - no longer needed with JWT auth

type CreateAdminUserInput = {
  name: string;
  email: string;
  password: string;
  username?: string | null;
};

async function findOrCreateAdminPerfil(db: DatabaseClient) {
  const existing = await db
    .select()
    .from(perfis)
    .where(ilike(perfis.descricao, "%admin%"))
    .orderBy(desc(perfis.createdAt))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const result = await db.insert(perfis).values({ descricao: "Administrador" }).returning();
  return result[0];
}

export async function createAdminUser(input: CreateAdminUserInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(users)
    .where(ilike(users.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Email já cadastrado");
  }

  const perfil = await findOrCreateAdminPerfil(db);
  const salt = generateLegacySalt();
  const passwordHash = hashLegacyPassword(input.password, salt);

  const result = await db.insert(users).values({
    name: input.name,
    email: input.email,
    active: true,
    perfilId: perfil.id,
    passwordHash,
    salt,
    username: input.username || null,
  }).returning();

  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

function normalizeDigits(value: string | null | undefined) {
  return value ? value.replace(/\D/g, "") : "";
}

export async function findUserByIdentifier(identifier: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot search users: database not available");
    return null;
  }

  const term = identifier.trim();
  if (!term) return null;

  const digits = normalizeDigits(term);
  const conditions = [];
  const hasAt = term.includes("@");
  const hasLetters = /[a-zA-Z]/.test(term);

  if (hasAt) {
    conditions.push(ilike(users.email, term));
  } else if (hasLetters) {
    conditions.push(ilike(users.email, `%${term}%`));
  }

  if (!hasAt && digits) {
    const digitsLike = `%${digits}%`;
    conditions.push(ilike(users.telefone, digitsLike));
    conditions.push(ilike(users.cpf, digitsLike));

    if (term !== digits) {
      const rawLike = `%${term}%`;
      conditions.push(ilike(users.telefone, rawLike));
      conditions.push(ilike(users.cpf, rawLike));
    }
  }

  if (!conditions.length) return null;

  const result = await db
    .select()
    .from(users)
    .where(or(...conditions))
    .limit(1);

  return result[0] ?? null;
}

export async function createMemberUser(input: {
  name: string;
  email: string;
  telefone?: string | null;
  cpf?: string | null;
  perfilId?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const telefone = input.telefone?.trim() || null;
  const cpf = input.cpf?.trim() || null;

  const telefoneDigits = normalizeDigits(telefone);
  const cpfDigits = normalizeDigits(cpf);

  const conditions = [ilike(users.email, email)];

  if (telefoneDigits) {
    conditions.push(ilike(users.telefone, `%${telefoneDigits}%`));
    if (telefone && telefone !== telefoneDigits) {
      conditions.push(ilike(users.telefone, `%${telefone}%`));
    }
  }

  if (cpfDigits) {
    conditions.push(ilike(users.cpf, `%${cpfDigits}%`));
    if (cpf && cpf !== cpfDigits) {
      conditions.push(ilike(users.cpf, `%${cpf}%`));
    }
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(or(...conditions))
    .limit(1);

  if (existing.length) {
    throw new Error("Usuario ja cadastrado");
  }

  const result = await db.insert(users).values({
    name,
    email,
    telefone,
    cpf,
    perfilId: input.perfilId ?? null,
    active: true,
  }).returning();

  return result[0];
}

export async function getUserEvolutionIntegrationByUserId(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(userEvolutionIntegrations)
    .where(eq(userEvolutionIntegrations.userId, userId))
    .limit(1);

  return result[0] ?? null;
}

export async function saveUserEvolutionIntegration(input: {
  userId: string;
  instanceName: string;
  connectionStatus?: string | null;
  pairingCode?: string | null;
  raw?: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rawText =
    input.raw == null
      ? null
      : typeof input.raw === "string"
      ? input.raw
      : JSON.stringify(input.raw);

  await db.insert(userEvolutionIntegrations)
    .values({
      userId: input.userId,
      instanceName: input.instanceName,
      connectionStatus: input.connectionStatus ?? null,
      pairingCode: input.pairingCode ?? null,
      rawResponse: rawText,
      createdAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .onConflictDoUpdate({
      target: userEvolutionIntegrations.userId,
      set: {
        instanceName: input.instanceName,
        connectionStatus: input.connectionStatus ?? null,
        pairingCode: input.pairingCode ?? null,
        rawResponse: rawText,
        updatedAt: sql`now()`,
      },
    });
}

export async function clearUserEvolutionIntegration(userId: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(userEvolutionIntegrations).where(eq(userEvolutionIntegrations.userId, userId));
}

export async function getMessageTemplatesByUserId(userId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.userId, userId))
    .orderBy(desc(messageTemplates.createdAt));
}

export async function getMessageTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function createMessageTemplate(input: {
  userId: string;
  name: string;
  content: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(messageTemplates).values({
    userId: input.userId,
    name: input.name,
    content: input.content,
  }).returning();

  return result[0];
}

export async function updateMessageTemplate(input: {
  id: number;
  userId: string;
  name: string;
  content: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(messageTemplates)
    .where(
      and(eq(messageTemplates.id, input.id), eq(messageTemplates.userId, input.userId))
    )
    .limit(1);

  if (!existing.length) throw new Error("Modelo não encontrado");

  await db
    .update(messageTemplates)
    .set({
      name: input.name,
      content: input.content,
      updatedAt: sql`now()`,
    })
    .where(eq(messageTemplates.id, input.id));

  const [updated] = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.id, input.id))
    .limit(1);

  return updated;
}

export async function deleteMessageTemplate(input: {
  id: number;
  userId: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(messageTemplates)
    .where(
      and(eq(messageTemplates.id, input.id), eq(messageTemplates.userId, input.userId))
    );
}

export async function getBroadcastSettingByUserId(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(broadcastSettings)
    .where(eq(broadcastSettings.userId, userId))
    .limit(1);

  return result[0] ?? null;
}

export async function upsertBroadcastSetting(input: {
  userId: string;
  delayMs: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(broadcastSettings)
    .values({
      userId: input.userId,
      delayMs: input.delayMs,
    })
    .onConflictDoUpdate({
      target: broadcastSettings.userId,
      set: {
        delayMs: input.delayMs,
        updatedAt: sql`now()`,
      },
    });
}

// ============ NFC TAG FUNCTIONS ============

export async function createNfcTag(tag: InsertNfcTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(nfcTags).values(tag).returning({ id: nfcTags.id });
  return { id: result[0].id };
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

export async function getNfcTagsPaginated(page = 1, pageSize = 25) {
  const db = await getDb();
  if (!db) {
    return { items: [], total: 0 };
  }
  const offset = Math.max((page - 1) * pageSize, 0);
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(nfcTags);
  const items = await db.select().from(nfcTags)
    .orderBy(desc(nfcTags.createdAt))
    .limit(pageSize)
    .offset(offset);
  const total = Number(countResult?.count || 0);
  return { items, total };
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
  
  const result = await db.insert(nfcUsers).values(user).returning();
  return result[0];
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
export async function createUserTagRelation(userId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(userTagRelations).values({ userId, tagId }).returning({ id: userTagRelations.id });
  return { id: result[0].id };
}

// Update user-tag relationship (last connection)
export async function updateUserTagRelation(userId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(userTagRelations)
    .set({ lastConnectionAt: nowInAmazonTime() })
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

export async function searchNfcUsers(term: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  const normalized = `%${term.replace(/%/g, "\\%")}%`;

  return db
    .select({
      id: nfcUsers.id,
      name: nfcUsers.name,
      email: nfcUsers.email,
      phone: nfcUsers.phone,
    })
    .from(nfcUsers)
    .where(
      or(
        ilike(nfcUsers.name, normalized),
        ilike(nfcUsers.email, normalized),
        ilike(nfcUsers.phone, normalized)
      )
    )
    .orderBy(desc(nfcUsers.createdAt))
    .limit(limit);
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
    lastConnectionAt: nowInAmazonTime()
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
  
  const result = await db.insert(connectionLogs).values(log).returning({ id: connectionLogs.id });
  return { id: result[0].id };
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
  
  const result = await db.insert(dynamicLinks).values(link).returning();
  return result[0];
}

export async function getDynamicLinkByShortCode(shortCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(dynamicLinks)
    .where(eq(dynamicLinks.shortCode, shortCode))
    .limit(1);
  return result[0];
}

export async function getDynamicLinkById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(dynamicLinks)
    .where(eq(dynamicLinks.id, id))
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

export type DeviceLinkActivationRow = DeviceLinkActivation;

export async function setActiveDeviceLink(entry: {
  deviceId: string;
  linkId: number;
  targetUrl: string;
  tagId?: number | null;
  nfcUserId?: number | null;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values = {
    deviceId: entry.deviceId,
    linkId: entry.linkId,
    nfcUserId: entry.nfcUserId ?? null,
    tagId: entry.tagId ?? null,
    targetUrl: entry.targetUrl,
    expiresAt: entry.expiresAt,
  };
  
  console.log(`[setActiveDeviceLink] Saving link:`, values);

  if (entry.tagId == null) {
    console.log(`[setActiveDeviceLink] Saving as GLOBAL link (tagId = null)`);
    await db.insert(deviceLinkActivations)
      .values(values)
      .onConflictDoUpdate({
        target: deviceLinkActivations.deviceId,
        set: {
          linkId: entry.linkId,
          nfcUserId: entry.nfcUserId ?? null,
          tagId: entry.tagId ?? null,
          targetUrl: entry.targetUrl,
          expiresAt: entry.expiresAt,
          createdAt: sql`now()`,
        },
      });
    console.log(`[setActiveDeviceLink] Global link saved successfully`);
    return;
  }
  
  console.log(`[setActiveDeviceLink] Saving as SPECIFIC link (tagId = ${entry.tagId})`);

  await db.insert(deviceLinkActivations)
    .values(values)
    .onConflictDoUpdate({
      target: [deviceLinkActivations.deviceId, deviceLinkActivations.tagId],
      set: {
        linkId: entry.linkId,
        nfcUserId: entry.nfcUserId ?? null,
        tagId: entry.tagId ?? null,
        targetUrl: entry.targetUrl,
        expiresAt: entry.expiresAt,
        createdAt: sql`now()`,
      },
    });
  console.log(`[setActiveDeviceLink] Specific link saved successfully`);
}

export async function getActiveDeviceLink(deviceId: string, tagId?: number | null) {
  const db = await getDb();
  if (!db) return null;

  const now = nowInAmazonTime();
  
  console.log(`[getActiveDeviceLink] Searching for deviceId: ${deviceId}, tagId: ${tagId}`);
  
  // SIMPLIFIED PRIORITY HIERARCHY:
  // 1. Link with specific tag (if tagId provided)
  // 2. Link with global tag (no tag specified)
  // 3. Fallback: tag default URL (handled by caller)
  
  // Priority 1: Link with specific tag
  if (tagId != null) {
    const specificTagResult = await db.select()
      .from(deviceLinkActivations)
      .where(
        and(
          eq(deviceLinkActivations.deviceId, deviceId),
          eq(deviceLinkActivations.tagId, tagId),
          gte(deviceLinkActivations.expiresAt, now)
        )
      )
      .orderBy(desc(deviceLinkActivations.createdAt))
      .limit(1);
    
    if (specificTagResult[0]) {
      console.log(`[getActiveDeviceLink] Found specific tag link:`, specificTagResult[0]);
      return specificTagResult[0];
    }
    console.log(`[getActiveDeviceLink] No specific tag link found, checking global...`);
  }
  
  // Priority 2: Link with global tag (no tag)
  const globalResult = await db.select()
    .from(deviceLinkActivations)
    .where(
      and(
        eq(deviceLinkActivations.deviceId, deviceId),
        isNull(deviceLinkActivations.tagId),
        gte(deviceLinkActivations.expiresAt, now)
      )
    )
    .orderBy(desc(deviceLinkActivations.createdAt))
    .limit(1);
  
  if (globalResult[0]) {
    console.log(`[getActiveDeviceLink] Found global link:`, globalResult[0]);
    return globalResult[0];
  }
  
  console.log(`[getActiveDeviceLink] No active link found (neither specific nor global)`);
  return null;
}

export async function clearActiveDeviceLink(deviceId: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(deviceLinkActivations).where(eq(deviceLinkActivations.deviceId, deviceId));
}

// ============ CHECK-IN FUNCTIONS ============

export async function createCheckin(checkin: InsertCheckin) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(checkins).values(checkin).returning({ id: checkins.id });
  return { id: result[0].id };
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

export async function getDeviceLinkActivationsByLinkId(linkId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(deviceLinkActivations)
    .where(eq(deviceLinkActivations.linkId, linkId))
    .orderBy(desc(deviceLinkActivations.createdAt));
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
  const today = getAmazonStartOfDay();
  const [todayCount] = await db.select({ count: sql<number>`count(*)` }).from(checkins)
    .where(gte(checkins.createdAt, today));

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
  
  const result = await db.insert(checkinSchedules).values(schedule).returning({ id: checkinSchedules.id });
  return { id: result[0].id };
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

export async function getActiveCheckinSchedules() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: checkinSchedules.id,
    name: checkinSchedules.name,
    description: checkinSchedules.description,
    daysOfWeek: checkinSchedules.daysOfWeek,
    startTime: checkinSchedules.startTime,
    endTime: checkinSchedules.endTime,
    isActive: checkinSchedules.isActive,
    timezone: checkinSchedules.timezone,
  })
    .from(checkinSchedules)
    .where(eq(checkinSchedules.isActive, true))
    .orderBy(desc(checkinSchedules.createdAt));
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
  
  const result = await db.insert(automaticCheckins).values(checkin).returning({ id: automaticCheckins.id });
  return { id: result[0].id };
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

export async function getAutomaticCheckinsForScheduleDate(scheduleId: number, date: Date) {
  const db = await getDb();
  if (!db) return [];

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const results = await db
    .select({
      id: automaticCheckins.id,
      nfcUserId: automaticCheckins.nfcUserId,
      userName: nfcUsers.name,
      userPhone: nfcUsers.phone,
      scheduledDate: automaticCheckins.scheduledDate,
      status: automaticCheckins.status,
      deviceId: nfcUsers.deviceId,
    })
    .from(automaticCheckins)
    .leftJoin(nfcUsers, eq(automaticCheckins.nfcUserId, nfcUsers.id))
    .where(
      and(
        eq(automaticCheckins.scheduleId, scheduleId),
        gte(automaticCheckins.scheduledDate, startOfDay),
        lte(automaticCheckins.scheduledDate, endOfDay)
      )
    )
    .orderBy(desc(automaticCheckins.createdAt));

  return results.map(row => ({
    id: row.id,
    nfcUserId: row.nfcUserId,
    userName: row.userName || null,
    userPhone: row.userPhone || null,
    deviceId: row.deviceId || null,
    scheduledDate: row.scheduledDate,
    status: row.status,
  }));
}

export async function getFirstTimeAutomaticCheckinsForScheduleDate(scheduleId: number, date: Date) {
  const db = await getDb();
  if (!db) return [];

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const previousCheckins = await db
    .select({ userId: automaticCheckins.nfcUserId })
    .from(automaticCheckins)
    .where(
      and(
        eq(automaticCheckins.scheduleId, scheduleId),
        lt(automaticCheckins.scheduledDate, startOfDay)
      )
    )
    .groupBy(automaticCheckins.nfcUserId);

  const previousUserIds = new Set(previousCheckins.map(row => row.userId));
  const todays = await getAutomaticCheckinsForScheduleDate(scheduleId, date);
  return todays.filter(checkin => !previousUserIds.has(checkin.nfcUserId));
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
  
  const result = await db.insert(userLocationUpdates).values(update).returning({ id: userLocationUpdates.id });
  return { id: result[0].id };
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
    .where(gte(userLocationUpdates.createdAt, cutoffTime))
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
          gte(userLocationUpdates.createdAt, cutoffTime)
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

/**
 * Check if a schedule is currently active based on day of week and time
 * @param schedule The checkin schedule to check
 * @param now Current date/time to check against
 * @returns true if schedule is active at the given time
 */
export function isScheduleActive(schedule: any, now: Date): boolean {
  // Check if schedule is enabled
  if (!schedule.isActive) {
    return false;
  }

  // Get current day of week (0 = Sunday, 6 = Saturday)
  const currentDay = now.getDay();
  
  // Parse days of week from schedule (e.g., "1,3,5" for Mon, Wed, Fri)
  const scheduleDays = schedule.daysOfWeek
    .split(',')
    .map((d: string) => parseInt(d.trim(), 10));
  
  // Check if current day is in schedule
  if (!scheduleDays.includes(currentDay)) {
    return false;
  }

  // Get current time in HH:MM format
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
  
  // Check if current time is within schedule range
  if (currentTime < schedule.startTime || currentTime > schedule.endTime) {
    return false;
  }

  return true;
}

/**
 * Calculate distance between two geographic points using Haversine formula
 * @param lat1 Latitude of point 1 (in degrees)
 * @param lon1 Longitude of point 1 (in degrees)
 * @param lat2 Latitude of point 2 (in degrees)
 * @param lon2 Longitude of point 2 (in degrees)
 * @returns Distance in meters
 * 
 * @example
 * // Campo Grande, MS to a point 100m north
 * const distance = calculateDistance(-20.4697, -54.6201, -20.4707, -54.6201);
 * console.log(distance); // ~111 meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Earth radius in meters
  const R = 6371e3;
  
  // Convert degrees to radians
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  // Haversine formula
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Distance in meters
  const distance = R * c;
  
  return distance;
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
  
  const result = await db.insert(scheduleTagRelations).values({ scheduleId, tagId }).returning({ id: scheduleTagRelations.id });
  return { id: result[0].id };
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

export async function getCheckinSchedulesWithTagsPaginated(page = 1, pageSize = 25) {
  const db = await getDb();
  if (!db) {
    return { items: [], total: 0, page, pageSize, totalPages: 1 };
  }

  const offset = Math.max((page - 1) * pageSize, 0);
  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(checkinSchedules);
  const total = Number(totalResult[0]?.count || 0);

  const schedules = await db.select({
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
  })
    .from(checkinSchedules)
    .orderBy(desc(checkinSchedules.createdAt))
    .limit(pageSize)
    .offset(offset);

  const schedulesWithTags = await Promise.all(schedules.map(async (schedule) => {
    const tagRelations = await getScheduleTagRelations(schedule.id);

    let tags = tagRelations.map(r => ({
      id: r.tagId,
      uid: r.tagUid,
      name: r.tagName,
      latitude: r.tagLatitude,
      longitude: r.tagLongitude,
      radiusMeters: r.tagRadiusMeters,
    }));

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
      tag: tags.length > 0 ? { uid: tags[0].uid, name: tags[0].name } : null,
    };
  }));

  const totalPages = total === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize));

  return {
    items: schedulesWithTags,
    total,
    page,
    pageSize,
    totalPages,
  };
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

// ============ UNIFIED CHECK-IN FUNCTIONS ============

// Get all check-ins (both manual and automatic) unified
export async function getAllUnifiedCheckins(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  // Get automatic check-ins
  const autoCheckins = await db.select({
    id: automaticCheckins.id,
    type: sql<string>`'automatic'`.as('type'),
    nfcUserId: automaticCheckins.nfcUserId,
    tagId: automaticCheckins.tagId,
    scheduleId: automaticCheckins.scheduleId,
    distanceMeters: automaticCheckins.distanceMeters,
    isWithinRadius: automaticCheckins.isWithinRadius,
    latitude: automaticCheckins.userLatitude,
    longitude: automaticCheckins.userLongitude,
    createdAt: automaticCheckins.createdAt,
    userName: nfcUsers.name,
    userEmail: nfcUsers.email,
    tagUid: nfcTags.uid,
    tagName: nfcTags.name,
    scheduleName: checkinSchedules.name,
    scheduleStartTime: checkinSchedules.startTime,
    scheduleEndTime: checkinSchedules.endTime,
  })
    .from(automaticCheckins)
    .leftJoin(nfcUsers, eq(automaticCheckins.nfcUserId, nfcUsers.id))
    .leftJoin(nfcTags, eq(automaticCheckins.tagId, nfcTags.id))
    .leftJoin(checkinSchedules, eq(automaticCheckins.scheduleId, checkinSchedules.id))
    .orderBy(desc(automaticCheckins.createdAt))
    .limit(limit);
  
  // Get manual check-ins
  const manualCheckins = await db.select({
    id: checkins.id,
    type: sql<string>`'manual'`.as('type'),
    nfcUserId: checkins.nfcUserId,
    tagId: checkins.tagId,
    scheduleId: sql<number | null>`NULL`.as('scheduleId'),
    distanceMeters: checkins.distanceMeters,
    isWithinRadius: checkins.isWithinRadius,
    latitude: checkins.latitude,
    longitude: checkins.longitude,
    createdAt: checkins.createdAt,
    userName: nfcUsers.name,
    userEmail: nfcUsers.email,
    tagUid: nfcTags.uid,
    tagName: nfcTags.name,
    scheduleName: sql<string | null>`NULL`.as('scheduleName'),
    scheduleStartTime: sql<string | null>`NULL`.as('scheduleStartTime'),
    scheduleEndTime: sql<string | null>`NULL`.as('scheduleEndTime'),
  })
    .from(checkins)
    .leftJoin(nfcUsers, eq(checkins.nfcUserId, nfcUsers.id))
    .leftJoin(nfcTags, eq(checkins.tagId, nfcTags.id))
    .orderBy(desc(checkins.createdAt))
    .limit(limit);
  
  // Combine and sort by createdAt
  const allCheckins = [...autoCheckins, ...manualCheckins]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
  
  return allCheckins;
}

export async function getUnifiedCheckinsPaginated(page = 1, pageSize = 25) {
  const db = await getDb();
  if (!db) {
    return { items: [], total: 0, page, pageSize, totalPages: 1 };
  }

  const offset = Math.max((page - 1) * pageSize, 0);
  const fetchLimit = Math.max(page * pageSize, pageSize);

  const autoCheckins = await db.select({
    id: automaticCheckins.id,
    type: sql<string>`'automatic'`.as('type'),
    nfcUserId: automaticCheckins.nfcUserId,
    tagId: automaticCheckins.tagId,
    scheduleId: automaticCheckins.scheduleId,
    distanceMeters: automaticCheckins.distanceMeters,
    isWithinRadius: automaticCheckins.isWithinRadius,
    latitude: automaticCheckins.userLatitude,
    longitude: automaticCheckins.userLongitude,
    createdAt: automaticCheckins.createdAt,
    userName: nfcUsers.name,
    userEmail: nfcUsers.email,
    tagUid: nfcTags.uid,
    tagName: nfcTags.name,
    scheduleName: checkinSchedules.name,
    scheduleStartTime: checkinSchedules.startTime,
    scheduleEndTime: checkinSchedules.endTime,
  })
    .from(automaticCheckins)
    .leftJoin(nfcUsers, eq(automaticCheckins.nfcUserId, nfcUsers.id))
    .leftJoin(nfcTags, eq(automaticCheckins.tagId, nfcTags.id))
    .leftJoin(checkinSchedules, eq(automaticCheckins.scheduleId, checkinSchedules.id))
    .orderBy(desc(automaticCheckins.createdAt))
    .limit(fetchLimit);

  const manualCheckins = await db.select({
    id: checkins.id,
    type: sql<string>`'manual'`.as('type'),
    nfcUserId: checkins.nfcUserId,
    tagId: checkins.tagId,
    scheduleId: sql<number | null>`NULL`.as('scheduleId'),
    distanceMeters: checkins.distanceMeters,
    isWithinRadius: checkins.isWithinRadius,
    latitude: checkins.latitude,
    longitude: checkins.longitude,
    createdAt: checkins.createdAt,
    userName: nfcUsers.name,
    userEmail: nfcUsers.email,
    tagUid: nfcTags.uid,
    tagName: nfcTags.name,
    scheduleName: sql<string | null>`NULL`.as('scheduleName'),
    scheduleStartTime: sql<string | null>`NULL`.as('scheduleStartTime'),
    scheduleEndTime: sql<string | null>`NULL`.as('scheduleEndTime'),
  })
    .from(checkins)
    .leftJoin(nfcUsers, eq(checkins.nfcUserId, nfcUsers.id))
    .leftJoin(nfcTags, eq(checkins.tagId, nfcTags.id))
    .orderBy(desc(checkins.createdAt))
    .limit(fetchLimit);

  const [autoCountResult] = await db.select({ count: sql<number>`count(*)` }).from(automaticCheckins);
  const [manualCountResult] = await db.select({ count: sql<number>`count(*)` }).from(checkins);
  const total = Number(autoCountResult?.count || 0) + Number(manualCountResult?.count || 0);

  const allCheckins = [...autoCheckins, ...manualCheckins]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const items = allCheckins.slice(offset, offset + pageSize);
  const totalPages = total === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export interface ConnectionLogHistoryParams {
  nfcUserId: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface ConnectionLogHistoryItem {
  id: number;
  tagId: number | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: string | null;
  createdAt: Date;
  deviceName?: string | null;
  deviceId?: string | null;
}

export async function getConnectionLogHistoryByUser(params: ConnectionLogHistoryParams) {
  const db = await getDb();
  if (!db) {
    return { items: [], total: 0 };
  }

  const limit = Math.max(1, Math.min(params.limit ?? 50, 200));
  const startDate = params.startDate
    ? toAmazonTime(new Date(params.startDate))
    : getAmazonStartOfDay();
  const endDate = params.endDate
    ? toAmazonTime(new Date(params.endDate))
    : getAmazonEndOfDay();

  const result = await db
    .select({
      id: connectionLogs.id,
      tagId: connectionLogs.tagId,
      action: connectionLogs.action,
      ipAddress: connectionLogs.ipAddress,
      userAgent: connectionLogs.userAgent,
      metadata: connectionLogs.metadata,
      createdAt: connectionLogs.createdAt,
      deviceName: nfcUsers.name,
      deviceId: nfcUsers.deviceId,
    })
    .from(connectionLogs)
    .leftJoin(nfcUsers, eq(connectionLogs.nfcUserId, nfcUsers.id))
    .where(
      and(
        eq(connectionLogs.nfcUserId, params.nfcUserId),
        gte(connectionLogs.createdAt, startDate),
        lte(connectionLogs.createdAt, endDate)
      )
    )
    .orderBy(desc(connectionLogs.createdAt))
    .limit(limit);

  return {
    items: result,
    total: result.length,
  };
}

export interface CheckinHistoryParams {
  nfcUserId: number;
  startDate?: Date;
  endDate?: Date;
  insideSchedule?: boolean;
  limit?: number;
}

export interface CheckinHistoryItem {
  id: number;
  type: "manual" | "automatic";
  tagId: number;
  tagName?: string | null;
  tagUid?: string | null;
  distanceMeters: number | null;
  isWithinRadius: boolean;
  createdAt: Date;
  insideSchedule: boolean;
  scheduleId: number | null;
  scheduleName: string | null;
  scheduleStartTime: string | null;
  scheduleEndTime: string | null;
}

export async function getCheckinHistoryByUser(params: CheckinHistoryParams) {
  const db = await getDb();
  if (!db) {
    return { items: [], total: 0 };
  }

  const limit = Math.max(1, Math.min(params.limit ?? 50, 200));
  const startDate = params.startDate
    ? toAmazonTime(new Date(params.startDate))
    : getAmazonStartOfDay();
  const endDate = params.endDate
    ? toAmazonTime(new Date(params.endDate))
    : getAmazonEndOfDay();

  const manualRows = await db.select({
    id: checkins.id,
    tagId: checkins.tagId,
    distanceMeters: checkins.distanceMeters,
    isWithinRadius: checkins.isWithinRadius,
    createdAt: checkins.createdAt,
    tagUid: nfcTags.uid,
    tagName: nfcTags.name,
    deviceInfo: checkins.deviceInfo,
  })
    .from(checkins)
    .leftJoin(nfcTags, eq(checkins.tagId, nfcTags.id))
    .where(
      and(
        eq(checkins.nfcUserId, params.nfcUserId),
        gte(checkins.createdAt, startDate),
        lte(checkins.createdAt, endDate)
      )
    )
    .orderBy(desc(checkins.createdAt))
    .limit(limit);

  const autoRows = await db.select({
    id: automaticCheckins.id,
    tagId: automaticCheckins.tagId,
    scheduleId: automaticCheckins.scheduleId,
    distanceMeters: automaticCheckins.distanceMeters,
    isWithinRadius: automaticCheckins.isWithinRadius,
    createdAt: automaticCheckins.checkinTime,
    tagUid: nfcTags.uid,
    tagName: nfcTags.name,
    scheduleName: checkinSchedules.name,
    scheduleStartTime: checkinSchedules.startTime,
    scheduleEndTime: checkinSchedules.endTime,
  })
    .from(automaticCheckins)
    .leftJoin(nfcTags, eq(automaticCheckins.tagId, nfcTags.id))
    .leftJoin(checkinSchedules, eq(automaticCheckins.scheduleId, checkinSchedules.id))
    .where(
      and(
        eq(automaticCheckins.nfcUserId, params.nfcUserId),
        gte(automaticCheckins.checkinTime, startDate),
        lte(automaticCheckins.checkinTime, endDate)
      )
    )
    .orderBy(desc(automaticCheckins.checkinTime))
    .limit(limit);

  const manualHistory: CheckinHistoryItem[] = manualRows.map((row) => ({
    id: row.id,
    type: "manual",
    tagId: row.tagId,
    tagName: row.tagName,
    tagUid: row.tagUid,
    distanceMeters: row.distanceMeters,
    isWithinRadius: row.isWithinRadius,
    createdAt: row.createdAt,
    insideSchedule: row.deviceInfo === "manual-schedule",
    scheduleId: null,
    scheduleName: null,
    scheduleStartTime: null,
    scheduleEndTime: null,
  }));

  const autoHistory: CheckinHistoryItem[] = autoRows.map((row) => ({
    id: row.id,
    type: "automatic",
    tagId: row.tagId,
    tagName: row.tagName,
    tagUid: row.tagUid,
    distanceMeters: row.distanceMeters,
    isWithinRadius: row.isWithinRadius,
    createdAt: row.createdAt,
    insideSchedule: true,
    scheduleId: row.scheduleId,
    scheduleName: row.scheduleName,
    scheduleStartTime: row.scheduleStartTime,
    scheduleEndTime: row.scheduleEndTime,
  }));

  const combined = [...manualHistory, ...autoHistory];


  const sorted = combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const filtered =
    params.insideSchedule === undefined
      ? sorted
      : sorted.filter((entry) => entry.insideSchedule === params.insideSchedule);

  return {
    items: filtered.slice(0, limit),
    total: filtered.length,
  };
}

// Check if user already has any check-in (manual or automatic) for a tag today
export async function hasUserCheckinForTagToday(tagId: number, nfcUserId: number, date: Date) {
  const db = await getDb();
  if (!db) return false;
  
  // Get start and end of the day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Check automatic check-ins
  const autoResult = await db.select({ count: sql<number>`count(*)` })
    .from(automaticCheckins)
    .where(
      and(
        eq(automaticCheckins.tagId, tagId),
        eq(automaticCheckins.nfcUserId, nfcUserId),
        gte(automaticCheckins.createdAt, startOfDay),
        lte(automaticCheckins.createdAt, endOfDay)
      )
    );
  
  if ((autoResult[0]?.count || 0) > 0) return true;
  
  // Check manual check-ins
  const manualResult = await db.select({ count: sql<number>`count(*)` })
    .from(checkins)
    .where(
      and(
        eq(checkins.tagId, tagId),
        eq(checkins.nfcUserId, nfcUserId),
        gte(checkins.createdAt, startOfDay),
        lte(checkins.createdAt, endOfDay)
      )
    );
  
  return (manualResult[0]?.count || 0) > 0;
}

// Get active schedules for a specific tag at current time
export async function getActiveScheduleForTag(tagId: number, dayOfWeek: number, currentMinutes: number) {
  const db = await getDb();
  if (!db) return null;
  
  // First check scheduleTagRelations for the tag
  const tagRelations = await db.select({
    scheduleId: scheduleTagRelations.scheduleId,
  })
    .from(scheduleTagRelations)
    .where(eq(scheduleTagRelations.tagId, tagId));
  
  const scheduleIds = tagRelations.map(r => r.scheduleId);
  
  // Get schedules that match the tag (either via relation or legacy tagId)
  const schedules = await db.select()
    .from(checkinSchedules)
    .where(
      and(
        eq(checkinSchedules.isActive, true),
        or(
          scheduleIds.length > 0 ? inArray(checkinSchedules.id, scheduleIds) : undefined,
          eq(checkinSchedules.tagId, tagId)
        )
      )
    );
  
  // Filter by day and time
  for (const schedule of schedules) {
    const days = schedule.daysOfWeek.split(',').map(d => parseInt(d.trim()));
    if (!days.includes(dayOfWeek)) continue;
    
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return schedule;
    }
  }
  
  return null;
}

// Get unified check-in stats
export async function getUnifiedCheckinStats() {
  const db = await getDb();
  if (!db) return { totalCheckins: 0, checkinsWithinRadius: 0, checkinsOutsideRadius: 0, checkinsToday: 0 };
  
  const today = getAmazonStartOfDay();
  
  // Auto check-ins stats
  const autoStats = await db.$client`
    select
      count(*)::int as total,
      sum(case when "isWithinRadius" = true then 1 else 0 end)::int as withinRadius,
      sum(case when "isWithinRadius" = false then 1 else 0 end)::int as outsideRadius,
      sum(case when "createdAt" >= ${today.toISOString()} then 1 else 0 end)::int as today
    from dev_iecg."automatic_checkins"
  `.then((rows) => rows);
  
  // Manual check-ins stats
  const manualStats = await db.select({
    total: sql<number>`count(*)`,
    withinRadius: sql<number>`sum(case when ${checkins.isWithinRadius} = true then 1 else 0 end)`,
    outsideRadius: sql<number>`sum(case when ${checkins.isWithinRadius} = false then 1 else 0 end)`,
    today: sql<number>`sum(case when ${checkins.createdAt} >= ${today} then 1 else 0 end)`,
  }).from(checkins);
  
  return {
    totalCheckins: (autoStats[0]?.total || 0) + (manualStats[0]?.total || 0),
    checkinsWithinRadius: (autoStats[0]?.withinRadius || 0) + (manualStats[0]?.withinRadius || 0),
    checkinsOutsideRadius: (autoStats[0]?.outsideRadius || 0) + (manualStats[0]?.outsideRadius || 0),
    checkinsToday: (autoStats[0]?.today || 0) + (manualStats[0]?.today || 0),
  };
}

// ============ REAL-TIME ATTENDANCE PANEL FUNCTIONS ============

// Get today's check-ins for active schedules (for real-time panel)
export async function getTodayCheckinsForActiveSchedules() {
  const db = await getDb();
  if (!db) return { schedules: [], checkins: [] };
  
  // Get today's date range (Amazon timezone - UTC-4)
  const amazonNow = getAmazonTime();
  const startOfDay = getAmazonStartOfDay();
  const endOfDay = getAmazonEndOfDay();
  
  const currentDay = amazonNow.getDay();
  const currentMinutes = amazonNow.getHours() * 60 + amazonNow.getMinutes();
  
  // Get all active schedules for today
  const allSchedules = await db.select()
    .from(checkinSchedules)
    .where(eq(checkinSchedules.isActive, true));
  
  // Filter schedules that match today's day
  const todaySchedules = allSchedules.filter(schedule => {
    const days = schedule.daysOfWeek.split(',').map(d => parseInt(d.trim()));
    return days.includes(currentDay);
  });
  
  // Mark which schedules are currently active (within time range)
  const schedulesWithStatus = todaySchedules.map(schedule => {
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    const isActiveNow = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    
    return {
      ...schedule,
      isActiveNow,
    };
  });
  
  // Get all check-ins for today (both automatic and manual)
  const autoCheckins = await db.select({
    id: automaticCheckins.id,
    type: sql<string>`'automatic'`.as('type'),
    scheduleId: automaticCheckins.scheduleId,
    tagId: automaticCheckins.tagId,
    nfcUserId: automaticCheckins.nfcUserId,
    distanceMeters: automaticCheckins.distanceMeters,
    isWithinRadius: automaticCheckins.isWithinRadius,
    createdAt: automaticCheckins.createdAt,
    userName: nfcUsers.name,
    userEmail: nfcUsers.email,
    userPhone: nfcUsers.phone,
    tagName: nfcTags.name,
    tagUid: nfcTags.uid,
  })
    .from(automaticCheckins)
    .leftJoin(nfcUsers, eq(automaticCheckins.nfcUserId, nfcUsers.id))
    .leftJoin(nfcTags, eq(automaticCheckins.tagId, nfcTags.id))
    .where(
      and(
        gte(automaticCheckins.createdAt, startOfDay),
        lte(automaticCheckins.createdAt, endOfDay)
      )
    )
    .orderBy(desc(automaticCheckins.createdAt));
  
  // Get manual check-ins for today
  const manualCheckins = await db.select({
    id: checkins.id,
    type: sql<string>`'manual'`.as('type'),
    scheduleId: sql<number | null>`NULL`.as('scheduleId'),
    tagId: checkins.tagId,
    nfcUserId: checkins.nfcUserId,
    distanceMeters: checkins.distanceMeters,
    isWithinRadius: checkins.isWithinRadius,
    createdAt: checkins.createdAt,
    userName: nfcUsers.name,
    userEmail: nfcUsers.email,
    userPhone: nfcUsers.phone,
    tagName: nfcTags.name,
    tagUid: nfcTags.uid,
  })
    .from(checkins)
    .leftJoin(nfcUsers, eq(checkins.nfcUserId, nfcUsers.id))
    .leftJoin(nfcTags, eq(checkins.tagId, nfcTags.id))
    .where(
      and(
        gte(checkins.createdAt, startOfDay),
        lte(checkins.createdAt, endOfDay)
      )
    )
    .orderBy(desc(checkins.createdAt));
  
  // Combine all check-ins
  const allCheckins = [...autoCheckins, ...manualCheckins]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Get total users per schedule (from tag relations)
  const schedulesWithCounts = await Promise.all(schedulesWithStatus.map(async (schedule) => {
    // Get tags for this schedule
    const tagRelations = await getScheduleTagRelations(schedule.id);
    const tagIds = tagRelations.map(r => r.tagId);
    
    // If no relations, use legacy tagId
    if (tagIds.length === 0 && schedule.tagId) {
      tagIds.push(schedule.tagId);
    }
    
    // Count total users connected to these tags
    let totalUsers = 0;
    for (const tagId of tagIds) {
      const users = await db.select({ count: sql<number>`count(*)` })
        .from(userTagRelations)
        .where(eq(userTagRelations.tagId, tagId));
      totalUsers += users[0]?.count || 0;
    }
    
    // Count check-ins for this schedule today
    const scheduleCheckins = allCheckins.filter(c => 
      c.scheduleId === schedule.id || tagIds.includes(c.tagId)
    );
    
    // Get unique users who checked in
    const uniqueUserIds = new Set(scheduleCheckins.map(c => c.nfcUserId));
    
    return {
      ...schedule,
      totalUsers,
      checkedInCount: uniqueUserIds.size,
      checkins: scheduleCheckins,
      tagIds,
    };
  }));
  
  return {
    schedules: schedulesWithCounts,
    allCheckins,
    currentTime: `${String(amazonNow.getHours()).padStart(2, '0')}:${String(amazonNow.getMinutes()).padStart(2, '0')}`,
    currentDay,
  };
}


// ============ NOTIFICATION GROUPS FUNCTIONS ============

// Create a new notification group
export async function createNotificationGroup(data: InsertNotificationGroup) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const result = await db.insert(notificationGroups).values(data).returning({ id: notificationGroups.id });
    return result[0].id;
  } catch (error) {
    console.error("[DB] createNotificationGroup failed:", error);
    throw error;
  }
}

// Get all notification groups
export async function getAllNotificationGroups() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notificationGroups).orderBy(desc(notificationGroups.createdAt));
}

// Get notification group by ID
export async function getNotificationGroupById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(notificationGroups).where(eq(notificationGroups.id, id));
  return result[0] || null;
}

// Update notification group
export async function updateNotificationGroup(id: number, data: Partial<InsertNotificationGroup>) {
  const db = await getDb();
  if (!db) return;
  await db.update(notificationGroups).set(data).where(eq(notificationGroups.id, id));
}

// Delete notification group
export async function deleteNotificationGroup(id: number) {
  const db = await getDb();
  if (!db) return;
  // Delete related records first
  await db.delete(groupScheduleRelations).where(eq(groupScheduleRelations.groupId, id));
  await db.delete(groupUserRelations).where(eq(groupUserRelations.groupId, id));
  await db.delete(notificationGroups).where(eq(notificationGroups.id, id));
}

// ============ GROUP-SCHEDULE RELATIONS ============

// Link a schedule to a group
export async function addScheduleToGroup(groupId: number, scheduleId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Check if relation already exists
  const existing = await db.select()
    .from(groupScheduleRelations)
    .where(and(
      eq(groupScheduleRelations.groupId, groupId),
      eq(groupScheduleRelations.scheduleId, scheduleId)
    ));
  
  if (existing.length > 0) return existing[0].id;
  
  const result = await db.insert(groupScheduleRelations).values({ groupId, scheduleId }).returning({ id: groupScheduleRelations.id });
  const userIds = await findUsersCheckedInSchedule(scheduleId);
  for (const userId of userIds) {
    await addUserToGroup(groupId, userId, 'auto', scheduleId);
  }
  return result[0].id;
}

// Remove a schedule from a group
export async function removeScheduleFromGroup(groupId: number, scheduleId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(groupScheduleRelations).where(
    and(
      eq(groupScheduleRelations.groupId, groupId),
      eq(groupScheduleRelations.scheduleId, scheduleId)
    )
  );
  await db.delete(groupUserRelations).where(
    and(
      eq(groupUserRelations.groupId, groupId),
      eq(groupUserRelations.sourceScheduleId, scheduleId)
    )
  );
}

// Get all schedules for a group
export async function getGroupSchedules(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const relations = await db.select({
    scheduleId: groupScheduleRelations.scheduleId,
    scheduleName: checkinSchedules.name,
    scheduleDescription: checkinSchedules.description,
    daysOfWeek: checkinSchedules.daysOfWeek,
    startTime: checkinSchedules.startTime,
    endTime: checkinSchedules.endTime,
    isActive: checkinSchedules.isActive,
  })
    .from(groupScheduleRelations)
    .leftJoin(checkinSchedules, eq(groupScheduleRelations.scheduleId, checkinSchedules.id))
    .where(eq(groupScheduleRelations.groupId, groupId));
  
  return relations;
}

// Get groups linked to a schedule
export async function getScheduleGroups(scheduleId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const relations = await db.select({
    groupId: groupScheduleRelations.groupId,
    groupName: notificationGroups.name,
    groupColor: notificationGroups.color,
  })
    .from(groupScheduleRelations)
    .leftJoin(notificationGroups, eq(groupScheduleRelations.groupId, notificationGroups.id))
    .where(eq(groupScheduleRelations.scheduleId, scheduleId));
  
  return relations;
}

export async function findUsersCheckedInSchedule(scheduleId: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.select({
    userId: automaticCheckins.nfcUserId,
  })
    .from(automaticCheckins)
    .where(eq(automaticCheckins.scheduleId, scheduleId))
    .groupBy(automaticCheckins.nfcUserId);

  return rows.map((row) => row.userId);
}

// ============ GROUP-USER RELATIONS ============

// Add user to a group
export async function addUserToGroup(groupId: number, nfcUserId: number, addedBy: 'auto' | 'manual' = 'manual', sourceScheduleId?: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Check if relation already exists
  const existing = await db.select()
    .from(groupUserRelations)
    .where(and(
      eq(groupUserRelations.groupId, groupId),
      eq(groupUserRelations.nfcUserId, nfcUserId)
    ));
  
  if (existing.length > 0) return existing[0].id;
  
  const result = await db.insert(groupUserRelations).values({ groupId, nfcUserId, addedBy, sourceScheduleId }).returning({ id: groupUserRelations.id });
  return result[0].id;
}

// Remove user from a group
export async function removeUserFromGroup(groupId: number, nfcUserId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(groupUserRelations).where(
    and(
      eq(groupUserRelations.groupId, groupId),
      eq(groupUserRelations.nfcUserId, nfcUserId)
    )
  );
}

// Get all users in a group
export async function getGroupUsers(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const relations = await db.select({
    id: groupUserRelations.id,
    nfcUserId: groupUserRelations.nfcUserId,
    addedBy: groupUserRelations.addedBy,
    sourceScheduleId: groupUserRelations.sourceScheduleId,
    createdAt: groupUserRelations.createdAt,
    userName: nfcUsers.name,
    userEmail: nfcUsers.email,
    userPhone: nfcUsers.phone,
    deviceId: nfcUsers.deviceId,
  })
    .from(groupUserRelations)
    .leftJoin(nfcUsers, eq(groupUserRelations.nfcUserId, nfcUsers.id))
    .where(eq(groupUserRelations.groupId, groupId))
    .orderBy(desc(groupUserRelations.createdAt));
  
  return relations;
}

// Get groups a user belongs to
export async function getUserGroups(nfcUserId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const relations = await db.select({
    groupId: groupUserRelations.groupId,
    groupName: notificationGroups.name,
    groupColor: notificationGroups.color,
    redirectUrl: notificationGroups.redirectUrl,
    addedBy: groupUserRelations.addedBy,
  })
    .from(groupUserRelations)
    .leftJoin(notificationGroups, eq(groupUserRelations.groupId, notificationGroups.id))
    .where(eq(groupUserRelations.nfcUserId, nfcUserId));
  
  return relations;
}

// Get group count stats
export async function getGroupStats(groupId: number) {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalSchedules: 0 };
  
  const userCount = await db.select({ count: sql<number>`count(*)` })
    .from(groupUserRelations)
    .where(eq(groupUserRelations.groupId, groupId));
  
  const scheduleCount = await db.select({ count: sql<number>`count(*)` })
    .from(groupScheduleRelations)
    .where(eq(groupScheduleRelations.groupId, groupId));
  
  return {
    totalUsers: userCount[0]?.count || 0,
    totalSchedules: scheduleCount[0]?.count || 0,
  };
}

// Get all groups with stats
export async function getAllGroupsWithStats() {
  const db = await getDb();
  if (!db) return [];
  
  const groups = await getAllNotificationGroups();
  
  const groupsWithStats = await Promise.all(groups.map(async (group) => {
    const stats = await getGroupStats(group.id);
    return {
      ...group,
      ...stats,
    };
  }));
  
  return groupsWithStats;
}

export async function getGroupsWithStatsPaginated(page = 1, pageSize = 25) {
  const db = await getDb();
  if (!db) {
    return { items: [], total: 0, page, pageSize, totalPages: 1 };
  }

  const offset = Math.max((page - 1) * pageSize, 0);
  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(notificationGroups);
  const total = Number(totalResult[0]?.count || 0);

  const groups = await db.select({
    id: notificationGroups.id,
    name: notificationGroups.name,
    description: notificationGroups.description,
    redirectUrl: notificationGroups.redirectUrl,
    color: notificationGroups.color,
    isActive: notificationGroups.isActive,
    createdAt: notificationGroups.createdAt,
    updatedAt: notificationGroups.updatedAt,
  })
    .from(notificationGroups)
    .orderBy(desc(notificationGroups.createdAt))
    .limit(pageSize)
    .offset(offset);

  const groupsWithStats = await Promise.all(groups.map(async (group) => {
    const stats = await getGroupStats(group.id);
    return {
      ...group,
      ...stats,
    };
  }));

  const totalPages = total === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize));

  return {
    items: groupsWithStats,
    total,
    page,
    pageSize,
    totalPages,
  };
}

// Auto-add user to groups linked to a schedule (called on check-in)
export async function autoAddUserToScheduleGroups(nfcUserId: number, scheduleId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all groups linked to this schedule
  const groups = await getScheduleGroups(scheduleId);
  
  const addedGroups: number[] = [];
  
  for (const group of groups) {
    if (group.groupId) {
      await addUserToGroup(group.groupId, nfcUserId, 'auto', scheduleId);
      addedGroups.push(group.groupId);
    }
  }
  
  return addedGroups;
}

// Get redirect URL for user based on their groups (returns first group with URL)
export async function getGroupRedirectUrlForUser(nfcUserId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const userGroups = await getUserGroups(nfcUserId);
  
  // Find first group with a redirect URL
  for (const group of userGroups) {
    if (group.redirectUrl) {
      return group.redirectUrl;
    }
  }
  
  return null;
}
