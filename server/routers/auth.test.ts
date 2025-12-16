import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "../_core/jwt-auth";
import type { AuthPayload } from "../_core/jwt-auth";

describe("JWT Authentication", () => {
  describe("Password Hashing with bcrypt", () => {
    it("should hash password with bcrypt", async () => {
      const password = "test-password-123";
      const hash = await hashPassword(password);

      // Hash should be different from password
      expect(hash).not.toBe(password);
      // Hash should be a string
      expect(typeof hash).toBe("string");
      // Hash should be long (bcrypt hashes are ~60 chars)
      expect(hash.length).toBeGreaterThan(50);
    });

    it("should verify correct password", async () => {
      const password = "my-secret-password";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "my-secret-password";
      const wrongPassword = "wrong-password";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it("should produce different hashes for same password", async () => {
      const password = "same-password";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Hashes should be different (bcrypt uses random salt)
      expect(hash1).not.toBe(hash2);
      // But both should verify correctly
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe("JWT Token Generation and Verification", () => {
    it("should generate valid JWT token", async () => {
      const payload: AuthPayload = {
        userId: "user-123",
        email: "test@example.com",
        role: "admin",
      };

      const token = await generateToken(payload);

      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
      // JWT tokens have 3 parts separated by dots
      expect(token.split(".").length).toBe(3);
    });

    it("should verify and decode valid token", async () => {
      const payload: AuthPayload = {
        userId: "user-456",
        email: "admin@example.com",
        role: "admin",
      };

      const token = await generateToken(payload);
      const decoded = await verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
    });

    it("should reject invalid token", async () => {
      const invalidToken = "invalid.token.here";
      const decoded = await verifyToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it("should reject tampered token", async () => {
      const payload: AuthPayload = {
        userId: "user-789",
        email: "user@example.com",
        role: "user",
      };

      const token = await generateToken(payload);
      // Tamper with token by changing a character
      const tamperedToken = token.slice(0, -5) + "xxxxx";
      const decoded = await verifyToken(tamperedToken);

      expect(decoded).toBeNull();
    });

    it("should include iat and exp claims", async () => {
      const payload: AuthPayload = {
        userId: "user-999",
        email: "test@example.com",
        role: "admin",
      };

      const token = await generateToken(payload);
      const decoded = await verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.iat).toBeDefined();
      expect(decoded?.exp).toBeDefined();
      expect(typeof decoded?.iat).toBe("number");
      expect(typeof decoded?.exp).toBe("number");
      // exp should be greater than iat
      expect(decoded!.exp).toBeGreaterThan(decoded!.iat!);
    });
  });

  describe("Token Expiration", () => {
    it("should have token expiration set to 7 days", async () => {
      const payload: AuthPayload = {
        userId: "user-exp",
        email: "exp@example.com",
        role: "user",
      };

      const token = await generateToken(payload);
      const decoded = await verifyToken(token);

      expect(decoded).not.toBeNull();
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded!.exp! - now;
      
      // Should expire in approximately 7 days (604800 seconds)
      // Allow 60 second margin for test execution
      expect(expiresIn).toBeGreaterThan(604740);
      expect(expiresIn).toBeLessThan(604860);
    });
  });

  describe("Authentication Flow", () => {
    it("should complete full authentication flow", async () => {
      // 1. Hash password
      const plainPassword = "user-password-123";
      const passwordHash = await hashPassword(plainPassword);

      // 2. Verify password is correct
      const passwordValid = await verifyPassword(plainPassword, passwordHash);
      expect(passwordValid).toBe(true);

      // 3. Generate token
      const payload: AuthPayload = {
        userId: "user-flow-test",
        email: "flow@example.com",
        role: "admin",
      };
      const token = await generateToken(payload);

      // 4. Verify token
      const decoded = await verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
    });
  });
});
