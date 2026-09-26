import { test, expect, type Page } from "@playwright/test";

// A96. Menutup batas yang dicatat A92 dan A95.
//
// tests/admin-landmarks.test.mjs dan tests/public-landmarks.test.mjs adalah uji
// kontrak *sumber*: keduanya membaca teks berkas. Itu memadai untuk sifat
// struktural, dan itu pilihan yang benar untuk lapisan admin — merendernya
// memerlukan sesi Supabase, dan uji yang memerlukan sesi hidup adalah uji yang
// akhirnya dilewati. Tetapi ada satu hal yang tidak dapat dibaca dari sumber:
// **urutan fokus yang sebenarnya di peramban**.
//
// Urutan tab tidak ditentukan oleh urutan tulis JSX. Ia ditentukan oleh urutan
// dokumen setelah render, dan dapat dibelokkan oleh `tabIndex`, oleh
// `display: none` (yang mengeluarkan elemen dari urutan tab sepenuhnya), dan
// oleh elemen yang tersembunyi secara visual tetapi masih dapat difokuskan.
// Ketiganya ada di situs ini: shell memasang `tabIndex={-1}` pada `<main>`,
// beranda menyembunyikan bagian lewat `style={{ display: "none" }}` dari
// homepage_sections, dan tautan lewati-ke-konten adalah `sr-only` sampai ia
// menerima fokus.
//
// Halaman publik adalah `force-dynamic` dan memanggil Supabase, tetapi
// `getShellData` menelan kegagalannya sendiri dan setiap pemuat publik jatuh ke
// keadaan kosong — jadi struktur halaman tetap utuh tanpa basis data, dan
// urutan fokus tetap bermakna. Berkas ini karenanya tidak memerlukan kredensial
// apa pun, berbeda dari auth-smoke.spec.ts.
//
// Menjalankannya:
//   npm run build && npm start      (atau: npm run dev)
//   PLAYWRIGHT_CHROME_PATH="/path/to/chrome" npx playwright test focus-order
//
// Bukan bagian dari `npm test` dan bukan bagian dari gerbang CI, karena
// keduanya harus lulus tanpa server yang berjalan.

const publicPaths = ["/", "/menu", "/gallery", "/events", "/spaces", "/experience", "/visit", "/about"];

/** Nama elemen yang sekarang memegang fokus, cukup untuk dibaca dalam kegagalan. */
async function focused(page: Page) {
  return page.evaluate(() => {
    const node = document.activeElement;
    if (!node || node === document.body) return null;
    return {
      tag: node.tagName.toLowerCase(),
      id: node.id || null,
      text: (node.textContent ?? "").trim().slice(0, 40),
      href: node.getAttribute("href"),
      ariaHidden: node.closest("[aria-hidden='true']") !== null,
      // Sebuah elemen di dalam `display: none` tidak akan pernah menerima fokus;
      // kalau ia menerimanya, sesuatu tentang asumsi ini salah.
      visible: (node as HTMLElement).offsetParent !== null || getComputedStyle(node as HTMLElement).position === "fixed",
    };
  });
}

/** Tab sekali, lalu laporkan siapa yang memegang fokus. */
async function tab(page: Page) {
  await page.keyboard.press("Tab");
  return focused(page);
}

for (const path of publicPaths) {
  test.describe(`focus order on ${path}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
      // Setiap halaman publik punya loading.tsx, dan kerangkanya sengaja tidak
      // punya satu pun elemen yang dapat difokuskan (`aria-busy`, satu
      // `sr-only` "Loading…", sisanya `aria-hidden`). Menekan Tab sebelum
      // halaman menggantikannya karenanya mengukur kerangka, bukan halaman.
      await page.waitForSelector("main#main-content");
      // JANGAN mengklik untuk "menyetel ulang" fokus di sini. Versi pertama
      // berkas ini melakukannya (`body.click({ x: 1, y: 1 })`) dan 27 uji
      // gagal — bukan karena aplikasinya salah, melainkan karena klik itu
      // menetapkan *titik awal fokus berurutan* di tempat yang diklik. Titik
      // (1,1) berada di atas tautan lewati itu sendiri, sehingga Tab berikutnya
      // melangkah ke kontrol *sesudahnya* dan tautan lewati tampak bukan
      // perhentian pertama. Setelah page.goto() titik awalnya sudah berada di
      // awal dokumen, yang persis keadaan yang ingin diuji.
    });

    // Ini klaim yang paling tidak dapat diuji dari sumber. Tautan lewati adalah
    // `sr-only` sampai ia difokuskan; apakah ia perhentian *pertama* bergantung
    // pada urutan dokumen setelah render, bukan pada urutan tulis.
    test("the skip link is the first tab stop and it is visible once focused", async ({ page }) => {
      const first = await tab(page);
      expect(first, "nothing took focus on the first Tab").not.toBeNull();
      expect(first!.href).toBe("#main-content");

      // A95: SKIP_LINK memakai `focus:not-sr-only`, yang harus membatalkan
      // `sr-only` begitu tautan menerima fokus.
      //
      // `toBeVisible()` TIDAK cukup untuk memeriksanya, dan itu dibuktikan:
      // berkas ini diuji terhadap build yang tautan lewatinya sengaja diturunkan
      // menjadi `className="sr-only"` saja, dan seluruh 41 uji tetap lulus.
      // Sebabnya, sebuah elemen `sr-only` berukuran 1x1 dengan
      // `clip-path: inset(50%)` masih "visible" menurut Playwright — ia punya
      // kotak tata letak yang bukan nol. Yang membedakannya hanya ukuran:
      // 1x1 terpotong versus 135x44 utuh. Jadi yang diukur di sini ukurannya.
      const painted = await page.evaluate(() => {
        const node = document.activeElement as HTMLElement;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return { width: Math.round(rect.width), height: Math.round(rect.height), clipPath: style.clipPath, position: style.position };
      });
      expect(painted.clipPath, "the focused skip link is still clipped away by sr-only").toBe("none");
      // 44px adalah target sentuh minimum yang dipakai proyek ini (TAP_TARGET).
      expect(painted.height, `the focused skip link is only ${painted.width}x${painted.height}px`).toBeGreaterThanOrEqual(44);
      expect(painted.width, `the focused skip link is only ${painted.width}x${painted.height}px`).toBeGreaterThan(40);
      // Ia harus mengapung di atas halaman, bukan mendorong tata letaknya.
      expect(painted.position).toBe("absolute");
    });

    // Melompat harus benar-benar memindahkan fokus ke landmark utama. Inilah
    // yang gagal sebelum A95 — targetnya sebuah `<div>` yang bukan landmark,
    // dan pada sepuluh halaman `<h1>` berada di luarnya.
    test("activating the skip link moves focus into the main landmark", async ({ page }) => {
      await tab(page);
      await page.keyboard.press("Enter");
      const target = await focused(page);
      expect(target, "focus was lost by the jump").not.toBeNull();
      expect(target!.id).toBe("main-content");
      expect(target!.tag).toBe("main");
    });

    // Inti dari melompat: perhentian berikutnya tidak boleh kembali ke header
    // yang baru saja dilewati. Itulah yang rusak sebelum A95.
    //
    // Yang TIDAK dapat dituntut: bahwa perhentian itu berada di dalam `<main>`.
    // Versi pertama berkas ini menuntutnya dan gagal di /menu, /gallery dan
    // /events — bukan karena urutan fokusnya salah, melainkan karena ketiga
    // halaman itu tidak punya satu pun kontrol di dalam <main> tanpa basis data.
    // Isinya prosa dan gambar; tautan pertama sesudah <main> memang milik footer.
    // Uji yang menuntut lebih dari itu adalah uji yang menuntut adanya data,
    // dan uji yang menuntut adanya data adalah uji yang menjadi rapuh.
    test("the tab stop after the jump never returns to the header", async ({ page }) => {
      const mainControls = await page.locator("main#main-content").locator("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])").count();

      await tab(page);
      await page.keyboard.press("Enter");
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => {
        const node = document.activeElement;
        if (!node || node === document.body) return null;
        return { inMain: node.closest("main#main-content") !== null, inHeader: node.closest("header") !== null, text: (node.textContent ?? "").trim().slice(0, 40) };
      });
      expect(inside, "nothing took focus after the jump").not.toBeNull();
      expect(inside!.inHeader, `the jump was undone: focus returned to the header at "${inside!.text}"`).toBe(false);

      // Hanya kalau <main> memang punya kontrol, perhentian itu harus miliknya.
      if (mainControls > 0) {
        expect(inside!.inMain, `main has ${mainControls} control(s), yet the jump landed outside it at "${inside!.text}"`).toBe(true);
      }
    });

    // Setiap kontrol yang dapat difokuskan harus terlihat saat ia memegang
    // fokus. Sebuah kontrol yang mengambil fokus tanpa dapat dilihat adalah
    // perhentian tab yang hilang: pengguna menekan Tab dan tidak ada yang
    // tampak bergerak.
    test("no focusable control is invisible or aria-hidden while focused", async ({ page }) => {
      const seen = new Set<string>();
      const offenders: string[] = [];
      for (let index = 0; index < 60; index += 1) {
        const state = await tab(page);
        if (!state) break;
        const key = `${state.tag}#${state.id ?? ""}:${state.href ?? ""}:${state.text}`;
        if (seen.has(key)) break;
        seen.add(key);
        if (state.ariaHidden) offenders.push(`aria-hidden: ${key}`);
        if (!state.visible) offenders.push(`not visible: ${key}`);
      }
      expect(seen.size, "no focusable control was reached at all").toBeGreaterThan(2);
      expect(offenders, offenders.join("\n")).toEqual([]);
    });

    // A95 menambahkan cincin pada sembilan kontrol yang tidak punya. Uji sumber
    // dapat memastikan tokennya ada di kelasnya; hanya peramban yang dapat
    // memastikan sesuatu benar-benar tergambar.
    test("every tab stop paints a visible focus indicator", async ({ page }) => {
      const bare: string[] = [];
      const seen = new Set<string>();
      for (let index = 0; index < 60; index += 1) {
        const state = await tab(page);
        if (!state) break;
        const key = `${state.tag}#${state.id ?? ""}:${state.href ?? ""}:${state.text}`;
        if (seen.has(key)) break;
        seen.add(key);
        const indicator = await page.evaluate(() => {
          const node = document.activeElement as HTMLElement | null;
          if (!node) return null;
          const style = getComputedStyle(node);
          const outline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
          // Tailwind menggambar cincinnya sebagai box-shadow, dan selalu
          // memancarkan beberapa lapis: lapisan yang tidak aktif keluar sebagai
          // `rgba(0, 0, 0, 0) 0px 0px 0px 0px`. Karena itu `!== "none"` saja
          // tidak cukup — sebuah kontrol yang mendeklarasikan `ring-offset`
          // tetapi lupa warna cincinnya akan lulus dengan cincin yang seluruhnya
          // transparan, yaitu cincin yang tidak terlihat. Yang dihitung adalah
          // adanya sedikitnya satu lapis yang tidak transparan dan punya sebaran.
          const shadow = style.boxShadow;
          const ring =
            shadow !== "none" &&
            shadow !== "" &&
            shadow.split(/,(?![^(]*\))/).some((layer) => !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(layer) && /[1-9]\d*px/.test(layer));
          return { outline, ring };
        });
        if (indicator && !indicator.outline && !indicator.ring) bare.push(key);
      }
      expect(bare, `these tab stops paint nothing on focus:\n${bare.join("\n")}`).toEqual([]);
    });
  });
}

// Bagian yang disembunyikan operator lewat homepage_sections dirender dengan
// `display: none`, yang mengeluarkan seluruh isinya dari urutan tab. Kalau ia
// pernah diganti dengan `visibility: hidden` atau `opacity: 0`, tautan di dalam
// bagian yang "disembunyikan" itu tetap dapat difokuskan — perhentian tab yang
// menuju konten yang tidak dapat dilihat siapa pun.
test("hidden homepage sections are out of the tab order entirely", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("main#main-content");

  // Uji ini tidak boleh lulus hanya karena tidak ada bagian yang disembunyikan.
  // Tanpa basis data setiap bagian terlihat, jadi satu bagian disembunyikan di
  // sini dengan cara yang sama seperti render server — `display: none` — lalu
  // dibuktikan bahwa tautan di dalamnya benar-benar keluar dari urutan tab.
  const prepared = await page.evaluate(() => {
    const withLink = [...document.querySelectorAll("main#main-content section")].find((node) => node.querySelector("a[href], button"));
    if (!withLink) return null;
    (withLink as HTMLElement).style.display = "none";
    const link = withLink.querySelector<HTMLElement>("a[href], button");
    link?.setAttribute("data-focus-probe", "1");
    return { laidOut: (withLink as HTMLElement).offsetParent !== null, hasProbe: link !== null };
  });
  expect(prepared, "the homepage rendered no section containing a control").not.toBeNull();
  expect(prepared!.hasProbe).toBe(true);
  expect(prepared!.laidOut, "a display:none section is still laid out").toBe(false);

  // Tab menyeluruh: kontrol yang ditandai tidak boleh pernah memegang fokus.
  const seen = new Set<string>();
  let reachedProbe = false;
  for (let index = 0; index < 80; index += 1) {
    await page.keyboard.press("Tab");
    const state = await page.evaluate(() => {
      const node = document.activeElement;
      if (!node || node === document.body) return null;
      return { key: `${node.tagName}:${node.getAttribute("href") ?? ""}:${(node.textContent ?? "").trim().slice(0, 30)}`, probe: node.hasAttribute("data-focus-probe") };
    });
    if (!state) break;
    if (state.probe) reachedProbe = true;
    if (seen.has(state.key)) break;
    seen.add(state.key);
  }
  expect(seen.size, "no control was reached at all").toBeGreaterThan(2);
  expect(reachedProbe, "a control inside a display:none section still took focus").toBe(false);
});
