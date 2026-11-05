import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

function runPrisma(...args) {
  const result = spawnSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", ...args],
    {
      stdio: "inherit",
      env: process.env,
    },
  );
  if (result.status !== 0) throw new Error("Prisma preparation failed.");
}

export async function verifyLessonSchema(client) {
  // LIMIT 0 validates every referenced column and the join table without reading
  // user records. Check the runtime database, including when DIRECT_URL differs.
  await client.$queryRaw`SELECT t."isLibraryItem", s."isPublished", s."assignedAt", m."isPublished", lm."A", lm."B"
    FROM "Task" t, "TaskSet" s, "Material" m, "_LessonMaterials" lm LIMIT 0`;
}

export async function prepareBuild({
  deploy,
  databaseUrl = process.env.DATABASE_URL,
  directUrl = process.env.DIRECT_URL || databaseUrl,
  command = runPrisma,
  createClient = async (url) => {
    const { PrismaClient } = await import("@prisma/client");
    return new PrismaClient({ datasourceUrl: url });
  },
  listMigrations = async () =>
    (await readdir("prisma/migrations", { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  backup = async (client, url) => {
    const { backupToStorage } = await import("./database-backup.mjs");
    await backupToStorage(client, url);
  },
  verify = verifyLessonSchema,
  log = console.log,
}) {
  await command("generate");
  if (!deploy) return;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for deployment.");
  log("Deployment database preparation started.");
  const client = await createClient(directUrl);
  try {
    const migrations = await listMigrations();
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
    )
      await backup(client, directUrl);
  } finally {
    await client.$disconnect();
  }
  await command("migrate", "deploy");
  const runtimeClient = await createClient(databaseUrl);
  try {
    await verify(runtimeClient);
  } finally {
    await runtimeClient.$disconnect();
  }
  log("Deployment database schema verified; application build may proceed.");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  // Vercel calls the explicit --deploy entry point from tracked vercel.json.
  // Do not depend on its optional exposed system variables for migration safety.
  if (!process.env.DIRECT_URL && process.env.DATABASE_URL)
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  prepareBuild({
    deploy: process.argv.includes("--deploy") || process.env.VERCEL === "1",
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
