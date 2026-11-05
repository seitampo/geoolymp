import test from "node:test";
import assert from "node:assert/strict";
import {
  encryptSnapshot,
  decryptSnapshot,
} from "../scripts/database-backup.mjs";

test("database backups are encrypted and round trip without losing records", () => {
  const snapshot = {
    version: 1,
    tables: [
      {
        name: "User",
        rows: [{ id: 1, name: "Преподаватель", password: "private-hash" }],
      },
    ],
  };
  const bytes = encryptSnapshot(snapshot, "local-backup-test-secret");
  assert.ok(!bytes.includes(Buffer.from("private-hash")));
  assert.deepEqual(
    decryptSnapshot(bytes, "local-backup-test-secret"),
    snapshot,
  );
  assert.throws(() => decryptSnapshot(bytes, "wrong-secret"));
  const corrupt = Buffer.from(bytes);
  corrupt[corrupt.length - 1] ^= 1;
  assert.throws(() => decryptSnapshot(corrupt, "local-backup-test-secret"));
});
