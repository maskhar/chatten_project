import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// A71. `px-2 py-1 text-xs` was the house style for every row action in all six
// admin managers: 12px text + a 16px line box + 8px of padding = ~24px tall,
// against a 44px comfortable minimum. Every reorder arrow, Edit, Delete and
// Hide/Show control in the CMS was ~45% under it, on every phone.
//
// The fix was to name the pattern once in components/ui/control.ts. This test
// is what stops it being hand-copied back: a directory scan for the raw string
// rather than an assertion about any one file, because the defect was never
// in one file — it was a convention.
//
// The public side has the same shape of bug: components/ui/cta.tsx has carried
// `min-h-11` since A49, so every public failure was a raw anchor that bypassed
// the component. Those are covered by the second test.

const root = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function sourceFiles(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, found);
    else if (entry.name.endsWith(".tsx")) found.push(full);
  }
  return found;
}

const files = [...sourceFiles(path.join(root, "app")), ...sourceFiles(path.join(root, "components"))];
const read = (file) => fs.readFileSync(file, "utf8");
const rel = (file) => path.relative(root, file).replace(/\\/g, "/");

test("the shared control classes exist and are 44px", () => {
  const control = fs.readFileSync(path.join(root, "components", "ui", "control.ts"), "utf8");
  for (const name of ["ROW_ACTION", "ROW_ACTION_BORDERED", "ROW_ACTION_DANGER", "ROW_ACTION_PRIMARY", "TEXT_LINK", "TAP_TARGET", "FOCUS_RING"]) {
    assert.ok(control.includes(`export const ${name}`), `components/ui/control.ts no longer exports ${name}`);
  }
  // min-h-11 is 2.75rem is 44px exactly. If this ever becomes a smaller number
  // the whole point of the file is gone.
  for (const name of ["ROW_ACTION", "TEXT_LINK", "TAP_TARGET"]) {
    const line = control.match(new RegExp(`export const ${name}\\b[\\s\\S]*?;`))?.[0] ?? "";
    assert.match(line, /min-h-11/, `${name} no longer guarantees a 44px target`);
  }
});

test("no admin control uses the ~24px px-2 py-1 text-xs pattern", () => {
  // The three parts in any order: `px-2 py-1 text-xs` is how it was always
  // written, but a reformat could reorder them.
  const offenders = [];
  for (const file of files) {
    const src = read(file);
    for (const match of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const classes = match[1] ?? match[2] ?? "";
      const hasTightPadding = /\bpx-2\b/.test(classes) && /\bpy-1\b/.test(classes);
      const isSmallText = /\btext-xs\b/.test(classes);
      const hasHeight = /\bmin-h-(?:9|10|11|12|\[)/.test(classes);
      if (hasTightPadding && isSmallText && !hasHeight) {
        offenders.push(`${rel(file)}: ${classes.slice(0, 80)}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Controls back under the 44px touch-target minimum — use a class from components/ui/control.ts:\n${offenders.join("\n")}`,
  );
});

test("no public anchor re-implements the CTA underline without a height", () => {
  // `border-b … pb-1 text-sm font-semibold` is the "View Full Menu" style.
  // Written by hand it measures 25px; TEXT_LINK is the same look with
  // min-h-11. Only the public tree is scanned — admin has its own idiom.
  //
  // The tag is captured, not just the className, because the same underline
  // style is also used as *decoration inside* a link. app/experience/page.tsx
  // renders it on a <span> within an <a> that wraps an h-72 image and a p-7
  // body — the anchor is ~350px tall, the span is not a target at all, and
  // giving it TEXT_LINK would nest a second focus ring inside one link. A
  // className-only scan cannot tell a CTA from a label inside a CTA; the tag
  // name can.
  const offenders = [];
  for (const file of files) {
    if (rel(file).includes("/admin/")) continue;
    const src = read(file);
    for (const match of src.matchAll(/<(a|Link)\b[^>]*?className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const classes = match[2] ?? match[3] ?? "";
      const isUnderlineCta = /\bborder-b\b/.test(classes) && /\bpb-1\b/.test(classes) && /\bfont-semibold\b/.test(classes);
      const hasHeight = /\bmin-h-(?:9|10|11|12|\[)/.test(classes);
      if (isUnderlineCta && !hasHeight) offenders.push(`${rel(file)}: ${classes.slice(0, 80)}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Hand-written underline CTAs measure ~25px — use TEXT_LINK from components/ui/control.ts:\n${offenders.join("\n")}`,
  );
});

test("focus-visible, not focus, is how the outline gets replaced", () => {
  // `focus:outline-none` with a `focus:ring` fires on mouse clicks too, which
  // is why the pattern kept being removed again. The rule: if a file strips
  // the native outline, it must put a focus-visible ring back.
  const offenders = [];
  for (const file of files) {
    const src = read(file);
    if (!src.includes("focus:outline-none")) continue;
    if (!src.includes("focus-visible:ring")) {
      offenders.push(`${rel(file)}: strips the outline with no focus-visible replacement`);
    }
  }
  assert.deepEqual(offenders, [], offenders.join("\n"));
});
