import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// A93/A94. Dua migrasi memindahkan batas media dari aplikasi ke basis data:
// 20260927000100 mempersempit apa yang boleh dibaca peran `anon`, dan
// 20260927000200 menolak penghapusan media yang masih dipakai.
//
// Keduanya rapuh terhadap perubahan di sisi aplikasi dengan cara yang tidak
// terlihat saat membaca kode aplikasi saja. Setelah hak SELECT dipersempit per
// kolom, satu `select("*")` pada tabel media yang berjalan sebagai `anon` tidak
// mengembalikan kolom lebih sedikit — ia gagal seluruhnya, dan halaman publik
// yang memuatnya jatuh ke keadaan kosong. Tes di bawah memaku kedua sisi
// kontrak itu supaya `select("*")` tidak dapat kembali diam-diam.

const migrations = "supabase/migrations";
const readExposure = fs.readFileSync(path.join(migrations, "20260927000100_media_read_exposure.sql"), "utf8");
const deleteGuard = fs.readFileSync(path.join(migrations, "20260927000200_media_delete_guard.sql"), "utf8");

function sourceFiles(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      sourceFiles(full, found);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

const files = ["app", "components", "lib"].flatMap((root) => sourceFiles(root));

test("the scan found the source tree, not an empty list", () => {
  assert.ok(files.length > 80, `only scanned ${files.length} files; the walk is wrong`);
});

// --- 20260927000100: pemaparan baca ---

test("anon loses blanket SELECT on media and regains only the six public columns", () => {
  assert.match(readExposure, /revoke\s+select\s+on\s+chatten_cafe\.media\s+from\s+anon\s*;/i);
  const grant = readExposure.match(/grant\s+select\s*\(([^)]*)\)\s*\n?\s*on\s+chatten_cafe\.media\s+to\s+anon/i);
  assert.ok(grant, "no per-column grant to anon found");
  const columns = grant[1].split(",").map((value) => value.trim()).sort();
  assert.deepEqual(columns, ["alt_text", "focal_x", "focal_y", "height", "id", "width"]);
});

test("the per-column grant and PUBLIC_MEDIA_COLUMNS name the same six columns", () => {
  const source = fs.readFileSync("lib/public-data/media.ts", "utf8");
  const declaration = source.match(/PUBLIC_MEDIA_COLUMNS\s*=\s*"([^"]+)"/);
  assert.ok(declaration, "PUBLIC_MEDIA_COLUMNS is not declared as a literal string");
  const listed = declaration[1].split(",").map((value) => value.trim()).sort();
  assert.deepEqual(listed, ["alt_text", "focal_x", "focal_y", "height", "id", "width"]);
});

// Ini tes yang paling penting di berkas ini. `select("*")` pada media sebagai
// anon bukan sekadar mengembalikan lebih banyak kolom — PostgREST menolaknya,
// dan setiap gambar di sisi publik hilang.
//
// Larangannya khusus untuk permukaan publik. Pustaka Media di CMS berjalan
// sebagai `authenticated`, yang tetap memegang seluruh kolom karena layarnya
// memang menampilkan original_filename, mime_type, file_size, dan sha256.
const publicSurface = files.filter((file) => !/[\\/]admin[\\/]/.test(file) && !/[\\/]admin[.-]/.test(file));

test("the public-surface filter kept files and dropped the admin tree", () => {
  assert.ok(publicSurface.length > 40, `only ${publicSurface.length} public files; the filter is too greedy`);
  assert.ok(publicSurface.length < files.length, "the filter dropped nothing; admin files are still included");
});

test("no public-surface query selects * from the media table", () => {
  const offenders = [];
  for (const file of publicSurface) {
    const code = fs
      .readFileSync(file, "utf8")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    if (/from\("media"\)\s*\.\s*select\(\s*["'`]\*["'`]\s*\)/.test(code)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `select("*") on media will fail as anon: ${offenders.join(", ")}`);
});

// Route media berjalan sebagai pemanggil (anon untuk pengunjung publik) saat
// memeriksa visibilitas baris. Sebelum perbaikan ini ia memilih
// `bucket,storage_path,mime_type` di konteks itu — tiga kolom yang justru
// dicabut A93 — sehingga menerapkan migrasinya akan membuat route menjawab 404
// untuk setiap gambar. Pemeriksaan visibilitas kini hanya meminta `id`;
// ketiga kolom penyimpanan dibaca di bawah service role.
test("the media route's caller-context lookup only asks for columns anon may read", () => {
  const route = fs
    .readFileSync("app/api/media/[id]/route.ts", "utf8")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const callerLookup = route.match(/createServerSupabaseClient\(\)[\s\S]*?\.from\("media"\)\s*\.select\("([^"]+)"\)/);
  assert.ok(callerLookup, "the route no longer looks the row up under the caller's RLS context");
  const requested = callerLookup[1].split(",").map((value) => value.trim());
  const anonColumns = new Set(["id", "alt_text", "width", "height", "focal_x", "focal_y"]);
  const overreach = requested.filter((column) => !anonColumns.has(column));
  assert.deepEqual(overreach, [], `the caller-context lookup names revoked columns and will 404 every image: ${overreach.join(", ")}`);
  assert.match(route, /service\s*\.from\("media"\)\s*\.select\("bucket,storage_path,mime_type"\)/, "the storage columns must come from the service-role client, the only context allowed to see them");
});

test("the public media shapes do not carry bucket or storage_path", () => {
  for (const file of ["lib/public-data/types.ts", "lib/homepage/types.ts"]) {
    const code = fs
      .readFileSync(file, "utf8")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    const shape = code.match(/export type (?:PublicMedia|Media) = \{[^}]*\}/);
    assert.ok(shape, `no public media type found in ${file}`);
    assert.doesNotMatch(shape[0], /\bbucket\b/, `${file} still exposes bucket publicly`);
    assert.doesNotMatch(shape[0], /\bstorage_path\b/, `${file} still exposes storage_path publicly`);
  }
});

// Bucket privat dan kebijakan baca anonim Storage saling membatalkan: dengan
// `public = true`, storage-api melayani /object/public/... tanpa mengevaluasi
// RLS sama sekali, sehingga kebijakannya tidak pernah dibaca.
test("the bucket is forced private and the legacy anonymous storage policy is dropped", () => {
  assert.match(readExposure, /update\s+storage\.buckets\s+set\s+public\s*=\s*false\s+where\s+id\s*=\s*'chatten-media'/i);
  assert.match(readExposure, /drop\s+policy\s+if\s+exists\s+"chatten public read"\s+on\s+storage\.objects/i);
});

// --- 20260927000200: penjaga hapus ---

test("the guard refuses before on delete set null can act", () => {
  assert.match(deleteGuard, /before\s+delete\s+on\s+chatten_cafe\.media/i);
  assert.match(deleteGuard, /for\s+each\s+row/i);
});

// Sebagai INVOKER, hitungannya berjalan di bawah RLS pemanggil dan baris konten
// yang tak terlihat bagi peran itu tidak terhitung — penjaga yang bergantung
// pada visibilitas pemanggil bukan penjaga. search_path dipatok karena DEFINER.
test("the guard is SECURITY DEFINER with a pinned search_path and is not callable by public", () => {
  assert.match(deleteGuard, /security\s+definer/i);
  assert.match(deleteGuard, /set\s+search_path\s*=\s*chatten_cafe,\s*pg_temp/i);
  assert.match(deleteGuard, /revoke\s+all\s+on\s+function\s+chatten_cafe\.refuse_delete_media_in_use\(\)\s+from\s+public/i);
});

test("the guard raises the errcode and hint the application maps on", () => {
  assert.match(deleteGuard, /errcode\s*=\s*'23503'/);
  assert.match(deleteGuard, /hint\s*=\s*'MEDIA_IN_USE'/);
  assert.match(deleteGuard, /referenced by % content row/);
});

// Penjaga di basis data dan peta penggunaan di aplikasi harus menghitung
// rujukan yang sama. Kalau tabel baru ditambahkan ke salah satunya saja,
// penghapusan ditolak tanpa penjelasan, atau lolos tanpa dijaga.
test("the guard counts exactly the tables the application's usage map counts", () => {
  const definitions = fs.readFileSync("lib/media/usage-query.ts", "utf8");
  const appTables = [...definitions.matchAll(/table:\s*"([a-z_]+)"/g)].map((match) => match[1]).sort();
  const guardTables = [...deleteGuard.matchAll(/from\s+chatten_cafe\.([a-z_]+)\s+where\s+\w+_media_id/g)].map((match) => match[1]).sort();
  assert.ok(appTables.length >= 10, `usage-query.ts listed only ${appTables.length} tables; the parse is wrong`);
  assert.deepEqual(guardTables, appTables);
});

// Kebijakan baca yang dipersempit menyaring baris media ke yang benar-benar
// dirujuk konten. Daftar tabelnya harus sama dengan daftar penjaga hapus,
// karena keduanya menjawab pertanyaan yang sama: apakah media ini dipakai.
test("the narrowed read policy checks the same reference tables as the guard", () => {
  const policyTables = [...readExposure.matchAll(/from\s+chatten_cafe\.([a-z_]+)\s+r\s+where\s+r\.\w+_media_id/g)].map((match) => match[1]).sort();
  const guardTables = [...deleteGuard.matchAll(/from\s+chatten_cafe\.([a-z_]+)\s+where\s+\w+_media_id/g)].map((match) => match[1]).sort();
  assert.deepEqual(policyTables, guardTables);
});

test("the application recognises the guard's refusal instead of reporting a generic failure", () => {
  const state = fs.readFileSync("lib/media/delete-state.ts", "utf8");
  assert.match(state, /export function isMediaInUseDatabaseError/);
  assert.match(state, /"MEDIA_IN_USE"/);
  assert.match(state, /"23503"/);
  const actions = fs.readFileSync("lib/admin/media-actions.ts", "utf8");
  assert.match(actions, /isMediaInUseDatabaseError\(deleteError\)/);
});
