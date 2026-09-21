import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// A40/A41: the kicker `text-[#b26043]` on `#f4eedf` was ~3.9:1 and appeared on
// nearly every page; several body greys were also under AA. This test is the
// guard against it creeping back in: every foreground colour used as text in
// the public tree is measured against every light surface the site paints.

const lin = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
export function contrastRatio(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// The two surface families the public pages paint text on. A colour is
// legitimate if it clears AA on one of them — the peach accents are meant for
// the dark bands and the greens for the cream ones. What this catches is a
// colour that is too muddy to be readable on either, which is what
// `text-[#b26043]` (3.9:1 on cream, 2.7:1 on green) was.
const LIGHT_SURFACES = ["#f4eedf", "#e8dfca", "#ede3d0", "#d9c9aa"];
const DARK_SURFACES = ["#1f3426", "#233b2a", "#17271d", "#405542"];
// The feature band is its own surface: a mid-tone terracotta that only the
// palest tints clear. It is asserted separately rather than folded into the
// dark family, which would force every green-band accent to be near-white.
const FEATURE_SURFACE = "#a04e33";
const AA_NORMAL = 4.5;

const clearsFamily = (colour, family) => family.every((surface) => contrastRatio(colour, surface) >= AA_NORMAL);
const bestRatio = (colour, family) => Math.min(...family.map((surface) => contrastRatio(colour, surface)));

function publicFiles(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "admin") continue;
      publicFiles(full, found);
    } else if (entry.name.endsWith(".tsx")) {
      found.push(full);
    }
  }
  return found;
}

const root = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const files = [...publicFiles(path.join(root, "app")), ...publicFiles(path.join(root, "components", "public"))];

test("AA maths matches the known reference values", () => {
  // Sanity check on the implementation before trusting its verdicts.
  assert.equal(Math.round(contrastRatio("#000000", "#ffffff")), 21);
  assert.equal(Math.round(contrastRatio("#ffffff", "#ffffff")), 1);
});

test("the cream kicker is the dark one, not the old 3.9:1 terracotta", () => {
  // A40 specifically: this is the colour that appeared on nearly every page.
  assert.ok(contrastRatio("#8a3a21", "#f4eedf") >= AA_NORMAL);
  assert.ok(contrastRatio("#b26043", "#f4eedf") < AA_NORMAL, "the old kicker must stay a failing reference");
});

test("the feature band's own accent clears AA against it", () => {
  // The band was #b65d40, on which even white is 4.54:1 and the peach kicker
  // was 3.3:1. Darkening the band is what makes the accent legible.
  assert.ok(contrastRatio("#ffe8d9", FEATURE_SURFACE) >= AA_NORMAL);
  assert.ok(contrastRatio("#ffffff", FEATURE_SURFACE) >= AA_NORMAL);
  assert.ok(contrastRatio("#ffd4bc", "#b65d40") < AA_NORMAL, "the old pairing must stay a failing reference");
});

// A74 replaced every `text-[#hex]` with a `--color-*` token, so a scan for the
// literal form now matches nothing and would pass by finding no work to do —
// a silently empty test. The colour is resolved through the @theme block
// instead, which keeps this checking the same property against the real values.
const THEME = (() => {
  const css = fs.readFileSync(path.join(root, "app", "globals.css"), "utf8");
  const block = css.match(/@theme\s*\{([\s\S]*?)\n\}/);
  assert.ok(block, "app/globals.css must declare an @theme block");
  const map = new Map();
  for (const m of block[1].matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)) map.set(m[1], m[2].toLowerCase());
  return map;
})();

test("the token scan resolves real colours", () => {
  // Guards the guard: if the @theme parse silently returned nothing, the test
  // below would pass without checking a single colour.
  assert.ok(THEME.size >= 20, `expected a full palette, parsed ${THEME.size} tokens`);
  assert.equal(THEME.get("rust"), "#8a3a21");
});

test("every public text colour is readable on at least one surface family", () => {
  const failures = [];
  let checked = 0;
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    for (const match of src.matchAll(/\btext-([a-z][a-z-]*)\b/g)) {
      const colour = THEME.get(match[1]);
      if (!colour) continue; // text-sm, text-white, text-center …
      checked++;
      if (clearsFamily(colour, LIGHT_SURFACES) || clearsFamily(colour, DARK_SURFACES) || contrastRatio(colour, FEATURE_SURFACE) >= AA_NORMAL) continue;
      failures.push(`${path.relative(root, file)}: ${match[1]} (${colour}) — ${bestRatio(colour, LIGHT_SURFACES).toFixed(2)}:1 on cream, ${bestRatio(colour, DARK_SURFACES).toFixed(2)}:1 on green`);
    }
  }
  assert.ok(checked > 0, "no tokenised text colours found — the scan is not reaching the public pages");
  assert.deepEqual(failures, [], `Below the 4.5:1 AA threshold on both surface families:\n${failures.join("\n")}`);
});
