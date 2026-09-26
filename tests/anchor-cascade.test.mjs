import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// A68. `app/globals.css` reset anchors with an UNLAYERED rule:
//
//     a { color: inherit; text-decoration: none; }
//
// Tailwind v4's `@import "tailwindcss"` puts every utility inside
// `@layer utilities`, and unlayered CSS outranks every cascade layer no matter
// what the specificity is. So a plain element selector silently beat
// `.text-white` on every <a>/<Link> in the repo, while leaving <button>
// untouched — which is exactly why admin "Save changes" buttons stayed
// readable and public "Get Directions" links rendered #1e3024 on #1f3426
// (1.05:1, invisible).
//
// This is not a palette problem and cannot be fixed by changing a colour: any
// future colour utility on an anchor would be discarded the same way. The rule
// has to stay inside `@layer base`.

const css = fs.readFileSync("app/globals.css", "utf8");

/** Strip comments so prose describing the bug is not mistaken for the bug. */
const code = css.replace(/\/\*[\s\S]*?\*\//g, "");

test("the anchor colour reset lives inside a cascade layer", () => {
  const anchorRule = /(^|[\s}])a\s*\{[^}]*color\s*:/m;
  assert.ok(anchorRule.test(code), "the anchor reset is gone; this test no longer guards anything");

  // Find the `@layer base { ... }` block and confirm the rule is inside it.
  const layerStart = code.indexOf("@layer base");
  assert.ok(layerStart !== -1, "globals.css has no `@layer base` block — the anchor reset is unlayered again");

  let depth = 0;
  let end = -1;
  for (let i = code.indexOf("{", layerStart); i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  assert.ok(end !== -1, "the `@layer base` block is unterminated");

  const inside = code.slice(layerStart, end);
  const outside = code.slice(0, layerStart) + code.slice(end);

  assert.ok(anchorRule.test(inside), "the anchor colour reset is not inside `@layer base`");
  assert.ok(
    !anchorRule.test(outside),
    "an unlayered `a { color: ... }` rule is back; it will beat every Tailwind colour utility on every link",
  );
});

test("no other unlayered element rule sets a colour", () => {
  // Same trap, different selector: `p`, `span`, `li` or `button` reset
  // unlayered would defeat utilities on those elements too.
  const layerStart = code.indexOf("@layer base");
  const outside = layerStart === -1 ? code : code.slice(0, layerStart);
  const offenders = [];
  for (const match of outside.matchAll(/(^|[\s}])([a-z][a-z0-9]*)\s*\{([^}]*)\}/gm)) {
    const [, , selector, body] = match;
    // `html` and `body` legitimately carry the page background/foreground:
    // they are the inheritance root, not a utility override.
    if (selector === "html" || selector === "body") continue;
    if (/(^|[;\s])color\s*:/.test(body)) offenders.push(selector);
  }
  assert.deepEqual(offenders, [], `unlayered element rules setting a colour: ${offenders.join(", ")}`);
});
