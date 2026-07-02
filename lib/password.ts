import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Асинхронный scrypt: синхронная версия блокировала event loop на ~100 мс на каждый
// вход/регистрацию, что под нагрузкой останавливает обработку остальных запросов.
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keyLength: number,
) => Promise<Buffer>;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, savedPassword: string) {
  const [salt, savedHash] = savedPassword.split(":");

  if (!salt || !savedHash) {
    return false;
  }

  const hash = await scryptAsync(password, salt, 64);
  const savedHashBuffer = Buffer.from(savedHash, "hex");

  return hash.length === savedHashBuffer.length && timingSafeEqual(hash, savedHashBuffer);
}
