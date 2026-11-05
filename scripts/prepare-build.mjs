import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";

function prisma(...args) {
  const result = spawnSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", ...args],
    { stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) throw new Error("Prisma preparation failed.");
}
prisma("generate");
if (process.env.VERCEL === "1") {
  const { PrismaClient } = await import("@prisma/client");
  const client = new PrismaClient({
    datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });
  try {
    const migrations = (
      await readdir("prisma/migrations", { withFileTypes: true })
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    let applied = [];
    try {
      applied =
        await client.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    } catch (error) {
      if (error.code !== "P2010" || error.meta?.code !== "42P01") throw error;
    }
    if (
      migrations.some(
        (name) => !applied.some((row) => row.migration_name === name),
      )
    ) {
      const { backupToStorage } = await import("./database-backup.mjs");
      await backupToStorage(
        client,
        process.env.DIRECT_URL || process.env.DATABASE_URL,
      );
    }
  } finally {
    await client.$disconnect();
  }
  prisma("migrate", "deploy");
}
