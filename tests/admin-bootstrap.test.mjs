import test from "node:test";
import assert from "node:assert/strict";
import { parseBootstrapTarget } from "../scripts/admin-bootstrap.mjs";
test("parseBootstrapTarget normalizes explicit email", () => assert.deepEqual(parseBootstrapTarget(["--email", "ADMIN@example.com"]), { email: "admin@example.com", userId: undefined }));
test("parseBootstrapTarget accepts UUID", () => assert.deepEqual(parseBootstrapTarget(["--user-id", "79ae741c-2a71-44bb-a97d-59f35ad0e500"]), { email: undefined, userId: "79ae741c-2a71-44bb-a97d-59f35ad0e500" }));
test("parseBootstrapTarget rejects missing or mixed target", () => { assert.throws(() => parseBootstrapTarget([])); assert.throws(() => parseBootstrapTarget(["--email", "a@b.com", "--user-id", "79ae741c-2a71-44bb-a97d-59f35ad0e500"])); });