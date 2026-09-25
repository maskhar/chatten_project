import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// The approval gate was four layers deep — an app-side filter on every picker
// query, a `public_media` RLS predicate, a storage.objects predicate, and six
// server actions that refused to save content pointing at an unapproved image.
// Removing one layer and leaving another is worse than leaving all four: the
// operator uploads an image, sees it in the picker, saves, and the save is
// rejected by a rule with no visible cause. This is a directory scan rather
// than a list of files so a new manager added later cannot quietly reintroduce
// the filter in a file nobody thought to update.

function sourceFiles(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      sourceFiles(full, found);
    } else if (/\.(ts|tsx|mjs)$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

const roots = ["app", "components", "lib", "scripts", "types"];
const files = roots.flatMap((root) => sourceFiles(root));

test("the scan found the source tree, not an empty list", () => {
  assert.ok(files.length > 80, `only scanned ${files.length} files; the walk is wrong`);
});

test("no source file reads, writes or filters on rights_status", () => {
  const offenders = files.filter((file) => {
    const source = fs.readFileSync(file, "utf8");
    // Prose in a comment explaining the removal is fine; a code reference is
    // not. Strip line comments before looking.
    const code = source.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    return /rights_status/.test(code);
  });
  assert.deepEqual(offenders, [], `rights_status is back in: ${offenders.join(", ")}`);
});

test("no server action refuses a save because an image is unapproved", () => {
  for (const file of files.filter((name) => name.includes("actions"))) {
    const source = fs.readFileSync(file, "utf8");
    assert.ok(!/must be an approved|is not approved|requires an approved/i.test(source), `${file} still rejects unapproved images`);
  }
});

test("the migration drops the column and opens both policies", () => {
  const migration = fs.readFileSync("supabase/migrations/20260921000500_remove_media_rights_approval.sql", "utf8");
  assert.match(migration, /drop column if exists rights_status/);
  assert.match(migration, /create policy public_media[\s\S]*using \(true\)/);
  assert.match(migration, /create policy "chatten public read"[\s\S]*using \(bucket_id = 'chatten-media'\)/);
});

test("the bucket stays private, so bytes still go through the proxy route", () => {
  // Removing the approval gate is a content decision. It is not a decision to
  // make storage paths guessable: the bucket was flipped private by
  // 20260921000400 and app/api/media/[id] is still the only way in.
  const flip = fs.readFileSync("supabase/migrations/20260921000400_make_chatten_media_bucket_private.sql", "utf8");
  assert.match(flip, /public\s*=\s*false|set public = f/i, "the bucket is no longer flipped private");

  const removal = fs.readFileSync("supabase/migrations/20260921000500_remove_media_rights_approval.sql", "utf8");
  assert.ok(!/storage\.buckets/.test(removal), "the removal migration touches the bucket's visibility");

  const route = fs.readFileSync("app/api/media/[id]/route.ts", "utf8");
  assert.match(route, /createServiceRoleSupabaseClient/);
  assert.match(route, /storage\.from\(media\.bucket\)\.download/);
});

test("alt text is optional everywhere an operator can type one", () => {
  // Upload puts the image in the library with no required field at all; the
  // detail screen and the Gallery form refine it afterwards.
  const gallery = fs.readFileSync("lib/admin/gallery-actions.ts", "utf8");
  assert.ok(!/!payload\.alt_text/.test(gallery), "the Gallery action rejects a blank alt text again");
  assert.match(gallery, /alt_text: parseOptionalText\(formData\.get\("alt_text"\), "Teks alternatif"\) \?\? title/, "a blank alt text no longer falls back to the title");

  for (const file of ["app/admin/(dashboard)/gallery/items/[id]/page.tsx", "components/admin/gallery-manager-client.tsx", "app/admin/(dashboard)/media/items/[id]/page.tsx"]) {
    const source = fs.readFileSync(file, "utf8");
    assert.ok(!/name="alt_text" required/.test(source), `${file} marks alt text required`);
  }

  const upload = fs.readFileSync("lib/media/upload-core.ts", "utf8");
  assert.match(upload, /alt_text: metadata\.altText\?\.trim\(\) \|\| null/, "upload no longer accepts a blank alt text");
});
