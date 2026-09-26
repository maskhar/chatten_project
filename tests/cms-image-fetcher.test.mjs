import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// A100. Pengoptimal gambar Next mengambil `src` dari sisi server, sehingga
// cookie sesi operator tidak ikut terkirim. Sejak A93 mempersempit
// `public_media`, `/api/media/<id>` tanpa sesi berjalan sebagai `anon`, tidak
// menemukan baris, dan menjawab 404 — pengoptimal lalu menjawab 400 dan setiap
// thumbnail CMS hilang.
//
// Perbaikannya bergantung pada SIAPA yang mengambil, bukan pada nilai `src`,
// dan itu tidak terlihat saat membaca satu layar CMS: `<Image>` di sana tampak
// benar sampai seseorang login dan melihat kotak kosong. Tes ini memaku
// pembagiannya — CMS memakai CmsImage, sisi publik tetap next/image — supaya
// regresinya tidak bisa kembali tanpa ada yang menyadarinya.

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

const adminFiles = [...sourceFiles("app/admin"), ...sourceFiles("components/admin")];

test("the admin scan found files, not an empty list", () => {
  assert.ok(adminFiles.length > 20, `only scanned ${adminFiles.length} admin files; the walk is wrong`);
});

test("no CMS screen imports next/image", () => {
  const offenders = adminFiles.filter((file) => {
    const code = fs
      .readFileSync(file, "utf8")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    return /from\s+["']next\/image["']/.test(code);
  });
  assert.deepEqual(
    offenders,
    [],
    `next/image fetches server-side without the session cookie, so these screens will render empty boxes: ${offenders.join(", ")}`,
  );
});

test("CmsImage renders a plain img and never delegates to next/image", () => {
  const code = fs.readFileSync("components/admin/cms-image.tsx", "utf8");
  const body = code.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(body, /from\s+["']next\/image["']/, "CmsImage must not wrap next/image; that reintroduces the server-side fetch");
  assert.match(body, /<img\b/, "CmsImage must render a plain <img> so the browser is the fetcher");
  assert.match(body, /loading="lazy"/, "off-screen thumbnails must not be fetched eagerly; the originals are unresized");
});

// Kebalikannya juga harus dijaga. Sisi publik memang harus memakai next/image:
// media yang dirujuk konten boleh dibaca `anon`, jadi ambilan pengoptimal
// berhasil di sana — dan pengunjunglah yang menanggung byte-nya, sehingga
// resize justru dibutuhkan. Menyalin pola CMS ke sisi publik akan mengirim
// berkas asli ke setiap ponsel.
test("the public media component still uses next/image so visitors get resized candidates", () => {
  const code = fs.readFileSync("components/public/media-image.tsx", "utf8");
  assert.match(code, /from\s+["']next\/image["']/, "the public surface must keep the optimizer; visitors pay for unresized originals");
  assert.match(code, /sizes=\{sizes\}/, "an <Image fill> without sizes serves the 100vw candidate to every viewport");
});

test("no public-surface file imports the CMS image escape hatch", () => {
  const publicFiles = [...sourceFiles("components/public"), ...sourceFiles("app").filter((file) => !/[\\/]admin[\\/]/.test(file))];
  const offenders = publicFiles.filter((file) => /cms-image/.test(fs.readFileSync(file, "utf8")));
  assert.deepEqual(offenders, [], `CmsImage skips the optimizer and would send full-size originals to visitors: ${offenders.join(", ")}`);
});
