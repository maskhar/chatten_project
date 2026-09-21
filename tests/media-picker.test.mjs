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

test("MediaPicker shows Replace button for current selection", () => {
  assert.ok(src.includes('Replace'));
  assert.ok(src.includes('onClick={() => setSelected("")}'));
});

test("MediaPicker shows Remove button only when not required", () => {
  assert.ok(src.includes('{!required &&'));
  assert.ok(src.includes('Remove'));
});

test("MediaPicker displays Selected indicator on current image", () => {
  assert.ok(src.includes('Selected'));
  assert.ok(src.includes('text-leaf-ink'));
});

test("the empty state tells the operator uploading is the only step", () => {
  // There is no approval step left to mention: an uploaded image reaches the
  // picker immediately, and the old copy promised a second action that no
  // longer exists.
  assert.ok(src.includes('No images yet'));
  assert.ok(src.includes('it appears here straight away'));
  assert.ok(!/approve/i.test(src), "the picker mentions approving an image again");
  assert.ok(src.includes('href="/admin/media"'));
  assert.ok(src.includes('Open Media Library'));
});

test("MediaPicker shows filtered empty state with clear action", () => {
  assert.ok(src.includes('No images match your filters'));
  assert.ok(src.includes('Clear filters'));
});

test("MediaPicker includes accessibility attributes", () => {
  assert.ok(src.includes('aria-label'));
  assert.ok(src.includes('aria-pressed'));
});

test("MediaPicker visual selection uses ring and not color-only", () => {
  assert.ok(src.includes('ring-2'));
  assert.ok(src.includes('ring-leaf-ink'));
  assert.ok(src.includes('Selected'));
});
