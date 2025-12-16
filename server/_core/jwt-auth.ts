import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { hashPassword, verifyPassword } from "./password";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const SECRET = new TextEncoder().encode(JWT_SECRET);

export interface AuthPayload extends JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "user";
  perfilId?: string;
  username?: string | null;
  name?: string | null;
}

export async function generateToken(payload: AuthPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  return token;
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const verified = await jwtVerify(token, SECRET);
    return verified.payload as AuthPayload;
  } catch (error) {
    console.error("[JWT] Token verification failed:", error);
    return null;
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

export { hashPassword, verifyPassword };
