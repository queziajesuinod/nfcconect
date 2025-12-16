import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database functions
vi.mock("./db", () => ({
  createNfcTag: vi.fn().mockResolvedValue({ id: 1 }),
  getNfcTagByUid: vi.fn().mockResolvedValue(null),
  getNfcTagById: vi.fn().mockResolvedValue({ id: 1, uid: "TEST-UID-123", name: "Test Tag", status: "active" }),
  getAllNfcTags: vi.fn().mockResolvedValue([
    { id: 1, uid: "TAG-001", name: "Tag 1", status: "active", createdAt: new Date() },
    { id: 2, uid: "TAG-002", name: "Tag 2", status: "inactive", createdAt: new Date() },
  ]),
  getNfcTagsPaginated: vi.fn().mockResolvedValue({
    items: [
      { id: 1, uid: "TAG-001", name: "Tag 1", status: "active", createdAt: new Date() },
      { id: 2, uid: "TAG-002", name: "Tag 2", status: "inactive", createdAt: new Date() },
    ],
    total: 2,
  }),
  updateNfcTag: vi.fn().mockResolvedValue(undefined),
  deleteNfcTag: vi.fn().mockResolvedValue(undefined),
  createNfcUser: vi.fn().mockResolvedValue({ id: 1 }),
  getNfcUserByDeviceId: vi.fn().mockResolvedValue(null),
  getNfcUserById: vi.fn().mockResolvedValue({ id: 1, name: "Test User", deviceId: "test-device-id" }),
  getUserTagRelation: vi.fn().mockResolvedValue(null),
  createUserTagRelation: vi.fn().mockResolvedValue({ id: 1 }),
  updateUserTagRelation: vi.fn().mockResolvedValue(undefined),
  getAllNfcUsersByTagId: vi.fn().mockResolvedValue([]),
  getTagsByUserId: vi.fn().mockResolvedValue([]),
  getAllNfcUsers: vi.fn().mockResolvedValue([]),
  updateNfcUser: vi.fn().mockResolvedValue(undefined),
  validateNfcUser: vi.fn().mockResolvedValue(undefined),
  deleteNfcUser: vi.fn().mockResolvedValue(undefined),
  createConnectionLog: vi.fn().mockResolvedValue({ id: 1 }),
  getConnectionLogs: vi.fn().mockResolvedValue([]),
  getConnectionLogsByTagId: vi.fn().mockResolvedValue([]),
  getConnectionLogsByUserId: vi.fn().mockResolvedValue([]),
  createDynamicLink: vi.fn().mockResolvedValue({ id: 1 }),
  getDynamicLinkByShortCode: vi.fn().mockResolvedValue(null),
  getDynamicLinksByUserId: vi.fn().mockResolvedValue([]),
  getAllDynamicLinks: vi.fn().mockResolvedValue([]),
  updateDynamicLink: vi.fn().mockResolvedValue(undefined),
  incrementLinkClickCount: vi.fn().mockResolvedValue(undefined),
  deleteDynamicLink: vi.fn().mockResolvedValue(undefined),
  getStats: vi.fn().mockResolvedValue({ totalTags: 10, totalUsers: 5, totalConnections: 50, totalLinks: 3 }),
  createCheckin: vi.fn().mockResolvedValue({ id: 1 }),
  getCheckinsByTagId: vi.fn().mockResolvedValue([]),
  getCheckinsByUserId: vi.fn().mockResolvedValue([]),
  getAllCheckins: vi.fn().mockResolvedValue([]),
  getCheckinStats: vi.fn().mockResolvedValue({ totalCheckins: 10, checkinsWithinRadius: 8, checkinsOutsideRadius: 2, checkinsToday: 3 }),
  // Schedule functions
  createCheckinSchedule: vi.fn().mockResolvedValue({ id: 1 }),
  getCheckinScheduleById: vi.fn().mockResolvedValue({ id: 1, tagId: 1, name: "Test Schedule", daysOfWeek: "0,6", startTime: "08:00", endTime: "10:00", isActive: true }),
  getCheckinSchedulesByTagId: vi.fn().mockResolvedValue([]),
  getAllCheckinSchedules: vi.fn().mockResolvedValue([]),
  getActiveSchedulesForDay: vi.fn().mockResolvedValue([]),
  updateCheckinSchedule: vi.fn().mockResolvedValue(undefined),
  deleteCheckinSchedule: vi.fn().mockResolvedValue(undefined),
  // Automatic check-in functions
  createAutomaticCheckin: vi.fn().mockResolvedValue({ id: 1 }),
  getAllAutomaticCheckins: vi.fn().mockResolvedValue([]),
  getAutomaticCheckinsByScheduleId: vi.fn().mockResolvedValue([]),
  updateAutomaticCheckinStatus: vi.fn().mockResolvedValue(undefined),
  hasUserCheckinForScheduleToday: vi.fn().mockResolvedValue(false),
  // User location functions
  createUserLocationUpdate: vi.fn().mockResolvedValue({ id: 1 }),
  getLatestUserLocation: vi.fn().mockResolvedValue(null),
  getUsersWithRecentLocation: vi.fn().mockResolvedValue([]),
  getUsersByTagIdWithRecentLocation: vi.fn().mockResolvedValue([]),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {
        "user-agent": "Mozilla/5.0 Test Agent",
        "x-forwarded-for": "192.168.1.1",
      },
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("NFC Tags Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admin can list all tags", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.list();

    expect(result.items).toHaveLength(2);
    expect(result.items[0].uid).toBe("TAG-001");
  });

  it("regular user cannot list tags (forbidden)", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.tags.list()).rejects.toThrow("Acesso restrito a administradores");
  });

  it("admin can create a new tag", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.create({
      uid: "NEW-TAG-001",
      name: "New Tag",
      status: "active",
    });

    expect(result).toHaveProperty("id");
  });

  it("admin can update a tag", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.update({
      id: 1,
      name: "Updated Tag Name",
      status: "inactive",
    });

    expect(result.success).toBe(true);
  });

  it("admin can delete a tag", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.delete({ id: 1 });

    expect(result.success).toBe(true);
  });
});

describe("NFC User Registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("public user can register via NFC tag", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.nfcUsers.register({
      tagUid: "NEW-TAG-UID",
      deviceId: "test-device-id-12345",
      name: "John Doe",
      email: "john@example.com",
    });

    expect(result).toHaveProperty("isNewUser");
    expect(result).toHaveProperty("user");
  });
});

describe("Stats Router", () => {
  it("admin can get overview stats", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.overview();

    expect(result.totalTags).toBe(10);
    expect(result.totalUsers).toBe(5);
    expect(result.totalConnections).toBe(50);
    expect(result.totalLinks).toBe(3);
  });

  it("regular user cannot access stats", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.stats.overview()).rejects.toThrow("Acesso restrito a administradores");
  });
});

describe("Connection Logs Router", () => {
  it("admin can list connection logs", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.logs.list({ limit: 50 });

    expect(Array.isArray(result)).toBe(true);
  });
});
