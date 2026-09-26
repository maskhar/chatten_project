import assert from "node:assert/strict";
import { test } from "node:test";
import ts from "typescript";
import fs from "node:fs/promises";

// Three tests here used to eval a hand-copied string of the component's filter
// and assert the result. That exercised the copy, not the component: the two
// could drift apart and every test would still pass. They now import the real
// predicate, so a change to the picker's filtering is a test failure.

const src = await fs.readFile("components/admin/media-picker.tsx", "utf-8");
ts.transpileModule(src, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

const filterSrc = await fs.readFile("lib/media/picker-filter.ts", "utf-8");
const filterJs = ts.transpileModule(filterSrc, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { pickerCategories, filterPickerMedia } = await import(`data:text/javascript,${encodeURIComponent(filterJs)}`);

function image(id, category, title, alt) {
  return { id, category, title, alt_text: alt ?? null, width: 100, height: 100, bucket: "b", storage_path: "p" };
}

test("the picker lists every distinct category, trimmed, and ignores blanks", () => {
  const media = [
    image("1", "panorama", "A"),
    image("2", "panorama", "B"),
    image("3", "food", "C"),
    image("4", "  space  ", "D"),
    image("5", null, "E"),
    image("6", "", "F"),
  ];
  assert.deepEqual(pickerCategories(media), ["food", "panorama", "space"]);
});

test("search and category narrow together, not separately", () => {
  const media = [
    image("1", "panorama", "Sunset View", "Beautiful sunset"),
    image("2", "panorama", "Mountain Peak", "High mountain"),
    image("3", "food", "Sunset Coffee", "Coffee at sunset"),
    image("4", "food", "Breakfast", "Morning meal"),
  ];
  assert.deepEqual(filterPickerMedia(media, "sunset", "").map((item) => item.id), ["1", "3"]);
  assert.deepEqual(filterPickerMedia(media, "", "panorama").map((item) => item.id), ["1", "2"]);
  assert.deepEqual(filterPickerMedia(media, "sunset", "panorama").map((item) => item.id), ["1"]);
  assert.equal(filterPickerMedia(media, "sunset", "space").length, 0);
  assert.equal(filterPickerMedia(media, "", "").length, 4);
});

test("search is case-insensitive across title, alt text and category", () => {
  const media = [
    image("1", "Panorama", "SUNSET View", "beautiful sunset"),
    image("2", "food", "Coffee", "Morning BREW"),
  ];
  assert.deepEqual(filterPickerMedia(media, "sunset", "").map((item) => item.id), ["1"]);
  assert.deepEqual(filterPickerMedia(media, "BREW", "").map((item) => item.id), ["2"]);
  assert.deepEqual(filterPickerMedia(media, "panorama", "").map((item) => item.id), ["1"]);
});

test("the picker uses the shared filter rather than its own copy", () => {
  assert.ok(src.includes("filterPickerMedia"), "the picker filters inline again");
  assert.ok(src.includes("pickerCategories"), "the picker derives categories inline again");
});

test("state initialized from value is the sole selection source", () => {
  // A92. This test used to assert `item.id === selected` and `value={selected}`
  // directly. That was the shape of a real defect: `selected` is whatever the
  // parent passed in `value`, and nothing checked that the id still exists in
  // `media`. When a selected image is later deleted from the Media Library the
  // "Terpilih" card silently does not render — the screen looks like nothing is
  // chosen — while the submitted field still carries the dead id, so the row
  // saves pointing at an image that is gone.
  //
  // `effective` is the narrowing: `selected` unless it is stale, in which case
  // nothing is submitted. `selected` remains the only *source*, which is what
  // this test is actually about, so the first and last assertions stand.
  assert.match(src, /const \[selected, setSelected\] = useState\(value \?\? ""\)/);
  assert.match(src, /const isStale = selected !== "" && !knownIds\.has\(selected\)/);
  assert.match(src, /const effective = isStale \? "" : selected/);
  assert.match(src, /item\.id === effective/);
  assert.match(src, /const isSelected = effective === item\.id/);
  assert.doesNotMatch(src, /selected\s*\|\|\s*value/);
  assert.ok(
    !/value=\{selected\}/.test(src),
    "the field submits the raw selection again, so a deleted image can still be saved",
  );
});

test("a required picker blocks submission in the browser, not on the server", () => {
  // `required` used to do one thing: hide "Hapus pilihan". The value travelled in
  // an `<input type="hidden">`, and hidden inputs are barred from constraint
  // validation, so a required picker with no selection submitted happily and the
  // failure surfaced as a server error — or as a live row with no image.
  //
  // The sentinel is a real, validated control. `readOnly` would re-exempt it, so
  // it must not appear; `onChange` is present only to keep React from warning
  // about a controlled input with no handler.
  assert.match(src, /type="text"\s*\n\s*name=\{name\}\s*\n\s*value=\{effective\}/);
  assert.match(src, /required=\{required\}/);
  // Comments stripped first: the note explaining that `readOnly` re-exempts the
  // control has to be able to name `readOnly`, or the reason is lost.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/readOnly/.test(code), "readOnly exempts the sentinel from validation again");
  assert.match(src, /onInvalid=\{\(event\) => \{/);
  assert.match(src, /event\.preventDefault\(\);/);
  // The native bubble is in English and points at a visually hidden box, so it is
  // replaced by an Indonesian alert and focus is moved to the picker itself.
  assert.match(src, /const MISSING_MESSAGE = "Pilih satu gambar sebelum menyimpan\."/);
  assert.match(src, /role="alert"[\s\S]{0,160}\{MISSING_MESSAGE\}/);
  assert.match(src, /groupRef\.current\?\.focus\(\)/);
  // An error that outlives its cause reads as a fresh rejection. Derived, not
  // cleared in an effect: clearing it in an effect costs a cascading render and
  // leaves one frame in which the warning is still on screen after a pick.
  assert.match(src, /const showMissing = missing && !effective/);
  assert.match(src, /\{showMissing \? \(/);
});

test("a stale selected id is reported, not silently dropped", () => {
  // Dropping it quietly would be its own bug: the operator cannot tell that the
  // row *had* an image, so saving would blank the field without anyone deciding to.
  assert.match(src, /\{isStale \? \(/);
  assert.match(src, /Gambar yang dipilih sebelumnya sudah tidak ada di Pustaka Media\./);
});

test("an empty selection intentionally clears an existing value", () => {
  assert.match(src, /onClick=\{\(\) => setSelected\(""\)\}/);
  assert.doesNotMatch(src, /value=\{selected\s*\|\|/);
  assert.doesNotMatch(src, /item\.id === \(selected\s*\|\|/);
});

test("MediaPicker keeps removal unavailable when selection is required", () => {
  assert.ok(src.includes("{!required &&"));
  assert.ok(src.includes("Hapus pilihan"));
});

test("MediaPicker uses container layout and can shrink in a narrow sidebar", () => {
  assert.match(src, /className="[^"]*@container[^"]*min-w-0[^"]*w-full[^"]*"/);
  assert.match(src, /className="[^"]*grid[^"]*min-w-0[^"]*w-full[^"]*@md:grid-cols-/);
  assert.match(src, /className="[^"]*flex[^"]*w-full[^"]*flex-wrap[^"]*@sm:w-auto/);
  assert.match(src, /className="[^"]*min-w-0[^"]*flex-1[^"]*"/);
  assert.match(src, /className=\{`min-w-0 w-full overflow-hidden/);
  assert.ok(src.includes('className="block truncate text-xs"'));
});

test("MediaPicker exposes Indonesian accessible names and pressed state", () => {
  assert.ok(src.includes('aria-label="Cari gambar"'));
  assert.ok(src.includes('aria-label="Filter kategori"'));
  assert.ok(src.includes('aria-label={`Pilih ${'));
  assert.ok(src.includes("aria-pressed={isSelected}"));
});

test("MediaPicker uses Indonesian selection and action copy", () => {
  for (const copy of [
    "Terpilih",
    "Ganti",
    "Hapus pilihan",
    "Gambar tanpa judul",
    "Tanpa teks alternatif",
    "Tanpa judul",
  ]) {
    assert.ok(src.includes(copy), `missing Indonesian copy: ${copy}`);
  }
  assert.ok(src.includes("text-leaf-ink"));
});

test("empty states and filters use Indonesian copy", () => {
  for (const copy of [
    "Cari gambar...",
    "Semua kategori",
    "Bersihkan filter",
    "Belum ada gambar",
    "Unggah gambar di Pustaka Media dan gambar akan langsung tampil di sini.",
    "Buka Pustaka Media",
    "Tidak ada gambar yang sesuai dengan filter.",
  ]) {
    assert.ok(src.includes(copy), `missing Indonesian copy: ${copy}`);
  }
  assert.ok(!/approve/i.test(src), "the picker mentions approving an image again");
  assert.ok(src.includes('href="/admin/media"'));
});

test("MediaPicker no longer exposes English interface copy", () => {
  // `Selected`, `Replace` and `Remove` also occur as fragments of identifiers
  // such as `isSelected`, so they are matched as rendered JSX text only. The
  // rest are literal strings the operator reads.
  for (const jsxText of ["Selected", "Replace", "Remove", "Untitled"]) {
    assert.doesNotMatch(
      src,
      new RegExp(`>\\s*${jsxText}\\s*<`),
      `English copy rendered: ${jsxText}`,
    );
  }
  for (const literal of [
    "Search images",
    "All categories",
    "Clear filters",
    "No images yet",
    "No images match",
    "Open Media Library",
    "Untitled image",
    "No alt text",
    "Select ${",
  ]) {
    assert.ok(!src.includes(literal), `English copy remains: ${literal}`);
  }
});

test("MediaPicker visual selection uses ring and not color alone", () => {
  assert.ok(src.includes("ring-2"));
  assert.ok(src.includes("ring-leaf-ink"));
  assert.ok(src.includes("Terpilih"));
});
