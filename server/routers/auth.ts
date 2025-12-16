import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateToken, verifyPassword } from "../_core/jwt-auth";
import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";
import { createAdminUser, getDb } from "../db";
import { users, perfis } from "../../drizzle/schema";
import { eq, ilike } from "drizzle-orm";

const COOKIE_NAME = "session";
const REGISTRATION_SECRET = ENV.registrationSecret;

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
   * Registrar um administrador usando o secret configurado
   */
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Informe o nome completo"),
        email: z.string().email("Email inválido"),
        username: z.string().min(3, "Digite um username válido").optional(),
        password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
        secret: z.string().min(1, "Informe o código de registro"),
      })
    )
    .mutation(async ({ input }) => {
      if (!REGISTRATION_SECRET) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Registro desabilitado",
        });
      }

      if (input.secret !== REGISTRATION_SECRET) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Código de registro inválido",
        });
      }

      try {
        const user = await createAdminUser({
          name: input.name,
          email: input.email,
          username: input.username || null,
          password: input.password,
        });

        return { success: true, id: user.id };
      } catch (error) {
        console.error("[Auth] Registration failed:", error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (error as Error).message || "Não foi possível criar o usuário",
        });
      }
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
        // Case-insensitive email lookup to avoid issues with mixed-case entries
        const userResult = await db
          .select()
          .from(users)
          .where(ilike(users.email, input.email))
          .limit(1);

        if (!userResult || userResult.length === 0) {
          console.warn("[Auth] User not found for email", input.email);
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
          console.warn("[Auth] User missing passwordHash", foundUser.id);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email ou senha inválidos",
          });
        }

        // Verificar senha (bcrypt ou hash legado com salt)
        const passwordValid = await verifyPassword(input.password, foundUser.passwordHash, (foundUser as any).salt);
        if (!passwordValid) {
          console.warn("[Auth] Invalid password for user", foundUser.id);
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

        const userPerfil = perfilResult[0];

        // Gerar JWT token
        const token = await generateToken({
          userId: foundUser.id,
          email: foundUser.email || "",
          role: "user",
          perfilId: foundUser.perfilId || undefined,
          username: (foundUser as any).username,
          name: foundUser.name || undefined,
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
            perfilId: foundUser.perfilId,
            perfil: userPerfil?.descricao,
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
