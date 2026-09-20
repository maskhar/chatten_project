import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const src = fs.readFileSync(new URL("../lib/media/focal-point.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { parseFocalValue, parseFocalPoint, focalObjectPosition } = await import(`data:text/javascript,${encodeURIComponent(js)}`);

test("an empty field clears the focal point rather than failing", () => {
  assert.equal(parseFocalValue(""), null);
  assert.equal(parseFocalValue("   "), null);
  assert.equal(parseFocalValue(null), null);
  assert.equal(parseFocalValue(undefined), null);
});

test("values outside the numeric(5,4) domain are rejected", () => {
  assert.throws(() => parseFocalValue("-0.1"), /between 0 and 1/);
  assert.throws(() => parseFocalValue("1.5"), /between 0 and 1/);
  assert.throws(() => parseFocalValue("left"), /must be a number/);
  assert.throws(() => parseFocalValue("Infinity"), /must be a number/);
});

test("precision is rounded to what the column can hold", () => {
  // numeric(5,4) keeps four decimal places; rounding here rather than letting
  // Postgres do it keeps the stored value and the submitted value in step.
  assert.equal(parseFocalValue("0.123456"), 0.1235);
  assert.equal(parseFocalValue("0"), 0);
  assert.equal(parseFocalValue("1"), 1);
});

test("a half-filled pair is a form error, not a stored row", () => {
  assert.throws(() => parseFocalPoint("0.3", ""), /both/);
  assert.throws(() => parseFocalPoint("", "0.7"), /both/);
});

test("both empty clears both columns", () => {
  assert.deepEqual(parseFocalPoint("", ""), { focal_x: null, focal_y: null });
});

test("both present are stored together", () => {
  assert.deepEqual(parseFocalPoint("0.25", "0.75"), { focal_x: 0.25, focal_y: 0.75 });
});

test("an unset focal point renders as the browser default", () => {
  assert.equal(focalObjectPosition(null), "50% 50%");
  assert.equal(focalObjectPosition({}), "50% 50%");
  assert.equal(focalObjectPosition({ focal_x: 0.5, focal_y: null }), "50% 50%");
});

test("a set focal point becomes a CSS object-position", () => {
  assert.equal(focalObjectPosition({ focal_x: 0.25, focal_y: 0.75 }), "25.00% 75.00%");
  assert.equal(focalObjectPosition({ focal_x: 0, focal_y: 1 }), "0.00% 100.00%");
});
