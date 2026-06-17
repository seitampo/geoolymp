import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, savedPassword: string) {
  const [salt, savedHash] = savedPassword.split(":");

  if (!salt || !savedHash) {
    return false;
  }

  const hash = scryptSync(password, salt, 64);
  const savedHashBuffer = Buffer.from(savedHash, "hex");

  return hash.length === savedHashBuffer.length && timingSafeEqual(hash, savedHashBuffer);
}
