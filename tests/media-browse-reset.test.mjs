import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// The rights filter was removed with the approval gate, so the Media Library
// now has three filters, not four. This reads the page rather than an inline
// literal: the point is that the clear-filters control still knows about every
// filter the page can set, or an operator gets stuck on a narrowed view.
const page = fs.readFileSync("app/admin/(dashboard)/media/page.tsx", "utf8");

test("the media grid offers search, usage and category — and no rights filter", () => {
  assert.ok(!/rights/i.test(page.replace(/^\s*\/\/.*$/gm, "")), "the rights filter is back on the media grid");
  for (const param of ["q", "usage", "category"]) {
    assert.ok(page.includes(param), `the media grid no longer reads the ${param} filter`);
  }
});

test("clearing filters returns to the unfiltered library", () => {
  assert.match(page, /href="\/admin\/media"/, "there is no way back to the unfiltered list");
});
