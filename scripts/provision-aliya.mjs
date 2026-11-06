import {
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
  publicEncrypt,
  constants,
} from "node:crypto";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

// Temporary, idempotent provisioning for the user-authorized teacher workspace.
// Credentials are encrypted to a task-local private key; no plaintext password
// or password hash is checked into source control or printed to build logs.
const secret = process.env.AUTH_SECRET;
if (!secret)
  throw new Error(
    "AUTH_SECRET is required to provision the teacher workspace.",
  );
const derive = (label) =>
  createHmac("sha256", secret)
    .update("geoolymp/aliya-workspace/20261106/" + label)
    .digest("base64url");
const teacherPassword = "Aliya-" + derive("teacher").slice(0, 14);
const studentPassword = "Geo-" + derive("guest").slice(0, 6);
const scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + (await scryptAsync(password, salt, 64)).toString("hex");
}
async function matches(password, saved) {
  const [salt, hash] = saved.split(":");
  if (!salt || !hash) return false;
  const candidate = await scryptAsync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  return (
    original.length === candidate.length && timingSafeEqual(original, candidate)
  );
}
const teacher = {
  email: "aliya.maksutovna.20261106@geoolymp.invalid",
  name: "Алия Максутовна",
  role: "TEACHER",
  password: teacherPassword,
};
const guest = {
  email: "oqyshy.aliya.20261106@geoolymp.invalid",
  name: "Оқушы",
  role: "STUDENT",
  password: studentPassword,
};
const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const invitation =
  "GEO-" +
  Array.from(
    createHmac("sha256", secret)
      .update("aliya-group-invite-20261106")
      .digest()
      .subarray(0, 8),
    (byte) => alphabet[byte % alphabet.length],
  ).join("");
const db = new PrismaClient();
try {
  const hashes = await Promise.all([
    hashPassword(teacher.password),
    hashPassword(guest.password),
  ]);
  const groupId = await db.$transaction(
    async (tx) => {
      const accounts = [];
      for (const [index, account] of [teacher, guest].entries()) {
        let existing = await tx.user.findUnique({
          where: { email: account.email },
        });
        if (existing) {
          if (
            existing.name !== account.name ||
            existing.role !== account.role ||
            !existing.emailVerified ||
            !(await matches(account.password, existing.password))
          )
            throw new Error(
              "A provisioned login already belongs to a different account or password; refusing to overwrite it.",
            );
        } else
          existing = await tx.user.create({
            data: {
              email: account.email,
              name: account.name,
              role: account.role,
              password: hashes[index],
              emailVerified: true,
            },
          });
        accounts.push(existing);
      }
      let group = await tx.group.findUnique({
        where: { inviteCode: invitation },
      });
      if (group && group.teacherId !== accounts[0].id)
        throw new Error(
          "Workspace invitation collision; no existing group will be modified.",
        );
      if (!group)
        group = await tx.group.create({
          data: {
            name: "География — Алия Максутовна",
            description:
              "Подготовка к олимпиадам по географии. Задания по годам и турам, практика без таймера.",
            teacherId: accounts[0].id,
            inviteCode: invitation,
          },
        });
      await tx.membership.upsert({
        where: {
          userId_groupId: { userId: accounts[1].id, groupId: group.id },
        },
        update: {},
        create: { userId: accounts[1].id, groupId: group.id },
      });
      const links = [
        {
          title: "BeyondOlympiads — география",
          description: "Архив олимпиад по географии Beyond Curriculum.",
          url: "https://olympiads.bc-pf.org/geography",
        },
        {
          title: "РНПЦ «Дарын»",
          description:
            "Официальный сайт Республиканского научно-практического центра «Дарын».",
          url: "https://daryn.kz/",
        },
      ];
      for (const link of links)
        if (
          !(await tx.material.findFirst({
            where: { groupId: group.id, url: link.url, type: "LINK" },
          }))
        )
          await tx.material.create({
            data: {
              ...link,
              groupId: group.id,
              type: "LINK",
              isPublished: true,
            },
          });
      return group.id;
    },
    { timeout: 30000 },
  );
  const publicKey = await readFile(
    new URL("./aliya-public-key.pem", import.meta.url),
  );
  const payload = {
    teacher: { login: "aliya", password: teacherPassword },
    student: { login: "oqyshy", password: studentPassword },
    groupId,
  };
  const encrypted = publicEncrypt(
    {
      key: publicKey,
      oaepHash: "sha256",
      padding: constants.RSA_PKCS1_OAEP_PADDING,
    },
    Buffer.from(JSON.stringify(payload)),
  );
  await mkdir("public", { recursive: true });
  await writeFile(
    "public/aliya-workspace-20261106.json",
    JSON.stringify({ version: 1, encrypted: encrypted.toString("base64") }),
  );
  console.log(
    "Teacher workspace prepared: two accounts, group membership and two material links. Credentials encrypted for the task owner.",
  );
} catch (error) {
  console.error(
    error.code
      ? `Teacher workspace setup failed (${error.code}).`
      : error.message,
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
