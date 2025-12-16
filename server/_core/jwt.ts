import { SignJWT, jwtVerify } from "jose";
import * as bcrypt from "bcrypt";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

const JWT_EXPIRATION = "24h"; // Token expires in 24 hours

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create JWT token
 */
export async function createToken(payload: {
  userId: string;
  email: string;
  name?: string;
}): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify JWT token
 */
export async function verifyToken(
  token: string
): Promise<{
  userId: string;
  email: string;
  name?: string;
  iat: number;
  exp: number;
} | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as any;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from cookie string
 */
export function getTokenFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "auth_token") {
      return decodeURIComponent(value);
    }
  }

  return null;
}

/**
 * Create Set-Cookie header
 */
export function createAuthCookie(token: string): string {
  return `auth_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
}

/**
 * Create logout cookie (expires immediately)
 */
export function createLogoutCookie(): string {
  return `auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
