import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync("lib/media/private-object.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const {
  MEDIA_BUCKET,
  isMediaBucket,
  isSafeMediaStoragePath,
  mediaContentDisposition,
} = await import(`data:text/javascript,${encodeURIComponent(js)}`);

// This helper sits immediately before privileged Storage operations. Test its
// semantics separately from the route so a refactor cannot turn a source-text
// assertion into a service-role confused deputy or inline content injection.
test("only the application-owned bucket can reach privileged media operations", () => {
  assert.equal(MEDIA_BUCKET, "chatten-media");
  assert.equal(isMediaBucket("chatten-media"), true);
  assert.equal(isMediaBucket("avatars"), false);
  assert.equal(isMediaBucket("storage"), false);
  assert.equal(isMediaBucket(null), false);
});

test("media storage paths reject traversal, absolute paths, and separator tricks", () => {
  for (const path of ["operator/1f2e-image.jpg", "nested/object.avif", "operator/a_b-c.1.png"]) {
    assert.equal(isSafeMediaStoragePath(path), true, `${path} should be a valid object path`);
  }

  for (const path of ["", "/operator/image.jpg", "../secrets.txt", "operator/../secrets.txt", "operator//image.jpg", "operator\\image.jpg", "operator/./image.jpg", "operator/\0image.jpg", "x".repeat(513), null]) {
    assert.equal(isSafeMediaStoragePath(path), false, `${String(path)} should be rejected`);
  }
});

// The path is spliced into a Storage URL, so a character with URL meaning makes
// the stored row an alias: "object.png#x" and "object.png?x" both truncate and
// resolve to object.png, reading bytes the row does not name. Verified against a
// live private object before this gate existed, and against the real library:
// every stored path is already within the allowlist.
test("media storage paths reject characters that alias another object through the Storage URL", () => {
  for (const path of ["operator/image.png#alias", "operator/image.png?alias", "operator/image.png%2ealias", "operator/image.png&x=1", "operator/ima ge.png", "operator/image.png\t", "operator/héro.png"]) {
    assert.equal(isSafeMediaStoragePath(path), false, `${path} should be rejected`);
  }
});

test("only upload-validated image MIME types are served inline", () => {
  for (const mimeType of ["image/jpeg", "image/png", "image/webp", "image/avif", " IMAGE/PNG "]) {
    assert.deepEqual(mediaContentDisposition(mimeType), {
      contentType: mimeType.trim().toLowerCase(),
      disposition: "inline",
    });
  }

  for (const mimeType of ["text/html", "image/svg+xml", "application/pdf", "image/jpeg; charset=utf-8", null]) {
    assert.deepEqual(mediaContentDisposition(mimeType), {
      contentType: "application/octet-stream",
      disposition: "attachment",
    });
  }
});

test("media proxy rejects untrusted bucket and path before the service-role download", () => {
  const route = fs.readFileSync("app/api/media/[id]/route.ts", "utf8");
  // The id gate is the route's first filter; a regex missing a group would
  // reject every real media id and blank every image on the public site.
  const uuidPattern = route.match(/const UUID = (\/\S+\/i);/);
  assert.ok(uuidPattern, "the route no longer validates the id with a UUID pattern");
  const uuid = new RegExp(uuidPattern[1].slice(1, -2), "i");
  assert.equal(uuid.test("9f8a1c2d-3e4b-4a5c-8d6e-7f0a1b2c3d4e"), true, "a well-formed media id must pass the route's id gate");
  assert.equal(uuid.test("9f8a1c2d-3e4b-4a5c-7f0a1b2c3d4e"), false);
  assert.equal(uuid.test("not-a-uuid"), false);

  assert.match(route, /!isMediaBucket\(media\.bucket\) \|\| !isSafeMediaStoragePath\(media\.storage_path\)/);
  assert.match(route, /storage\.from\(MEDIA_BUCKET\)\.download\(media\.storage_path\)/);
  assert.ok(!/storage\.from\(media\.bucket\)/.test(route));
  assert.match(route, /mediaContentDisposition\(media\.mime_type\)/);
  assert.ok(!/download\.data\.type/.test(route), "blob-provided MIME must not override the route allowlist");
});

test("media mutation paths use the fixed bucket and exact metadata updates", () => {
  const actions = fs.readFileSync("lib/admin/media-actions.ts", "utf8");
  assert.match(actions, /storage\.from\(MEDIA_BUCKET\)\.upload/);
  assert.match(actions, /storage\.from\(MEDIA_BUCKET\)\.remove/);
  assert.ok(!/storage\.from\(String\(removedRow\.bucket\)\)/.test(actions));
  assert.match(actions, /update\(payload, \{ count: "exact" \}\)\.eq\("id", id\)/);
  assert.match(actions, /assertAffectedRows\(count, 1, "Media tidak ditemukan atau tidak boleh diubah\."\)/);
});
