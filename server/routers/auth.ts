import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateToken, hashPassword, verifyPassword } from "../_core/jwt-auth";
import { getSessionCookieOptions } from "../_core/cookies";
import { getDb } from "../db";
import { users, type InsertUser } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "session";

export const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Buscar usuario no banco
        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (!user || user.length === 0 || !user[0].passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email ou senha invalidos",
          });
        }

        const foundUser = user[0];

        // Verificar senha
        if (!verifyPassword(input.password, foundUser.passwordHash)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email ou senha invalidos",
          });
        }

        // Gerar token JWT
        const token = await generateToken({
          userId: foundUser.id,
          email: foundUser.email || "",
          role: "user",
        });

        // Salvar token em cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return {
          success: true,
          token,
          user: {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Auth] Login error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao fazer login",
        });
      }
    }),

  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(2),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Verificar se usuario ja existe
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (existing && existing.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email ja cadastrado",
          });
        }

        // Hash da senha
        const passwordHash = hashPassword(input.password);

        // Criar novo usuario
        const newUserResult = await db
          .insert(users)
          .values({
            email: input.email,
            name: input.name,
            passwordHash,
            active: true,
          })
          .returning();

        if (!newUserResult || newUserResult.length === 0) {
          throw new Error("Failed to create user");
        }

        const newUser = newUserResult[0];

        // Gerar token JWT
        const token = await generateToken({
          userId: newUser.id,
          email: newUser.email || "",
          role: "user",
        });

        // Salvar token em cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return {
          success: true,
          token,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Auth] Register error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao registrar usuario",
        });
      }
    }),
});
