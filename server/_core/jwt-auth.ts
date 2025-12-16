import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const SECRET = new TextEncoder().encode(JWT_SECRET);

export interface AuthPayload extends JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "user";
}

/**
 * Gera um JWT token
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
 * Hash simples de senha (usar bcrypt em produção!)
 * AVISO: Isso é apenas para demonstração. Use bcrypt em produção!
 */
export function hashPassword(password: string): string {
  // Para produção, use: import bcrypt from 'bcrypt'
  // return await bcrypt.hash(password, 10);
  
  // Implementação simples para desenvolvimento
  const encoder = new TextEncoder();
  const data = encoder.encode(password + JWT_SECRET);
  // Usar um hash simples (não seguro para produção!)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Verifica se a senha está correta
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
