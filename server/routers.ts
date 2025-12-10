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
  getStats
} from "./db";

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

    // Public endpoint for first NFC connection registration
    register: publicProcedure
      .input(z.object({
        tagUid: z.string().min(1),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        deviceInfo: z.string().optional(),
        userAgent: z.string().optional(),
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
          });
          return { 
            isNewUser: false, 
            user: existingUser,
            redirectUrl: tag.redirectUrl 
          };
        }

        // Create new NFC user
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
        });

        // Log first connection
        await createConnectionLog({
          tagId: tag.id,
          nfcUserId: result.id,
          action: 'first_read',
          ipAddress,
          userAgent,
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

  // ============ STATS ROUTES ============
  stats: router({
    overview: adminProcedure.query(async () => {
      return getStats();
    }),
  }),
});

export type AppRouter = typeof appRouter;
