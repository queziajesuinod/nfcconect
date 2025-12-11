import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import {
  createNfcTag, getNfcTagByUid, getNfcTagById, getAllNfcTags, updateNfcTag, deleteNfcTag,
  createNfcUser, getNfcUserByDeviceId, getNfcUserById, getAllNfcUsers, updateNfcUser, validateNfcUser, deleteNfcUser,
  getUserTagRelation, createUserTagRelation, updateUserTagRelation, getAllNfcUsersByTagId, getTagsByUserId,
  createConnectionLog, getConnectionLogs, getConnectionLogsByTagId, getConnectionLogsByUserId,
  createDynamicLink, getDynamicLinkByShortCode, getDynamicLinksByUserId, getAllDynamicLinks, updateDynamicLink, incrementLinkClickCount, deleteDynamicLink,
  createCheckin, getCheckinsByTagId, getCheckinsByUserId, getAllCheckins, getCheckinStats,
  getStats,
  createCheckinSchedule, getCheckinScheduleById, getCheckinSchedulesByTagId, getAllCheckinSchedules, getActiveSchedulesForDay, updateCheckinSchedule, deleteCheckinSchedule,
  createAutomaticCheckin, getAllAutomaticCheckins, getAutomaticCheckinsByScheduleId, updateAutomaticCheckinStatus, hasUserCheckinForScheduleToday,
  createUserLocationUpdate, getLatestUserLocation, getUsersWithRecentLocation, getUsersByTagIdWithRecentLocation
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
        // Return all users connected to this tag
        return getAllNfcUsersByTagId(input.tagId);
      }),

    // Get all tags connected to a user
    getTagsByUserId: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getTagsByUserId(input.userId);
      }),

    // Check if user exists for a tag UID and device (public - for auto-redirect)
    checkByTagUid: publicProcedure
      .input(z.object({ tagUid: z.string(), deviceId: z.string() }))
      .query(async ({ input, ctx }) => {
        const tag = await getNfcTagByUid(input.tagUid);
        if (!tag) {
          return { exists: false, tag: null, user: null, redirectUrl: null };
        }
        
        if (tag.status === 'blocked') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Esta tag está bloqueada' });
        }
        
        // Check if user exists by deviceId
        const existingUser = await getNfcUserByDeviceId(input.deviceId);
        if (existingUser) {
          // Check if user is connected to this tag
          const relation = await getUserTagRelation(existingUser.id, tag.id);
          if (relation) {
            // Update last connection and log
            await updateNfcUser(existingUser.id, { lastConnectionAt: new Date() });
            await updateUserTagRelation(existingUser.id, tag.id);
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
        }
        
        return { exists: false, tag, user: null, redirectUrl: null };
      }),

    // Public endpoint for first NFC connection registration
    register: publicProcedure
      .input(z.object({
        tagUid: z.string().min(1),
        deviceId: z.string().min(1), // Unique device identifier
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

        const ipAddress = ctx.req.ip || ctx.req.headers['x-forwarded-for'] as string || null;
        const userAgent = input.userAgent || ctx.req.headers['user-agent'] || null;

        // Check if user already exists by deviceId
        let existingUser = await getNfcUserByDeviceId(input.deviceId);
        
        if (existingUser) {
          // User exists, check if already connected to this tag
          const existingRelation = await getUserTagRelation(existingUser.id, tag.id);
          
          if (existingRelation) {
            // Already connected to this tag, just update last connection
            await updateNfcUser(existingUser.id, { lastConnectionAt: new Date() });
            await updateUserTagRelation(existingUser.id, tag.id);
            await createConnectionLog({
              tagId: tag.id,
              nfcUserId: existingUser.id,
              action: 'validation',
              ipAddress,
              userAgent,
              latitude: input.latitude || null,
              longitude: input.longitude || null,
            });
            return { 
              isNewUser: false, 
              user: existingUser,
              redirectUrl: tag.redirectUrl 
            };
          } else {
            // User exists but not connected to this tag - create new relation
            await createUserTagRelation({
              userId: existingUser.id,
              tagId: tag.id,
            });
            await updateNfcUser(existingUser.id, { lastConnectionAt: new Date() });
            await createConnectionLog({
              tagId: tag.id,
              nfcUserId: existingUser.id,
              action: 'first_read',
              ipAddress,
              userAgent,
              latitude: input.latitude || null,
              longitude: input.longitude || null,
            });
            return { 
              isNewUser: false, // User already has data, just connected to new tag
              user: existingUser,
              redirectUrl: tag.redirectUrl 
            };
          }
        }

        // Create new NFC user with geolocation and device ID
        const result = await createNfcUser({
          deviceId: input.deviceId,
          name: input.name || null,
          email: input.email || null,
          phone: input.phone || null,
          deviceInfo: input.deviceInfo || null,
          ipAddress,
          userAgent,
          registrationLatitude: input.latitude || null,
          registrationLongitude: input.longitude || null,
        });

        // Create user-tag relationship
        await createUserTagRelation({
          userId: result.id,
          tagId: tag.id,
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
        deviceId: z.string().min(1),
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

        // Find user by deviceId
        const nfcUser = await getNfcUserByDeviceId(input.deviceId);
        if (!nfcUser) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado. Registre-se primeiro.' });
        }

        // Check if user is connected to this tag
        const relation = await getUserTagRelation(nfcUser.id, tag.id);
        if (!relation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não conectado a esta tag.' });
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

  // ============ CHECK-IN SCHEDULE ROUTES ============
  schedules: router({
    // Admin: list all schedules
    list: adminProcedure.query(async () => {
      return getAllCheckinSchedules();
    }),

    // Admin: get schedule by ID
    byId: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const schedule = await getCheckinScheduleById(input.id);
        if (!schedule) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' });
        return schedule;
      }),

    // Admin: get schedules by tag
    byTag: adminProcedure
      .input(z.object({ tagId: z.number() }))
      .query(async ({ input }) => {
        return getCheckinSchedulesByTagId(input.tagId);
      }),

    // Admin: create schedule
    create: adminProcedure
      .input(z.object({
        tagId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        daysOfWeek: z.string(), // "0,3,6" for Sun, Wed, Sat
        startTime: z.string(), // "08:00"
        endTime: z.string(), // "10:00"
        timezone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Validate tag exists and has geolocation
        const tag = await getNfcTagById(input.tagId);
        if (!tag) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tag não encontrada' });
        if (!tag.latitude || !tag.longitude) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tag precisa ter localização configurada para agendamentos' });
        }
        if (!tag.enableCheckin) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tag precisa ter check-in habilitado' });
        }

        // Validate time format
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(input.startTime) || !timeRegex.test(input.endTime)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Formato de horário inválido. Use HH:MM' });
        }

        // Validate days of week
        const days = input.daysOfWeek.split(',').map(d => parseInt(d.trim()));
        if (days.some(d => isNaN(d) || d < 0 || d > 6)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Dias da semana inválidos. Use 0-6 (0=Domingo)' });
        }

        return createCheckinSchedule({
          tagId: input.tagId,
          name: input.name || null,
          description: input.description || null,
          daysOfWeek: input.daysOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          timezone: input.timezone || 'America/Sao_Paulo',
        });
      }),

    // Admin: update schedule
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        daysOfWeek: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        isActive: z.boolean().optional(),
        timezone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateCheckinSchedule(id, data);
        return { success: true };
      }),

    // Admin: delete schedule
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCheckinSchedule(input.id);
        return { success: true };
      }),

    // Admin: trigger automatic check-in for a schedule (manual trigger for testing)
    triggerCheckin: adminProcedure
      .input(z.object({ scheduleId: z.number() }))
      .mutation(async ({ input }) => {
        const schedule = await getCheckinScheduleById(input.scheduleId);
        if (!schedule) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' });

        const tag = await getNfcTagById(schedule.tagId);
        if (!tag || !tag.latitude || !tag.longitude) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tag sem localização configurada' });
        }

        // Get users with recent location for this tag
        const usersWithLocation = await getUsersByTagIdWithRecentLocation(schedule.tagId, 60);

        const results = [];
        const skipped = [];
        const now = new Date();

        for (const { user, location } of usersWithLocation) {
          // Check if user already has a check-in for this schedule today
          const alreadyCheckedIn = await hasUserCheckinForScheduleToday(schedule.id, user.id, now);
          
          if (alreadyCheckedIn) {
            skipped.push({
              userId: user.id,
              userName: user.name,
              reason: 'Já fez check-in neste período hoje',
            });
            continue;
          }

          const userLat = parseFloat(location.latitude);
          const userLon = parseFloat(location.longitude);
          const tagLat = parseFloat(tag.latitude);
          const tagLon = parseFloat(tag.longitude);

          const distance = Math.round(calculateDistance(tagLat, tagLon, userLat, userLon));
          const isWithinRadius = distance <= (tag.radiusMeters || 100);

          // Create automatic check-in record
          const checkinResult = await createAutomaticCheckin({
            scheduleId: schedule.id,
            tagId: schedule.tagId,
            nfcUserId: user.id,
            userLatitude: location.latitude,
            userLongitude: location.longitude,
            distanceMeters: distance,
            isWithinRadius,
            scheduledDate: now,
            periodStart: schedule.startTime,
            periodEnd: schedule.endTime,
            checkinTime: now,
            status: isWithinRadius ? 'completed' : 'failed',
            errorMessage: isWithinRadius ? null : `Usuário fora do raio (${distance}m > ${tag.radiusMeters}m)`,
          });

          results.push({
            userId: user.id,
            userName: user.name,
            distance,
            isWithinRadius,
            checkinId: checkinResult.id,
          });
        }

        return {
          success: true,
          scheduleName: schedule.name,
          usersProcessed: results.length,
          usersSkipped: skipped.length,
          usersWithinRadius: results.filter(r => r.isWithinRadius).length,
          results,
          skipped,
        };
      }),
  }),

  // ============ AUTOMATIC CHECK-IN ROUTES ============
  automaticCheckins: router({
    // Admin: list all automatic check-ins
    list: adminProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getAllAutomaticCheckins(input?.limit || 100);
      }),

    // Admin: get by schedule
    bySchedule: adminProcedure
      .input(z.object({ scheduleId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return getAutomaticCheckinsByScheduleId(input.scheduleId, input.limit || 100);
      }),
  }),

  // ============ USER LOCATION ROUTES ============
  userLocation: router({
    // Public: update user location (for automatic check-in)
    update: publicProcedure
      .input(z.object({
        deviceId: z.string().min(1),
        latitude: z.string(),
        longitude: z.string(),
        accuracy: z.number().optional(),
        deviceInfo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Find user by deviceId
        const user = await getNfcUserByDeviceId(input.deviceId);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado. Registre-se primeiro.' });

        // Save location update
        await createUserLocationUpdate({
          nfcUserId: user.id,
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy || null,
          deviceInfo: input.deviceInfo || null,
        });

        return { success: true, userId: user.id };
      }),

    // Admin: get users with recent location
    recentLocations: adminProcedure
      .input(z.object({ minutesAgo: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getUsersWithRecentLocation(input?.minutesAgo || 30);
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
