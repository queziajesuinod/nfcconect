import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateToken, hashPassword, verifyPassword } from "../_core/jwt-auth";
import { getSessionCookieOptions } from "../_core/cookies";
import { getDb } from "../db";
import { users, perfis, type InsertUser } from "../../drizzle/schema";
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
        if (!foundUser.passwordHash || !verifyPassword(input.password, foundUser.passwordHash)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email ou senha invalidos",
          });
        }

        // Validar se usuario tem perfil de administrador
        if (!foundUser.perfilId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Usuario nao possui acesso ao sistema",
          });
        }

        // Buscar perfil do usuario
        const perfil = await db
          .select()
          .from(perfis)
          .where(eq(perfis.id, foundUser.perfilId))
          .limit(1);

        if (!perfil || perfil.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Perfil do usuario nao encontrado",
          });
        }

        // Validar se perfil eh administrador
        const userPerfil = perfil[0];
        const isAdmin = userPerfil.descricao?.toLowerCase().includes("admin");

        if (!isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem acessar o sistema",
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


});
