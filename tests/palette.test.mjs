// A74. The palette drifted to 66 hardcoded hexes because nothing stopped it:
// each one was a reasonable local choice, and the sixth spelling of the same
// green looked no different from the first at the point it was typed.
//
// These tests are the thing that was missing. They do not check that the
// design is good — they check the two properties that let the drift happen:
// that a colour has a name, and that ink can be read on the surface it is
// painted on.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOTS = ["app", "components"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}
const sources = ROOTS.flatMap((r) => walk(r));
const globals = readFileSync("app/globals.css", "utf8");

// --- colour maths, duplicated here on purpose -------------------------------
// A test that imports the implementation's own contrast helper would pass even
// if that helper were wrong. These are straight from WCAG 2.1 and CIE.
const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const luminance = (hex) => {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

function tokens() {
  const block = globals.match(/@theme\s*\{([\s\S]*?)\n\}/);
  assert.ok(block, "app/globals.css must declare an @theme block");
  const map = new Map();
  for (const m of block[1].matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)) {
    map.set(m[1], m[2].toLowerCase());
  }
  return map;
}

test("every colour in the @theme block has a unique value", () => {
  const map = tokens();
  assert.ok(map.size >= 20, `expected a real palette, found ${map.size} tokens`);
  const seen = new Map();
  for (const [name, value] of map) {
    if (seen.has(value)) {
      assert.fail(`--color-${name} and --color-${seen.get(value)} are both ${value}; one of them is redundant`);
    }
    seen.set(value, name);
  }
});

test("components use palette tokens, not raw hex", () => {
  const offenders = [];
  for (const file of sources) {
    const src = readFileSync(file, "utf8");
    // Strip comments first: the notes explaining *why* a colour changed quote
    // the old hexes, and that is exactly the documentation worth keeping.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const m of code.matchAll(/([a-z][a-z-]*)-\[(#[0-9a-fA-F]{6})\]/g)) {
      offenders.push(`${file.replace(/\\/g, "/")}  ${m[0]}`);
    }
  }
  assert.deepEqual(offenders, [], `use a --color-* token instead:\n${offenders.join("\n")}`);
});

// Which token is legible on which surface is not derivable from the CSS — the
// pairing lives in the JSX. This table records the surfaces each ink token is
// actually painted on, so a future change to either side gets caught.
//
// It is deliberately about *real* pairings. Asserting every token against
// white would fail `peach-pale`, which is only ever ink on the rust band, and
// would say nothing true about the site.
const INK_ON = {
  forest: ["cream", "sand", "paper"],
  leaf: ["cream", "sand", "paper"],
  "leaf-ink": ["cream", "sand", "paper"],
  ink: ["cream", "sand", "paper"],
  "ink-muted": ["cream", "sand", "paper"],
  "ink-dim": ["paper"],
  rust: ["cream", "sand", "paper"],
  clay: ["cream", "sand", "paper"],
  bark: ["cream", "sand", "paper"],
  "peach-light": ["forest", "forest-deep", "moss"],
  "peach-pale": ["terracotta-deep"],
};

test("every ink token clears WCAG AA on the surfaces it is painted on", () => {
  const map = tokens();
  const failures = [];
  for (const [ink, surfaces] of Object.entries(INK_ON)) {
    const fg = map.get(ink);
    assert.ok(fg, `--color-${ink} is referenced by this test but not declared`);
    for (const surface of surfaces) {
      const bg = map.get(surface);
      assert.ok(bg, `--color-${surface} is referenced by this test but not declared`);
      const ratio = contrast(fg, bg);
      if (ratio < 4.5) failures.push(`${ink} (${fg}) on ${surface} (${bg}) = ${ratio.toFixed(2)}:1`);
    }
  }
  assert.deepEqual(failures, [], `below 4.5:1:\n${failures.join("\n")}`);
});

test("white text clears AA on every dark surface it is used on", () => {
  const map = tokens();
  const failures = [];
  for (const surface of ["forest", "forest-deep", "forest-soft", "moss", "terracotta-deep"]) {
    const bg = map.get(surface);
    const ratio = contrast("#ffffff", bg);
    if (ratio < 4.5) failures.push(`white on ${surface} (${bg}) = ${ratio.toFixed(2)}:1`);
  }
  assert.deepEqual(failures, [], `below 4.5:1:\n${failures.join("\n")}`);
});
