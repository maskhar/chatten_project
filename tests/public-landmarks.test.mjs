import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// A95. Audit aksesibilitas sisi publik, sepadan dengan A92 untuk CMS.
//
// Seperti tests/admin-landmarks.test.mjs, ini uji kontrak *sumber*, bukan uji
// render: halaman publik adalah Server Component yang memanggil Supabase, jadi
// merendernya memerlukan basis data. Sifat yang dipaku di sini struktural,
// sehingga membaca strukturnya cukup — tetapi urutan fokus sebenarnya di
// peramban tetap belum ada yang mengujinya (batas yang sama, dicatat di
// docs/TODO.md).
//
// Komentar dihapus sebelum setiap pencocokan berbentuk elemen. Catatan yang
// menerangkan *mengapa* `<main>` dulu salah harus dapat mengutip `<main>`, dan
// regex berbentuk elemen akan mencocokkan kutipannya — lulus atau gagal
// berdasarkan prosa, bukan kode. Alasan yang sama seperti tests/palette.test.mjs.
function code(file) {
  return fs
    .readFileSync(file, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

// Sebelas halaman publik. app/error.tsx sengaja tidak di sini: ia tidak
// merender PublicShell, karena boundary galat yang bergantung pada pemuat data
// yang sama dengan yang baru saja gagal adalah boundary yang ikut gagal.
const shellPages = [
  "app/(public)/page.tsx",
  "app/about/page.tsx",
  "app/events/page.tsx",
  "app/events/[slug]/page.tsx",
  "app/experience/page.tsx",
  "app/experience/[slug]/page.tsx",
  "app/gallery/page.tsx",
  "app/menu/page.tsx",
  "app/spaces/page.tsx",
  "app/spaces/[slug]/page.tsx",
  "app/visit/page.tsx",
  "app/not-found.tsx",
];

test("every public page renders inside the shell", () => {
  for (const page of shellPages) {
    assert.match(code(page), /<PublicShell/, `${page} does not render PublicShell`);
  }
});

// Ini temuan inti A95. Sepuluh dari sebelas halaman merender <main> sendiri
// *setelah* PageHero, sehingga bagian hero dan satu-satunya <h1> halaman itu
// berada di luar landmark utama — dan tautan lewati-ke-konten melompat ke
// sebuah <div> yang bukan landmark sama sekali. Shell memiliki <main> sekarang,
// jadi sebuah <main> di halaman berarti dua landmark utama bertumpuk.
test("no shell page declares its own main element", () => {
  const offenders = shellPages.filter((page) => /<main[\s>]/.test(code(page)));
  assert.deepEqual(offenders, [], `these pages nest a second <main> inside the shell's: ${offenders.join(", ")}`);
});

test("the shell owns exactly one main element, and it is the skip link's target", () => {
  const shell = code("components/public/public-shell.tsx");
  assert.equal((shell.match(/<main[\s>]/g) ?? []).length, 1, "the shell should render exactly one <main>");
  assert.match(shell, /<main id=\{SKIP_TARGET_ID\}/, "the shell's <main> is not the skip link's target");
  assert.match(shell, /tabIndex=\{-1\}/, "the skip target must be focusable by the jump without joining the tab order");
});

// app/error.tsx berdiri di luar shell, jadi ia harus membawa <main> sendiri —
// kebalikan dari aturan di atas, dan justru karena itu ia diuji di sini.
test("the error boundary carries its own main because it has no shell", () => {
  const source = code("app/error.tsx");
  assert.doesNotMatch(source, /<PublicShell/, "app/error.tsx must not depend on the shell it may be reporting a failure of");
  assert.match(source, /<main[\s>]/, "app/error.tsx has no shell, so it needs its own <main>");
});

test("the skip link uses the shared token rather than a second hand-rolled copy", () => {
  const source = code("components/public/skip-to-content.tsx");
  assert.match(source, /SKIP_LINK/, "the public skip link should use the SKIP_LINK token");
  assert.doesNotMatch(source, /focus:not-sr-only/, "a hand-rolled skip link has come back; SKIP_LINK already defines this");
});

// Setiap <section> publik butuh nama yang dapat diakses, atau ia bukan region
// dan hilang dari navigasi pembaca layar. Band testimoni adalah satu-satunya
// yang tidak punya: ia hanya punya <p> bergaya sebagai pengantar.
test("the homepage testimonials band is a named region", () => {
  const source = code("app/(public)/page.tsx");
  assert.match(source, /aria-labelledby="testimonials-heading"/);
  assert.match(source, /id="testimonials-heading"/);
});

// --- fokus yang terlihat ---

// Sebuah kontrol tanpa indikator fokus adalah kontrol yang tidak dapat ditelusuri
// dengan papan tombol. Kelompok ini adalah yang ditemukan A95 kosong.
const focusRequired = [
  ["components/public/header.tsx", /Plan Your Visit/],
  ["components/public/public-footer.tsx", /FOOTER_FOCUS/],
  ["app/events/page.tsx", /CARD_FOCUS/],
  ["app/experience/page.tsx", /CARD_FOCUS/],
  ["app/spaces/page.tsx", /CARD_FOCUS/],
];

test("the header's framed link, the footer, and the three card links all carry a focus ring", () => {
  for (const [file, marker] of focusRequired) {
    assert.match(code(file), marker, `${file} lost its focus treatment`);
  }
  const footer = code("components/public/public-footer.tsx");
  assert.match(footer, /FOCUS_RING/, "the footer must import the shared ring, not invent one");
  assert.match(footer, /focus-visible:ring-offset-forest-deep/, "the footer's ring offset must be the surface it is painted on");
});

test("the card focus token exists and is drawn inset", () => {
  const control = code("components/ui/control.ts");
  assert.match(control, /export const CARD_FOCUS/);
  // Kartu selebar layar: cincin outset terpotong di tepi viewport pada ponsel.
  assert.match(control, /CARD_FOCUS =\s*`\$\{FOCUS_RING\}[^`]*focus-visible:ring-inset/);
});

// Satu definisi tentang bagaimana fokus terlihat. Dua salinan adalah bagaimana
// salinan di cta.tsx menyimpang — ia menghilangkan `focus-visible:outline-none`.
test("no component hand-copies the focus ring instead of importing it", () => {
  const files = ["components/ui/cta.tsx", "components/ui/button.tsx", "components/public/header.tsx", "components/public/public-footer.tsx", "components/public/public-shell.tsx"];
  for (const file of files) {
    const source = code(file);
    assert.match(source, /FOCUS_RING/, `${file} should import FOCUS_RING`);
    assert.doesNotMatch(source, /"[^"]*focus-visible:ring-2[^"]*"/, `${file} hand-copies the ring in a literal string`);
  }
});

// --- target sentuh ---

// 44px adalah minimum yang nyaman. Ketiganya berada jelas di bawahnya.
test("the header's framed link, the shared Button, and the mobile drawer all reach 44px", () => {
  const header = code("components/public/header.tsx");
  assert.doesNotMatch(header, /className="border border-white\/70 px-4 py-2"/, "the header's framed link is back to ~36px");
  const button = code("components/ui/button.tsx");
  assert.match(button, /min-h-11/, "components/ui/button.tsx is under 44px again");
  assert.doesNotMatch(button, /px-4 py-2 text-sm font-semibold text-cream/, "the old ~36px Button padding is back");
});

// --- gambar ---

test("no public surface uses a raw img element", () => {
  const offenders = shellPages.filter((page) => /<img[\s>]/.test(code(page)));
  assert.deepEqual(offenders, [], `raw <img> bypasses MediaImage's alt and focal-point handling: ${offenders.join(", ")}`);
});

// Alt yang mengulang teks yang sudah terlihat di dekatnya membuat pembaca layar
// mengumumkan hal yang sama dua kali. Kedua tempat ini memakai judul konten
// sebagai cadangan alt, dan judul itu adalah heading di dalam elemen yang sama.
test("no image falls back to a title that is already a heading beside it", () => {
  assert.doesNotMatch(code("app/events/page.tsx"), /alt=\{asset\?\.alt_text\s*\?\?\s*event\.title\}/);
  const detail = code("app/events/[slug]/page.tsx");
  assert.doesNotMatch(detail, /alt=\{image\?\.alt_text\s*\?\?\s*event\.title\}/);
  // Gambar itu juga sama dengan yang sudah ditampilkan hero, jadi satu-satunya
  // <MediaImage> yang benar di halaman ini adalah milik PageHero.
  assert.doesNotMatch(detail, /<MediaImage/, "the event detail page renders the hero's own asset a second time");
});

// Satu band di beranda yang gambarnya *adalah* kontennya adalah satu-satunya
// band yang membuang alt text dari CMS, karena ia lewat `visual()` yang memaksa
// alt="". /gallery selalu meneruskannya.
test("both gallery grids pass the CMS alt text through", () => {
  assert.match(code("app/(public)/page.tsx"), /alt=\{item\.alt_text\}/, "the homepage gallery tiles discard their alt text again");
  assert.match(code("app/gallery/page.tsx"), /alt=\{item\.alt_text\}/);
});
