import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import {
  createNfcTag, getNfcTagByUid, getNfcTagById, getAllNfcTags, updateNfcTag, deleteNfcTag,
  createNfcUser, getNfcUserByTagId, getNfcUserById, getAllNfcUsers, updateNfcUser, validateNfcUser, deleteNfcUser,
  createConnectionLog, getConnectionLogs, getConnectionLogsByTagId, getConnectionLogsByUserId,
  createDynamicLink, getDynamicLinkByShortCode, getDynamicLinksByUserId, getAllDynamicLinks, updateDynamicLink, incrementLinkClickCount, deleteDynamicLink,
  createCheckin, getCheckinsByTagId, getCheckinsByUserId, getAllCheckins, getCheckinStats,
  getStats
} from "./db";

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Admin procedure - only admins can access
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ NFC TAG ROUTES ============
  tags: router({
    list: adminProcedure.query(async () => {
      return getAllNfcTags();
    }),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const tag = await getNfcTagById(input.id);
        if (!tag) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tag não encontrada' });
        return tag;
      }),

    getByUid: publicProcedure
      .input(z.object({ uid: z.string() }))
      .query(async ({ input }) => {
        return getNfcTagByUid(input.uid);
      }),

    create: adminProcedure
      .input(z.object({
        uid: z.string().min(1),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['active', 'inactive', 'blocked']).optional(),
        redirectUrl: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        radiusMeters: z.number().optional(),
        enableCheckin: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await getNfcTagByUid(input.uid);
        if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Tag com este UID já existe' });
        return createNfcTag(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['active', 'inactive', 'blocked']).optional(),
        redirectUrl: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        radiusMeters: z.number().optional(),
        enableCheckin: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateNfcTag(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteNfcTag(input.id);
        return { success: true };
      }),
  }),

  // ============ NFC USER ROUTES ============
  nfcUsers: router({
    list: adminProcedure.query(async () => {
      return getAllNfcUsers();
    }),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const user = await getNfcUserById(input.id);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
        return user;
      }),

    getByTagId: publicProcedure
      .input(z.object({ tagId: z.number() }))
      .query(async ({ input }) => {
        return getNfcUserByTagId(input.tagId);
      }),

    // Check if user exists for a tag UID (public - for auto-redirect)
    checkByTagUid: publicProcedure
      .input(z.object({ tagUid: z.string() }))
      .query(async ({ input, ctx }) => {
        const tag = await getNfcTagByUid(input.tagUid);
        if (!tag) {
          return { exists: false, tag: null, user: null, redirectUrl: null };
        }
        
        if (tag.status === 'blocked') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Esta tag está bloqueada' });
        }
        
        const existingUser = await getNfcUserByTagId(tag.id);
        if (existingUser) {
          // Update last connection and log
          await updateNfcUser(existingUser.id, { lastConnectionAt: new Date() });
          await createConnectionLog({
            tagId: tag.id,
            nfcUserId: existingUser.id,
            action: 'redirect',
            ipAddress: ctx.req.ip || ctx.req.headers['x-forwarded-for'] as string || null,
            userAgent: ctx.req.headers['user-agent'] || null,
          });
          return { 
            exists: true, 
            tag, 
            user: existingUser, 
            redirectUrl: tag.redirectUrl 
          };
        }
        
        return { exists: false, tag, user: null, redirectUrl: null };
      }),

    // Public endpoint for first NFC connection registration
    register: publicProcedure
      .input(z.object({
        tagUid: z.string().min(1),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        deviceInfo: z.string().optional(),
        userAgent: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Find or create tag
        let tag = await getNfcTagByUid(input.tagUid);
        if (!tag) {
          const result = await createNfcTag({ uid: input.tagUid });
          tag = await getNfcTagById(result.id);
        }
        
        if (!tag) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar tag' });
        
        if (tag.status === 'blocked') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Esta tag está bloqueada' });
        }

        // Check if user already exists for this tag
        const existingUser = await getNfcUserByTagId(tag.id);
        if (existingUser) {
          // Update last connection and log
          await updateNfcUser(existingUser.id, { lastConnectionAt: new Date() });
          await createConnectionLog({
            tagId: tag.id,
            nfcUserId: existingUser.id,
            action: 'validation',
            ipAddress: ctx.req.ip || ctx.req.headers['x-forwarded-for'] as string || null,
            userAgent: input.userAgent || ctx.req.headers['user-agent'] || null,
            latitude: input.latitude || null,
            longitude: input.longitude || null,
          });
          return { 
            isNewUser: false, 
            user: existingUser,
            redirectUrl: tag.redirectUrl 
          };
        }

        // Create new NFC user with geolocation
        const ipAddress = ctx.req.ip || ctx.req.headers['x-forwarded-for'] as string || null;
        const userAgent = input.userAgent || ctx.req.headers['user-agent'] || null;
        
        const result = await createNfcUser({
          tagId: tag.id,
          name: input.name || null,
          email: input.email || null,
          phone: input.phone || null,
          deviceInfo: input.deviceInfo || null,
          ipAddress,
          userAgent,
          registrationLatitude: input.latitude || null,
          registrationLongitude: input.longitude || null,
        });

        // Log first connection with location
        await createConnectionLog({
          tagId: tag.id,
          nfcUserId: result.id,
          action: 'first_read',
          ipAddress,
          userAgent,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
        });

        const newUser = await getNfcUserById(result.id);
        return { 
          isNewUser: true, 
          user: newUser,
          redirectUrl: tag.redirectUrl 
        };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        isValidated: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateNfcUser(id, data);
        return { success: true };
      }),

    validate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await validateNfcUser(input.id);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteNfcUser(input.id);
        return { success: true };
      }),
  }),

  // ============ CONNECTION LOGS ROUTES ============
  logs: router({
    list: adminProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getConnectionLogs(input?.limit || 100);
      }),

    byTag: adminProcedure
      .input(z.object({ tagId: z.number() }))
      .query(async ({ input }) => {
        return getConnectionLogsByTagId(input.tagId);
      }),

    byUser: adminProcedure
      .input(z.object({ nfcUserId: z.number() }))
      .query(async ({ input }) => {
        return getConnectionLogsByUserId(input.nfcUserId);
      }),
  }),

  // ============ DYNAMIC LINKS ROUTES ============
  links: router({
    list: adminProcedure.query(async () => {
      return getAllDynamicLinks();
    }),

    byUser: adminProcedure
      .input(z.object({ nfcUserId: z.number() }))
      .query(async ({ input }) => {
        return getDynamicLinksByUserId(input.nfcUserId);
      }),

    getByShortCode: publicProcedure
      .input(z.object({ shortCode: z.string() }))
      .query(async ({ input }) => {
        const link = await getDynamicLinkByShortCode(input.shortCode);
        if (!link) throw new TRPCError({ code: 'NOT_FOUND', message: 'Link não encontrado' });
        if (!link.isActive) throw new TRPCError({ code: 'FORBIDDEN', message: 'Link desativado' });
        if (link.expiresAt && link.expiresAt < new Date()) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Link expirado' });
        }
        await incrementLinkClickCount(link.id);
        return link;
      }),

    create: adminProcedure
      .input(z.object({
        nfcUserId: z.number(),
        targetUrl: z.string().url(),
        title: z.string().optional(),
        expiresAt: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const shortCode = nanoid(8);
        return createDynamicLink({
          ...input,
          shortCode,
        });
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        targetUrl: z.string().url().optional(),
        title: z.string().optional(),
        isActive: z.boolean().optional(),
        expiresAt: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateDynamicLink(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteDynamicLink(input.id);
        return { success: true };
      }),
  }),

  // ============ CHECK-IN ROUTES ============
  checkins: router({
    // Public endpoint for check-in
    create: publicProcedure
      .input(z.object({
        tagUid: z.string().min(1),
        latitude: z.string(),
        longitude: z.string(),
        deviceInfo: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Find tag
        const tag = await getNfcTagByUid(input.tagUid);
        if (!tag) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tag não encontrada' });
        }
        
        if (tag.status === 'blocked') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Esta tag está bloqueada' });
        }

        if (!tag.enableCheckin) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Check-in não habilitado para esta tag' });
        }

        // Find user for this tag
        const nfcUser = await getNfcUserByTagId(tag.id);
        if (!nfcUser) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado. Registre-se primeiro.' });
        }

        // Calculate distance if tag has location
        let distanceMeters: number | null = null;
        let isWithinRadius = false;

        if (tag.latitude && tag.longitude) {
          const tagLat = parseFloat(tag.latitude);
          const tagLon = parseFloat(tag.longitude);
          const userLat = parseFloat(input.latitude);
          const userLon = parseFloat(input.longitude);

          distanceMeters = Math.round(calculateDistance(tagLat, tagLon, userLat, userLon));
          isWithinRadius = distanceMeters <= (tag.radiusMeters || 100);
        }

        // Create check-in record
        const ipAddress = ctx.req.ip || ctx.req.headers['x-forwarded-for'] as string || null;
        
        const result = await createCheckin({
          tagId: tag.id,
          nfcUserId: nfcUser.id,
          latitude: input.latitude,
          longitude: input.longitude,
          distanceMeters,
          isWithinRadius,
          deviceInfo: input.deviceInfo || null,
          ipAddress,
        });

        // Log check-in action
        await createConnectionLog({
          tagId: tag.id,
          nfcUserId: nfcUser.id,
          action: 'checkin',
          ipAddress,
          userAgent: ctx.req.headers['user-agent'] || null,
          latitude: input.latitude,
          longitude: input.longitude,
          metadata: JSON.stringify({ distanceMeters, isWithinRadius }),
        });

        return {
          success: true,
          checkinId: result.id,
          distanceMeters,
          isWithinRadius,
          radiusMeters: tag.radiusMeters || 100,
          user: nfcUser,
        };
      }),

    // Admin: list all check-ins
    list: adminProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getAllCheckins(input?.limit || 100);
      }),

    // Admin: check-ins by tag
    byTag: adminProcedure
      .input(z.object({ tagId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return getCheckinsByTagId(input.tagId, input.limit || 100);
      }),

    // Admin: check-ins by user
    byUser: adminProcedure
      .input(z.object({ nfcUserId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return getCheckinsByUserId(input.nfcUserId, input.limit || 100);
      }),

    // Admin: check-in stats
    stats: adminProcedure.query(async () => {
      return getCheckinStats();
    }),
  }),

  // ============ STATS ROUTES ============
  stats: router({
    overview: adminProcedure.query(async () => {
      const baseStats = await getStats();
      const checkinStats = await getCheckinStats();
      return { ...baseStats, ...checkinStats };
    }),
  }),
});

export type AppRouter = typeof appRouter;
