import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { getDb } from "../db";
import { refreshTokens, users } from "../../drizzle/schema";
import { eq, and, isNull, gt } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "");
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Gera um novo refresh token seguro
 */
export function generateRefreshTokenString(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Cria um novo refresh token no banco de dados
 */
export async function createRefreshToken(
  userId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const token = generateRefreshTokenString();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

  await db.insert(refreshTokens).values({
    userId,
    token,
    expiresAt,
    ipAddress,
    userAgent,
  });

  return token;
}

/**
 * Valida e retorna o refresh token se válido
 */
export async function validateRefreshToken(
  token: string
): Promise<{ userId: number; id: number } | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: refreshTokens.id,
      userId: refreshTokens.userId,
      expiresAt: refreshTokens.expiresAt,
      revokedAt: refreshTokens.revokedAt,
    })
    .from(refreshTokens)
    .where(eq(refreshTokens.token, token))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const refreshToken = result[0];

  // Verificar se foi revogado
  if (refreshToken.revokedAt) {
    return null;
  }

  // Verificar se expirou
  if (new Date() > refreshToken.expiresAt) {
    return null;
  }

  return {
    userId: refreshToken.userId,
    id: refreshToken.id,
  };
}

/**
 * Revoga um refresh token (logout)
 */
export async function revokeRefreshToken(tokenId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, tokenId));
}

/**
 * Revoga todos os refresh tokens de um usuário (logout em todos os dispositivos)
 */
export async function revokeAllUserTokens(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt)
      )
    );
}

/**
 * Limpa refresh tokens expirados (executar periodicamente)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .delete(refreshTokens)
    .where(gt(refreshTokens.expiresAt, new Date()));

  return 0; // Drizzle doesn't return rowCount for delete
}

/**
 * Cria um novo JWT session token
 */
export async function createSessionToken(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar usuário
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userResult.length === 0) {
    throw new Error("User not found");
  }

  const user = userResult[0];
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY);

  const token = await new SignJWT({
    sub: user.id.toString(),
    openId: user.openId,
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verifica se um JWT é válido
 */
export async function verifySessionToken(token: string): Promise<any> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * Renova a sessão usando refresh token
 * Retorna novo session token e refresh token
 */
export async function renewSession(
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ sessionToken: string; refreshToken: string } | null> {
  // Validar refresh token
  const validated = await validateRefreshToken(refreshToken);
  if (!validated) {
    return null;
  }

  // Criar novo session token
  const newSessionToken = await createSessionToken(validated.userId);

  // Criar novo refresh token
  const newRefreshToken = await createRefreshToken(
    validated.userId,
    ipAddress,
    userAgent
  );

  // Revogar token antigo
  await revokeRefreshToken(validated.id);

  return {
    sessionToken: newSessionToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Retorna o tempo de expiração da sessão (em ms)
 */
export function getSessionExpiryTime(): number {
  return SESSION_EXPIRY;
}

/**
 * Retorna o tempo de expiração do refresh token (em ms)
 */
export function getRefreshTokenExpiryTime(): number {
  return REFRESH_TOKEN_EXPIRY;
}
