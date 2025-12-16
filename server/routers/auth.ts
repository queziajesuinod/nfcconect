import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateToken, verifyPassword } from "../_core/jwt-auth";
import { getSessionCookieOptions } from "../_core/cookies";
import { getDb } from "../db";
import { users, perfis } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "session";

export const authRouter = router({
  /**
   * Retorna dados do usuário autenticado
   */
  me: publicProcedure.query((opts) => opts.ctx.user),

  /**
   * Faz logout do usuário removendo o cookie de sessão
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  /**
   * Login com email e senha
   * Valida credenciais contra tabela Users
   * Verifica se usuário tem perfil de Administrador
   * Retorna JWT token em cookie httpOnly
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Buscar usuário no banco de dados
        const userResult = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (!userResult || userResult.length === 0) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email ou senha inválidos",
          });
        }

        const foundUser = userResult[0];

        // Verificar se usuário está ativo
        if (!foundUser.active) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Usuário inativo. Contate o administrador.",
          });
        }

        // Verificar se usuário tem hash de senha
        if (!foundUser.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email ou senha inválidos",
          });
        }

        // Verificar senha com bcrypt
        const passwordValid = await verifyPassword(input.password, foundUser.passwordHash);
        if (!passwordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email ou senha inválidos",
          });
        }

        // Validar se usuário tem perfil
        if (!foundUser.perfilId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Usuário não possui perfil atribuído",
          });
        }

        // Buscar perfil do usuário
        const perfilResult = await db
          .select()
          .from(perfis)
          .where(eq(perfis.id, foundUser.perfilId))
          .limit(1);

        if (!perfilResult || perfilResult.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Perfil do usuário não encontrado",
          });
        }

        // Validar se perfil é administrador
        const userPerfil = perfilResult[0];
        const isAdmin = userPerfil.descricao?.toLowerCase().includes("admin");

        if (!isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem acessar o sistema",
          });
        }

        // Gerar JWT token
        const token = await generateToken({
          userId: foundUser.id,
          email: foundUser.email || "",
          role: "admin",
        });

        // Salvar token em cookie httpOnly
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
