import { SignJWT, jwtVerify } from "jose";
import * as bcrypt from "bcrypt";
import type { JWTPayload } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const SECRET = new TextEncoder().encode(JWT_SECRET);

export interface AuthPayload extends JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "user";
}

/**
 * Gera um JWT token com expiração de 7 dias
 */
export async function generateToken(payload: AuthPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  return token;
}

/**
 * Verifica e decodifica um JWT token
 */
export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const verified = await jwtVerify(token, SECRET);
    return verified.payload as AuthPayload;
  } catch (error) {
    console.error("[JWT] Token verification failed:", error);
    return null;
  }
}

/**
 * Extrai o token do header Authorization
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

/**
 * Hash de senha com bcrypt (10 rounds)
 * Seguro para produção
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verifica se a senha está correta comparando com hash bcrypt
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
