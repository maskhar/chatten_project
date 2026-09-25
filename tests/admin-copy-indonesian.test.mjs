import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// A74: the CMS is operated by the Chatten team in Indonesian, but the admin
// dashboard shipped in English while the public site was Indonesian. An
// operator reading "Unpublished drafts" or "Delete this record?" has to
// translate before acting, which is exactly where destructive controls get
// misread. These tests pin the translated copy, and pin the absence of the
// English it replaced, so a new screen cannot quietly reintroduce it.
//
// Only operator-facing text is asserted. Values that a query, a route or a
// column depends on — `draft`/`published`, `sort_order`, role names, resource
// keys, href strings — are checked as *unchanged* by the tests that own them.

const read = (file) => fs.readFileSync(file, "utf8");

const expectCopy = (file, indonesian, english) => {
  const source = read(file);
  for (const phrase of indonesian) {
    assert.ok(source.includes(phrase), `${file} no longer says "${phrase}"`);
  }
  for (const stale of english) {
    assert.ok(!source.includes(stale), `English copy "${stale}" is back in ${file}`);
  }
};

test("the dashboard shell and overview speak Indonesian", () => {
  expectCopy(
    "app/admin/(dashboard)/layout.tsx",
    ["Situs", "Konten", "Pengaturan", "Pustaka Media", "Jam Buka", "Kelola konten situs dengan percaya diri.", "Keluar"],
    ["Website", "Settings", "Media Library", "Opening Hours", "Sign out", "Sign Out"],
  );
  expectCopy(
    "app/admin/(dashboard)/page.tsx",
    ["Dasbor", "Ringkasan situs", "Draf belum terbit", "Berkas media", "Aktivitas terbaru", "Aksi cepat", "baru saja"],
    ["Dashboard", "Site overview", "Unpublished drafts", "Media files", "Recent activity", "Quick actions", "just now"],
  );
});

test("the generic resource editor speaks Indonesian without moving its query keys", () => {
  const page = read("app/admin/(dashboard)/[resource]/page.tsx");
  for (const phrase of ["Modul CMS", "Cari", "Semua", "Draf", "Terbit", "Terapkan", "Hapus filter", "Ubah urutan tampilan", "Simpan perubahan", "Sebelumnya", "Berikutnya"]) {
    assert.ok(page.includes(phrase), `the resource editor no longer says "${phrase}"`);
  }
  // "Previous"/"Next" still appear as the `page.hasPrevious` / `page.hasNext`
  // identifiers, so the stale list matches rendered text only.
  for (const stale of [">Apply<", ">Clear filters<", ">Previous<", ">Next<", ">Save changes<", "Reorder display order"]) {
    assert.ok(!page.includes(stale), `English copy "${stale}" is back in the resource editor`);
  }
  // The option *values* are what the list query filters on; only the labels moved.
  assert.match(page, /value="draft"/);
  assert.match(page, /value="published"/);
  assert.match(page, /aria-label="Navigasi halaman"/);
});

test("destructive controls confirm in Indonesian", () => {
  expectCopy(
    "components/admin/delete-button.tsx",
    ["Hapus dengan aman", "Tindakan ini tidak bisa dibatalkan.", "Menghapus…"],
    ["Delete safely", "cannot be undone", "Deleting"],
  );
  // Each dedicated manager states what survives the delete, so the operator
  // is not guessing whether the media file goes with the row.
  assert.match(read("components/admin/event-promotion-manager.tsx"), /Berkas media tetap disimpan/);
  assert.match(read("components/admin/spaces-manager-client.tsx"), /gambar di Pustaka Media tetap disimpan/);
  assert.match(read("components/admin/experiences-manager-client.tsx"), /Berkas media terkait tidak ikut dihapus/);
});

test("pending and saved feedback is Indonesian", () => {
  expectCopy("components/admin/submit-button.tsx", ["Menyimpan…"], ["Saving"]);
  expectCopy("components/admin/saved-notice.tsx", ["Perubahan disimpan."], ["Changes saved"]);
  // `AdminLoading` is the component name; only the sr-only text is copy.
  expectCopy("app/admin/(dashboard)/loading.tsx", ["Memuat…"], [">Loading"]);
  const unsaved = read("lib/admin/unsaved-changes.ts");
  assert.match(unsaved, /perubahan yang belum disimpan/i);
  assert.ok(!/unsaved changes/i.test(unsaved), "the leave-page prompt is English again");
});

test("the dedicated managers speak Indonesian", () => {
  expectCopy(
    "components/admin/menu-manager-client.tsx",
    ["Kelola kategori dan item menu.", "Tambah item menu", "Harga sesuai permintaan", "Tersedia", "Tidak tersedia", "Duplikat"],
    ["Manage categories and menu items.", "Add menu item", "Price on request", "Available", "Unavailable", "Duplicate"],
  );
  expectCopy(
    "components/admin/gallery-manager-client.tsx",
    ["Kurasi cerita visual untuk situs publik.", "Tambah item galeri", "Tersembunyi"],
    ["Curate the visual story", "Add gallery item", "Hidden"],
  );
  expectCopy(
    "components/admin/experiences-manager-client.tsx",
    ["Kelola pengalaman yang bisa ditemukan pengunjung di Chatten.", "Buat Pengalaman"],
    ["Create Experience", "Add Experience"],
  );
  expectCopy(
    "components/admin/spaces-manager-client.tsx",
    ["Kelola ruang yang bisa ditemukan dan dipakai tamu di Chatten.", "Buat Ruang"],
    ["Create Space", "Add Space"],
  );
});

test("the status badges translate the label but keep the stored value", () => {
  // `published` is the column value the public queries filter on; only what
  // the badge prints changed.
  const experiences = read("components/admin/experiences-manager-client.tsx");
  assert.match(experiences, /experience\.status === "published" \? "Terbit" : "Draf"/);
  const spaces = read("components/admin/spaces-manager-client.tsx");
  assert.match(spaces, /"published"/);
  assert.ok(spaces.includes("Terbit") && spaces.includes("Draf"));
});

test("the sign-in screen and its errors are Indonesian", () => {
  const form = read("app/admin/login/login-form.tsx");
  for (const phrase of ["Kata sandi", "Sedang masuk…", "Masuk", "Email dan kata sandi tidak cocok"]) {
    assert.ok(form.includes(phrase), `the login form no longer says "${phrase}"`);
  }
  // `signInWithPassword` is Supabase API name, not rendered copy.
  for (const stale of [">Password<", ">Signing in<", ">Sign in<", "did not match"]) {
    assert.ok(!form.includes(stale), `English copy "${stale}" is back in the login form`);
  }
  // The ?error= keys are the contract between requireAdmin and this form.
  assert.match(form, /reason === "unauthorized"/);
  assert.match(form, /reason === "forbidden"/);
});

test("the resource registry and its option lists are Indonesian", () => {
  const resources = read("lib/admin/resources.ts");
  for (const phrase of ['label: "Jam Buka"', 'label: "Urutan tampil"', 'label: "Aktif"']) {
    assert.ok(resources.includes(phrase), `the registry no longer declares ${phrase}`);
  }
  // Keys and table names are the routing and query contract and must not move.
  assert.match(resources, /\{ key: "opening-hours", label: "[^"]*", table: "opening_hours"/);

  const options = read("lib/admin/field-options.ts");
  for (const day of ["Minggu", "Senin", "Sabtu"]) assert.ok(options.includes(day), `the day picker lost "${day}"`);
  // The comment above DAY_OPTIONS still names the Postgres dow convention, so
  // the check is on the label declarations rather than the whole file.
  for (const stale of ['"Sunday"', '"Monday"', '"Saturday"']) assert.ok(!options.includes(stale), `English day ${stale} is back`);
  // Brand names stay as brands.
  assert.match(options, /SOCIAL_PLATFORM_OPTIONS/);
});

test("the overview table labels and the untitled fallback are Indonesian", () => {
  expectCopy(
    "lib/admin/overview-tables.ts",
    ["Item menu", "Item galeri", "Tanpa judul", "Testimoni"],
    ["Menu items", "Gallery items", "Untitled", "Testimonials"],
  );
});

test("the CMS error boundary explains the failure in Indonesian", () => {
  const boundary = read("app/admin/(dashboard)/error.tsx");
  for (const phrase of ["Tindakan CMS gagal.", "Tidak ada perubahan yang tersimpan.", "Coba lagi"]) {
    assert.ok(boundary.includes(phrase), `the error boundary no longer says "${phrase}"`);
  }
  // The generic-digest sniff matches React's own English message and must not
  // be translated, or every server error would print the raw digest instead.
  assert.match(boundary, /an error occurred in the server components render/);
});

test("no admin screen still carries the English copy this pass replaced", () => {
  const files = [
    "app/admin/(dashboard)/account/page.tsx",
    "app/admin/(dashboard)/preview/page.tsx",
    "app/admin/(dashboard)/homepage/page.tsx",
    "app/admin/(dashboard)/users/page.tsx",
    "app/admin/(dashboard)/gallery/items/[id]/page.tsx",
    "app/admin/(dashboard)/menu/items/[id]/page.tsx",
    "components/admin/experience-edit-form.tsx",
    "components/admin/space-edit-form.tsx",
  ];
  const stale = [">Save changes<", ">Cancel<", ">Delete<", ">Save<", "Sign out", "Back to "];
  for (const file of files) {
    const source = read(file);
    for (const phrase of stale) {
      assert.ok(!source.includes(phrase), `English copy "${phrase.trim()}" is back in ${file}`);
    }
  }
});
