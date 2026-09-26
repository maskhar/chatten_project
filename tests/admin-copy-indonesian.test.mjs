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

// A85: the first pass covered the screens an operator clicks, but every failure
// message they actually read on a bad save comes from the shared layers below
// them — ActionForm's fallback, the reorder guards, the media delete/usage
// state, and the generic resource action. Those were still English, so a
// successful save was Indonesian and a failed one was not. These pin the shared
// copy too.

test("the shared save-failure fallback is Indonesian and still detects Next's redaction", () => {
  const form = read("components/admin/action-form.tsx");
  assert.ok(form.includes("Penyimpanan gagal. Perubahan Anda masih ada. Periksa formulir lalu coba lagi."));
  assert.match(form, /role="alert"/);
  // A91: the redaction sniff moved to lib/admin/action-feedback.ts so the row
  // actions inside the managers share it instead of re-deriving it. Pin it
  // where it now lives, and pin that the form reads it from there rather than
  // keeping a second copy that could drift.
  assert.match(form, /from "@\/lib\/admin\/action-feedback"/);
  assert.match(form, /actionErrorMessage\(error, SAVE_FAILED\)/);
  const feedback = read("lib/admin/action-feedback.ts");
  // The sniff matches the framework's own English redaction text, not UI copy;
  // translating it would echo the raw boilerplate to the operator instead.
  assert.match(feedback, /\^an error occurred in the server components render/i);
  assert.match(feedback, /NEXT_REDIRECT/);
});

// A91: a row action that fails must say so in Indonesian, next to the row that
// failed. Before this, spaces/experiences swallowed the rejection entirely or
// raised a blocking `alert()`, and the reorder list painted every outcome in the
// success colour under `role="status"`.
test("row actions and the reorder list report their outcome in Indonesian", () => {
  const list = read("components/admin/sortable-list.tsx");
  for (const phrase of [
    "Gagal menyimpan urutan.",
    "Urutan tersimpan telah dipulihkan.",
    "Urutan belum berubah, jadi tidak ada yang perlu disimpan.",
    "Urutan berhasil disimpan.",
  ]) {
    assert.ok(list.includes(phrase), `the reorder list no longer says "${phrase}"`);
  }
  assert.match(list, /role="alert"/, "a failed reorder must be an alert, not a polite status");

  const managers = [
    ["components/admin/spaces-manager-client.tsx", "Ruang gagal dihapus."],
    ["components/admin/experiences-manager-client.tsx", "Pengalaman gagal dihapus."],
    ["components/admin/gallery-manager-client.tsx", "Item galeri gagal dihapus."],
    ["components/admin/menu-manager-client.tsx", "Item menu gagal dihapus."],
    ["components/admin/homepage-sortable.tsx", "Status tampil bagian beranda gagal diperbarui."],
  ];
  for (const [file, fallback] of managers) {
    const source = read(file);
    assert.ok(source.includes(fallback), `${file} no longer carries the Indonesian fallback "${fallback}"`);
    assert.ok(!/\balert\(/.test(source), `${file} reports a row failure with a blocking alert() again`);
  }
});

test("reorder validation and persistence report failures in Indonesian", () => {
  const core = read("lib/admin/reorder-core.ts");
  assert.match(core, /label = "urutan"/);
  assert.match(core, /\$\{label\} tidak valid\./);
  const reorder = read("lib/admin/reorder.ts");
  assert.match(reorder, /Gagal menyimpan \$\{label\}\./);
  // The RPC name and its argument keys are the database contract.
  assert.match(reorder, /rpc\("reorder_rows"/);
  assert.match(reorder, /target_table: table/);
});

test("the generic resource action speaks Indonesian without moving its field keys", () => {
  const actions = read("lib/admin/actions.ts");
  for (const phrase of [
    "Modul CMS tidak dikenal.",
    "Modul ini tidak memiliki urutan tampilan.",
    "Urutan baru tidak diterima. Muat ulang halaman lalu coba atur urutan lagi.",
    "harus berupa URL http(s).",
    "bukan salah satu pilihan yang tersedia.",
  ]) {
    assert.ok(actions.includes(phrase), `the resource action no longer says "${phrase}"`);
  }
  // The validated field names are the payload contract, not copy.
  assert.ok(actions.includes("map_embed_url") && actions.includes("sort_order"));
});

test("media save, delete and focal-point errors are Indonesian", () => {
  expectCopy(
    "lib/admin/media-actions.ts",
    ["Detail media gagal disimpan.", "Pilih satu gambar untuk diunggah.", "Gambar ini sudah tidak tersedia untuk dihapus."],
    ["could not be saved", "Select one image", "no longer available"],
  );
  expectCopy(
    "lib/media/focal-point.ts",
    ["Titik fokus harus berupa angka antara 0 dan 1.", "Isi kedua nilai titik fokus, atau kosongkan keduanya."],
    ["must be a number", "Fill in both"],
  );
  expectCopy(
    "components/admin/media-delete-control.tsx",
    ["Digunakan di:", "Menghapus…", "Hapus dengan aman"],
    ["Used in:", "Deleting", "Delete safely"],
  );
});

test("media usage and delete state describe usage in Indonesian", () => {
  const presentation = read("lib/media/usage-presentation.ts");
  assert.ok(presentation.includes("Gambar ini belum dipakai di mana pun."));
  assert.match(presentation, /Dipakai di \$\{count\} tempat/);
  const deleteState = read("lib/media/delete-state.ts");
  assert.ok(deleteState.includes("Gambar ini tidak dapat dihapus karena sedang dipakai di "));
  assert.ok(deleteState.includes("Gambar akan dihapus permanen dari Pustaka Media dan Storage."));
  // `resource` keys are the map contract every usage consumer reads; only the
  // label and the fallback title are operator copy.
  const usage = read("lib/media/usage.ts");
  for (const key of ["hero:", "moment:", "about:", "experience:", "space:", "gallery:", "event:", "promotion:", "menu:", "seo:"]) {
    assert.ok(usage.includes(key), `the usage metadata lost the "${key}" key`);
  }
  for (const label of ["Momen", "Tentang", "Pengalaman", "Ruang", "Galeri", "Acara", "Promosi"]) {
    assert.ok(usage.includes(`label: "${label}"`), `the usage metadata no longer labels "${label}"`);
  }
});

test("status and role badges translate the label while the stored value stays English", () => {
  const manager = read("components/admin/event-promotion-manager.tsx");
  assert.match(manager, /status==="published"\?"Terbit":"Draf"/);
  assert.match(manager, /<option value="draft">/);
  assert.match(manager, /<option value="published">/);

  const preview = read("app/admin/(dashboard)/preview/page.tsx");
  assert.match(preview, /status === "published" \? "Terbit" : "Draf"/);
  assert.ok(!/>\s*(draft|published)\s*</.test(preview), "the preview prints a raw stored status");

  const users = read("app/admin/(dashboard)/users/page.tsx");
  // The map keys are the stored role values; only what the cell prints moved.
  for (const role of ["super_admin", "admin", "editor"]) {
    assert.ok(users.includes(`${role}:`) || users.includes(`value="${role}"`), `the users page lost the "${role}" role value`);
  }
  assert.match(users, /roleLabels\[user\.role\] \?\? user\.role/);
});

test("the domain actions name their module in Indonesian", () => {
  const modules = [
    ["lib/admin/experience-actions.ts", "urutan pengalaman", "Pengalaman"],
    ["lib/admin/space-actions.ts", "urutan ruang", "Ruang"],
    ["lib/admin/gallery-actions.ts", "urutan galeri", "Item galeri"],
    ["lib/admin/homepage-actions.ts", "urutan beranda", "beranda"],
  ];
  for (const [file, label, noun] of modules) {
    const source = read(file);
    assert.ok(source.includes(label), `${file} no longer passes the "${label}" reorder label`);
    assert.ok(source.includes(noun), `${file} no longer names "${noun}"`);
  }
  // Every media lookup points the operator at the same screen name.
  for (const file of [
    "lib/admin/experience-actions.ts",
    "lib/admin/space-actions.ts",
    "lib/admin/gallery-actions.ts",
    "lib/admin/event-actions.ts",
    "lib/admin/promotion-actions.ts",
  ]) {
    const source = read(file);
    assert.ok(source.includes("Gambar tidak ditemukan di Pustaka Media. Pilih gambar lain."), `${file} lost the Indonesian media lookup message`);
    assert.ok(!source.includes("not found in the Media Library"), `English media lookup copy is back in ${file}`);
  }
});

// A86: the operator guide quoted button labels verbatim, so translating the UI
// silently turned the guide into instructions for a screen that no longer
// exists ("click Delete safely" when the button says "Hapus dengan aman"). Pin
// each quoted control to the source string it names, so the two move together.
test("the operator guide quotes labels that still exist in the UI", () => {
  const guide = read("docs/CMS_GUIDE.md");
  const quoted = [
    ["Cari media…", "app/admin/(dashboard)/media/page.tsx"],
    ["Hapus filter", "app/admin/(dashboard)/media/page.tsx"],
    ["Lihat / Edit", "app/admin/(dashboard)/media/page.tsx"],
    ["Semua penggunaan", "app/admin/(dashboard)/media/page.tsx"],
    ["Belum digunakan", "app/admin/(dashboard)/media/page.tsx"],
    ["Digunakan di", "app/admin/(dashboard)/media/items/[id]/page.tsx"],
    ["Hapus dengan aman", "components/admin/media-delete-control.tsx"],
    // A91 (lanjutan): "Hasil terkunci"/"Kosongkan pilihan" belonged to the queue
    // that locked itself permanently on the first result. The guide now names the
    // controls that replaced them.
    ["Kosongkan antrean", "components/admin/media-upload-dropzone.tsx"],
    ["Hapus dari antrean", "components/admin/media-upload-dropzone.tsx"],
    ["berkas gagal", "components/admin/media-upload-dropzone.tsx"],
    ["berkas tersisa", "components/admin/media-upload-dropzone.tsx"],
    ["Gambar ini belum dipakai di mana pun.", "lib/media/usage-presentation.ts"],
  ];
  for (const [label, file] of quoted) {
    assert.ok(guide.includes(label), `the guide no longer quotes "${label}"`);
    assert.ok(read(file).includes(label), `the guide quotes "${label}" but ${file} no longer renders it`);
  }
  // The English labels the guide used to quote are gone from the UI, so the
  // guide must not name them either.
  for (const stale of ["Search media", "Clear filters", "View / Edit", "Used In", "Delete safely", "All usage", "Media Library"]) {
    assert.ok(!guide.includes(stale), `the guide still tells the operator to look for "${stale}"`);
  }
});

test("the media workflow doc does not document the removed rights column", () => {
  // `rights_status` was dropped by 20260921000500_remove_media_rights_approval.sql.
  // A doc that still gates publication on it sends operators looking for a
  // control that no longer exists.
  const workflow = read("docs/MEDIA_WORKFLOW.md");
  for (const stale of ["Set `rights_status`", "rights_status: unknown", "`approved` is required", "remains next step"]) {
    assert.ok(!workflow.includes(stale), `the media workflow doc still documents "${stale}"`);
  }
  assert.ok(workflow.includes("Digunakan di"), "the doc no longer names the shipped usage heading");
  const migration = read("supabase/migrations/20260921000500_remove_media_rights_approval.sql");
  assert.match(migration, /rights_status/, "the migration this doc cites no longer touches rights_status");
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
