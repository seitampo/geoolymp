import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLoginIdentifier } from "../lib/loginIdentifier";
test("teacher and guest aliases normalize while ordinary email logins remain available", () => {
  assert.equal(
    normalizeLoginIdentifier(" ALIYA "),
    "aliya.maksutovna.20261106@geoolymp.invalid",
  );
  assert.equal(
    normalizeLoginIdentifier("OQYSHY"),
    "oqyshy.aliya.20261106@geoolymp.invalid",
  );
  assert.equal(
    normalizeLoginIdentifier(" Teacher@Example.test "),
    "teacher@example.test",
  );
  assert.equal(normalizeLoginIdentifier("unknown"), "unknown");
});
