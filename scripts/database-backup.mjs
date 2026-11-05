import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const magic = Buffer.from("GEOOLYMPDB1");
const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
const fingerprint = (url) => {
  const parsed = new URL(url);
  return createHash("sha256")
    .update(
      parsed.hostname.replace("-pooler", "") +
        ":" +
        (parsed.port || "5432") +
        parsed.pathname,
    )
    .digest("hex");
};
function key(secret) {
  if (!secret)
    throw new Error(
      "AUTH_SECRET is required to encrypt or restore a database backup.",
    );
  return createHash("sha256")
    .update("geoolymp/database-backup/v1\0" + secret)
    .digest();
}
export function encryptSnapshot(snapshot, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const json = JSON.stringify(snapshot, (_name, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  const encrypted = Buffer.concat([
    cipher.update(gzipSync(Buffer.from(json))),
    cipher.final(),
  ]);
  return Buffer.concat([magic, iv, cipher.getAuthTag(), encrypted]);
}
export function decryptSnapshot(bytes, secret) {
  const data = Buffer.from(bytes);
  if (!data.subarray(0, magic.length).equals(magic))
    throw new Error("Invalid backup format.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(secret),
    data.subarray(magic.length, magic.length + 12),
  );
  decipher.setAuthTag(data.subarray(magic.length + 12, magic.length + 28));
  return JSON.parse(
    gunzipSync(
      Buffer.concat([
        decipher.update(data.subarray(magic.length + 28)),
        decipher.final(),
      ]),
    ).toString(),
  );
}

export async function captureSnapshot(prisma, sourceUrl) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const names =
        await tx.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`;
      const dependencies =
        await tx.$queryRaw`SELECT DISTINCT tc.table_name AS child, ccu.table_name AS parent FROM information_schema.table_constraints tc JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`;
      const tables = [];
      for (const { table_name: name } of names) {
        if (name === "_prisma_migrations") continue;
        const rows = await tx.$queryRawUnsafe(
          "SELECT * FROM public." + quote(name),
        );
        tables.push({ name, rows });
      }
      return {
        version: 1,
        createdAt: new Date().toISOString(),
        source: fingerprint(sourceUrl),
        dependencies,
        tables,
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 120_000 },
  );
}

function storage() {
  for (const name of [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
  ])
    if (!process.env[name])
      throw new Error(
        name +
          " is required to save a private database backup before migration.",
      );
  return new S3Client({
    region: "auto",
    endpoint:
      "https://" + process.env.R2_ACCOUNT_ID + ".r2.cloudflarestorage.com",
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}
export async function backupToStorage(prisma, sourceUrl) {
  const snapshot = await captureSnapshot(prisma, sourceUrl);
  const count = snapshot.tables.reduce(
    (sum, table) => sum + table.rows.length,
    0,
  );
  if (!count) {
    console.log("Database is empty; no existing records to back up.");
    return null;
  }
  const body = encryptSnapshot(snapshot, process.env.AUTH_SECRET);
  const objectKey =
    "backups/lesson-workflow/" +
    new Date().toISOString().replaceAll(":", "-") +
    ".json.gz.enc";
  await storage().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
      Body: body,
      ContentType: "application/octet-stream",
    }),
  );
  console.log(
    "Encrypted database backup saved privately: " +
      objectKey +
      " (" +
      count +
      " records)",
  );
  return objectKey;
}

export async function restoreSnapshot(prisma, snapshot, targetUrl) {
  if (snapshot.version !== 1 || !Array.isArray(snapshot.tables))
    throw new Error("Unsupported backup.");
  if (fingerprint(targetUrl) === snapshot.source)
    throw new Error(
      "Restore requires a different, empty database. The source database cannot be overwritten.",
    );
  const remaining = snapshot.tables.filter((table) => table.rows.length > 0);
  const ordered = [];
  while (remaining.length) {
    const index = remaining.findIndex(
      (table) =>
        !snapshot.dependencies.some(
          (edge) =>
            edge.child === table.name &&
            edge.parent !== table.name &&
            remaining.some((candidate) => candidate.name === edge.parent),
        ),
    );
    if (index < 0)
      throw new Error("Cyclic table dependencies require manual restoration.");
    ordered.push(...remaining.splice(index, 1));
  }
  await prisma.$transaction(
    async (tx) => {
      const names =
        await tx.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'`;
      for (const { table_name: name } of names) {
        const [row] = await tx.$queryRawUnsafe(
          "SELECT COUNT(*)::int AS count FROM public." + quote(name),
        );
        if (row.count)
          throw new Error(
            "Restore target is not empty. No records were changed.",
          );
      }
      for (const table of ordered) {
        const fields =
          await tx.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${table.name}`;
        const columns = fields
          .map((field) => field.column_name)
          .filter((name) => Object.hasOwn(table.rows[0], name));
        if (!columns.length)
          throw new Error("The target schema does not match the backup.");
        const list = columns.map(quote).join(", ");
        for (let start = 0; start < table.rows.length; start += 200) {
          await tx.$executeRawUnsafe(
            "INSERT INTO public." +
              quote(table.name) +
              " (" +
              list +
              ") SELECT " +
              list +
              " FROM jsonb_populate_recordset(NULL::public." +
              quote(table.name) +
              ", $1::jsonb)",
            JSON.stringify(table.rows.slice(start, start + 200)),
          );
        }
        if (columns.includes("id")) {
          const [sequence] =
            await tx.$queryRaw`SELECT pg_get_serial_sequence(${"public." + quote(table.name)}, 'id') AS name`;
          if (sequence?.name)
            await tx.$queryRawUnsafe(
              "SELECT setval($1::regclass, GREATEST(COALESCE(MAX(id), 1), 1), COUNT(*) > 0) FROM public." +
                quote(table.name),
              sequence.name,
            );
        }
      }
    },
    { timeout: 120_000 },
  );
}

async function main() {
  const command = process.argv[2];
  if (command === "export") {
    const destination = process.argv[3];
    if (!destination)
      throw new Error("Provide a local destination for the encrypted backup.");
    const prisma = new PrismaClient();
    try {
      await writeFile(
        destination,
        encryptSnapshot(
          await captureSnapshot(prisma, process.env.DATABASE_URL),
          process.env.AUTH_SECRET,
        ),
      );
      console.log("Encrypted backup saved.");
    } finally {
      await prisma.$disconnect();
    }
  } else if (command === "restore") {
    const source = process.argv[3];
    const target = process.env.RESTORE_DATABASE_URL;
    if (!source || !target)
      throw new Error(
        "Provide a backup path or r2:object-key and RESTORE_DATABASE_URL for a different empty database.",
      );
    let bytes;
    if (source.startsWith("r2:")) {
      const result = await storage().send(
        new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: source.slice(3),
        }),
      );
      bytes = await result.Body.transformToByteArray();
    } else bytes = await readFile(source);
    const prisma = new PrismaClient({ datasourceUrl: target });
    try {
      await restoreSnapshot(
        prisma,
        decryptSnapshot(bytes, process.env.AUTH_SECRET),
        target,
      );
      console.log("Database restored to the empty target.");
    } finally {
      await prisma.$disconnect();
    }
  } else
    throw new Error(
      "Use export <encrypted-file> or restore <encrypted-file|r2:object-key>.",
    );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
