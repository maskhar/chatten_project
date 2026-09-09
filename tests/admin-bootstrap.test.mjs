import test from "node:test";
import assert from "node:assert/strict";
import { parseEmail } from "../scripts/admin-bootstrap.mjs";
test("parseEmail normalizes explicit email", () => assert.equal(parseEmail(["--email", "ADMIN@example.com"]), "admin@example.com"));
test("parseEmail rejects missing email", () => assert.throws(() => parseEmail([])));
