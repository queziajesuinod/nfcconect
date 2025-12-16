import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { verifyToken } from "./jwt-auth";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ userId: string; email: string; role: string } | null> {
    if (!cookieValue) {
      console.debug("[Auth] Missing session cookie");
      return null;
    }

    try {
      const payload = await verifyToken(cookieValue);
      if (!payload) {
        console.debug("[Auth] Token verification failed");
        return null;
      }

      const { userId, email, role } = payload;

      if (!isNonEmptyString(userId) || !isNonEmptyString(email)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }

      return {
        userId,
        email,
        role: role || "user",
      };
    } catch (error) {
      console.debug("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User | null> {
    try {
      const cookies = this.parseCookies(req.headers.cookie);
      const sessionCookie = cookies.get(COOKIE_NAME);
      const session = await this.verifySession(sessionCookie);

      if (!session) {
        return null;
      }

      // Fetch user from database to get full user object
      const db = await getDb();
      if (!db) {
        console.error("[Auth] Database not available");
        return null;
      }

      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!userResult || userResult.length === 0) {
        console.warn("[Auth] User not found in database");
        return null;
      }

      return userResult[0];
    } catch (error) {
      console.error("[Auth] Authentication failed:", error);
      return null;
    }
  }
}

export const sdk = new SDKServer();
