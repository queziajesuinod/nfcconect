import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { verifyToken } from "./jwt-auth";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

class SDKServer {
  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

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
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    try {
      const payload = await verifyToken(cookieValue);
      if (!payload) {
        console.warn("[Auth] Token verification failed");
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
      console.warn("[Auth] Session verification failed", String(error));
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

      // Return user object with JWT payload
      // Note: In a real app, you'd fetch from DB here
      return {
        id: session.userId,
        email: session.email,
        name: null,
        active: true,
        passwordHash: null,
        username: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        telefone: null,
        cpf: null,
        endereco: null,
      } as User;
    } catch (error) {
      console.error("[Auth] Authentication failed:", error);
      return null;
    }
  }
}

export const sdk = new SDKServer();
