import test from "node:test";
import assert from "node:assert/strict";

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

test("generates valid slug from experience name", () => {
  assert.equal(slugify("Morning Coffee"), "morning-coffee");
  assert.equal(slugify("Golden Hour Experience"), "golden-hour-experience");
  assert.equal(slugify("Day at Chatten"), "day-at-chatten");
});

test("handles special characters and spaces in experience slug", () => {
  assert.equal(slugify("Coffee & Conversation"), "coffee-conversation");
  assert.equal(slugify("Night Sky Views!"), "night-sky-views");
  assert.equal(slugify("Sunrise @ Batu"), "sunrise-batu");
});

test("removes leading and trailing hyphens from slug", () => {
  assert.equal(slugify("-morning-coffee-"), "morning-coffee");
  assert.equal(slugify("---golden-hour---"), "golden-hour");
});

test("collapses multiple hyphens in slug", () => {
  assert.equal(slugify("morning   coffee"), "morning-coffee");
  assert.equal(slugify("golden--hour"), "golden-hour");
});

test("handles empty or whitespace-only slug input", () => {
  assert.equal(slugify(""), "");
  assert.equal(slugify("   "), "");
});

test("preserves numbers in experience slug", () => {
  assert.equal(slugify("Experience 2024"), "experience-2024");
  assert.equal(slugify("Coffee at 7am"), "coffee-at-7am");
});