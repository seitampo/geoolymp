import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { prepareBuild } from "../scripts/prepare-build.mjs";

function fixture({ pending = true, backupError, schemaError } = {}) {
  const calls = [];
  return {
    calls,
    options: {
      deploy: true,
      databaseUrl: "postgresql://runtime.invalid/test",
      directUrl: "postgresql://direct.invalid/test",
      command: (...args) => {
        calls.push(args.join(" "));
      },
      listMigrations: async () => ["lesson_workflow"],
      createClient: async (url) => ({
        $queryRaw: async () =>
          pending ? [] : [{ migration_name: "lesson_workflow" }],
        $disconnect: async () => {
          calls.push("disconnect " + url);
        },
      }),
      backup: async () => {
        calls.push("backup");
        if (backupError) throw backupError;
      },
      verify: async () => {
        calls.push("verify runtime");
        if (schemaError) throw schemaError;
      },
      log: () => {},
    },
  };
}

test("Vercel uses an explicit migration build even without exposed VERCEL variables", async () => {
  const config = JSON.parse(
    await readFile(new URL("../vercel.json", import.meta.url)),
  );
  const pkg = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url)),
  );
  assert.equal(config.buildCommand, "npm run build:deploy");
  assert.equal(
    pkg.scripts["build:deploy"],
    "node scripts/prepare-build.mjs --deploy && next build",
  );
  const { calls, options } = fixture();
  await prepareBuild(options);
  assert.deepEqual(calls, [
    "generate",
    "backup",
    "disconnect postgresql://direct.invalid/test",
    "migrate deploy",
    "verify runtime",
    "disconnect postgresql://runtime.invalid/test",
  ]);
});

test("backup failure prevents migration and schema mismatch prevents building", async () => {
  const backup = fixture({ backupError: new Error("Backup failed") });
  await assert.rejects(prepareBuild(backup.options), /Backup failed/);
  assert.ok(!backup.calls.includes("migrate deploy"));
  const schema = fixture({
    pending: false,
    schemaError: new Error("Missing Task.isLibraryItem"),
  });
  await assert.rejects(
    prepareBuild(schema.options),
    /Missing Task.isLibraryItem/,
  );
  assert.ok(!schema.calls.includes("backup"));
  assert.equal(
    schema.calls.at(-1),
    "disconnect postgresql://runtime.invalid/test",
  );
});

test("ordinary local builds never apply deployment migrations", async () => {
  const { calls, options } = fixture();
  await prepareBuild({ ...options, deploy: false });
  assert.deepEqual(calls, ["generate"]);
});
