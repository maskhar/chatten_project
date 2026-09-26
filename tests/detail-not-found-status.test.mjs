import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// A106: sebuah slug yang tidak ada menjawab HTTP 200 sambil merender halaman
// 404. Penyebabnya bukan di halaman detailnya, melainkan sebuah `loading.tsx`
// satu tingkat di atasnya: batas Suspense berlaku untuk seluruh subtree
// segmennya, jadi Next mengalirkan skeleton lebih dulu, status terkirim bersama
// byte pertama, dan `notFound()` yang berjalan sesudahnya hanya bisa menukar
// isi — bukan statusnya.
//
// Yang dipaku di sini adalah bentuk direktorinya, karena di situlah cacatnya
// hidup. `npm test` tidak menjalankan server, jadi tidak ada gunanya berpura-pura
// menguji kode status di sini; sebuah tes yang memeriksa `notFound()` ada di
// dalam berkas halaman akan lulus pada kode yang rusak, sebab pemanggilan itu
// memang sudah ada sejak awal dan tetap tidak cukup.
const segments = ["spaces", "experience", "events"];

test("no loading.tsx may sit where it would wrap a detail route", () => {
  for (const segment of segments) {
    assert.ok(
      !fs.existsSync(`app/${segment}/loading.tsx`),
      `app/${segment}/loading.tsx wraps [slug] too, so an unknown slug answers 200 with a 404 body; move it into a (list) route group`,
    );
    assert.ok(
      !fs.existsSync(`app/${segment}/[slug]/loading.tsx`),
      `app/${segment}/[slug]/loading.tsx streams before notFound() can set the status`,
    );
  }
});

test("each list page keeps its skeleton inside a route group that excludes [slug]", () => {
  for (const segment of segments) {
    assert.ok(fs.existsSync(`app/${segment}/(list)/page.tsx`), `app/${segment}/(list)/page.tsx is missing, so /${segment} has no list page`);
    assert.ok(fs.existsSync(`app/${segment}/(list)/loading.tsx`), `the /${segment} list lost its skeleton instead of having it isolated`);
    assert.ok(fs.existsSync(`app/${segment}/[slug]/page.tsx`), `app/${segment}/[slug]/page.tsx is missing`);
  }
});

test("every detail page still calls notFound for a slug that is not published", () => {
  for (const segment of segments) {
    const code = fs.readFileSync(`app/${segment}/[slug]/page.tsx`, "utf8");
    assert.match(code, /notFound\(\)/, `app/${segment}/[slug]/page.tsx no longer calls notFound()`);
    assert.match(code, /from\s+["']next\/navigation["']/, `app/${segment}/[slug]/page.tsx must import notFound from next/navigation`);
  }
});
