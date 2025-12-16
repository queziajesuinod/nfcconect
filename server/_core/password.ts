import { createHmac, randomBytes } from "crypto";
import * as bcrypt from "bcrypt";

export const LEGACY_SALT_LENGTH = 16;

export function generateLegacySalt(): string {
  return randomBytes(LEGACY_SALT_LENGTH).toString("hex");
}

export function hashLegacyPassword(password: string, salt: string): string {
  return createHmac("sha256", salt).update(password).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export function isBcryptHash(hash: string): boolean {
  return Boolean(hash?.startsWith("$2"));
}

export async function verifyPassword(password: string, hash: string, salt?: string | null): Promise<boolean> {
  if (isBcryptHash(hash)) {
    return bcrypt.compare(password, hash);
  }

  if (!salt) return false;

  const shaHash = hashLegacyPassword(password, salt);
  if (shaHash === hash) {
    return true;
  }

  if (shaHash.slice(0, 32) === hash) {
    return true;
  }

  const md5Hash = createHmac("md5", salt).update(password).digest("hex");
  return md5Hash === hash;
}
