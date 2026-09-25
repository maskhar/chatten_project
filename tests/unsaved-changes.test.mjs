import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const src = fs.readFileSync(new URL("../lib/admin/unsaved-changes.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const {
  shouldGuardNavigation,
  UNSAVED_MESSAGE,
  serializeFormEntries,
  initialGuardState,
  reduceGuardState,
  isGuardDirty,
} = await import(`data:text/javascript,${encodeURIComponent(js)}`);

const HERE = "https://chatten.example/admin/menu?page=2";
const intent = (overrides) => ({ href: null, target: null, hasDownload: false, modified: false, ...overrides });

test("leaving for another admin page is guarded", () => {
  assert.equal(shouldGuardNavigation(intent({ href: "/admin/gallery" }), HERE), true);
  assert.equal(shouldGuardNavigation(intent({ href: "https://chatten.example/" }), HERE), true);
});

test("a different page of the same list is still leaving", () => {
  // Pagination is a real navigation: the form on screen is replaced.
  assert.equal(shouldGuardNavigation(intent({ href: "/admin/menu?page=3" }), HERE), true);
});

test("a same-page anchor only moves the scroll position", () => {
  assert.equal(shouldGuardNavigation(intent({ href: "#top" }), HERE), false);
  assert.equal(shouldGuardNavigation(intent({ href: "/admin/menu?page=2#row" }), HERE), false);
});

test("a click that opens a new tab leaves this page alive", () => {
  assert.equal(shouldGuardNavigation(intent({ href: "/admin/gallery", modified: true }), HERE), false);
  assert.equal(shouldGuardNavigation(intent({ href: "/admin/gallery", target: "_blank" }), HERE), false);
  assert.equal(shouldGuardNavigation(intent({ href: "/admin/gallery", target: "_self" }), HERE), true);
});

test("downloads and non-http schemes do not navigate", () => {
  assert.equal(shouldGuardNavigation(intent({ href: "/api/media/abc", hasDownload: true }), HERE), false);
  assert.equal(shouldGuardNavigation(intent({ href: "mailto:hi@chatten.example" }), HERE), false);
  assert.equal(shouldGuardNavigation(intent({ href: "tel:+628123" }), HERE), false);
});

test("an anchor with no or an unparseable href is not a navigation", () => {
  assert.equal(shouldGuardNavigation(intent({ href: null }), HERE), false);
  assert.equal(shouldGuardNavigation(intent({ href: "" }), HERE), false);
  assert.equal(shouldGuardNavigation(intent({ href: "http://[" }), HERE), false);
});

test("the warning names the consequence", () => {
  assert.match(UNSAVED_MESSAGE, /unsaved changes/i);
});

// ---------------------------------------------------------------------------
// A80: dirty state must survive a failed save
// ---------------------------------------------------------------------------
//
// The bug these cover: the guard cleared its dirty flag on the DOM `submit`
// event, i.e. when the request *started*. Every one of these would have passed
// vacuously against that implementation only if it asserted on submit; they
// assert on what is true after the server answers, which is where it broke.

const snap = (fields) => serializeFormEntries(Object.entries(fields));

function run(events, start = snap({ title: "Morning Ritual" })) {
  return events.reduce(reduceGuardState, initialGuardState(start));
}

test("a form matching what the server rendered starts clean", () => {
  assert.equal(isGuardDirty(initialGuardState(snap({ title: "Morning Ritual" }))), false);
});

test("typing makes the form dirty", () => {
  const state = run([{ type: "edit", snapshot: snap({ title: "Morning Rituals" }) }]);
  assert.equal(isGuardDirty(state), true);
});

test("submitting does NOT clear dirty state on its own", () => {
  // The core regression. A submit is a request, not an outcome; nothing is
  // saved until the server says so.
  const edited = snap({ title: "Morning Rituals" });
  const state = run([
    { type: "edit", snapshot: edited },
    { type: "submit", snapshot: edited },
  ]);
  assert.equal(isGuardDirty(state), true, "dirty was cleared at submit time");
  assert.equal(state.phase, "saving");
});

test("a failed save preserves dirty state and the warning", () => {
  const edited = snap({ title: "Morning Rituals" });
  const state = run([
    { type: "edit", snapshot: edited },
    { type: "submit", snapshot: edited },
    { type: "settle", outcome: "failure" },
  ]);
  assert.equal(isGuardDirty(state), true, "a rejected save must not look saved");
  assert.equal(state.phase, "idle");
  assert.equal(state.submitted, null);
});

test("only a confirmed successful save clears dirty state", () => {
  const edited = snap({ title: "Morning Rituals" });
  const state = run([
    { type: "edit", snapshot: edited },
    { type: "submit", snapshot: edited },
    { type: "settle", outcome: "success" },
  ]);
  assert.equal(isGuardDirty(state), false);
  assert.equal(state.baseline, edited, "the baseline must move to what was saved");
});

test("retrying after a failure and succeeding clears dirty state", () => {
  const first = snap({ title: "" });
  const second = snap({ title: "Morning Rituals" });
  const state = run([
    { type: "edit", snapshot: first },
    { type: "submit", snapshot: first },
    { type: "settle", outcome: "failure" },
    { type: "edit", snapshot: second },
    { type: "submit", snapshot: second },
    { type: "settle", outcome: "success" },
  ]);
  assert.equal(isGuardDirty(state), false);
  assert.equal(state.baseline, second);
});

test("edits made while a save is in flight stay dirty after it succeeds", () => {
  // The request left with the older values, so the later keystrokes were never
  // part of it. Clearing them would discard work the server never saw.
  const submitted = snap({ title: "Morning Rituals" });
  const typedDuring = snap({ title: "Morning Rituals & Coffee" });
  const state = run([
    { type: "edit", snapshot: submitted },
    { type: "submit", snapshot: submitted },
    { type: "edit", snapshot: typedDuring },
    { type: "settle", outcome: "success" },
  ]);
  assert.equal(isGuardDirty(state), true, "in-flight edits were silently discarded");
  assert.equal(state.baseline, submitted, "the baseline is what was sent, not what is on screen");
  assert.equal(state.current, typedDuring);
});

test("a settle with no submit in flight cannot invent a baseline", () => {
  // Defensive: a stray success must not clear work that was never submitted.
  const original = snap({ title: "Morning Ritual" });
  const edited = snap({ title: "Morning Rituals" });
  const state = run([
    { type: "edit", snapshot: edited },
    { type: "settle", outcome: "success" },
  ], original);
  assert.equal(state.baseline, original);
  assert.equal(state.current, edited);
  assert.equal(isGuardDirty(state), true);
  assert.equal(state.submitted, null);
  assert.equal(state.phase, "idle");
});

test("typing a character and deleting it again is not dirty", () => {
  const original = snap({ title: "Morning Ritual" });
  const state = run([
    { type: "edit", snapshot: snap({ title: "Morning Rituall" }) },
    { type: "edit", snapshot: original },
  ], original);
  assert.equal(isGuardDirty(state), false);
});

test("resetting the form restores agreement with the server", () => {
  const original = snap({ title: "Morning Ritual" });
  const state = run([
    { type: "edit", snapshot: snap({ title: "Morning Rituals" }) },
    { type: "reset", snapshot: original },
  ], original);
  assert.equal(isGuardDirty(state), false);
  assert.equal(state.phase, "idle");
});

test("a failure after a reset leaves the form clean", () => {
  const original = snap({ title: "Morning Ritual" });
  const state = run([{ type: "reset", snapshot: original }, { type: "settle", outcome: "failure" }], original);
  assert.equal(isGuardDirty(state), false);
});

// --- snapshot semantics -----------------------------------------------------

test("field order does not affect the snapshot", () => {
  // A revalidated server render can reorder the DOM. That is not an edit.
  assert.equal(
    serializeFormEntries([["b", "2"], ["a", "1"]]),
    serializeFormEntries([["a", "1"], ["b", "2"]]),
  );
});

test("repeated field names keep their relative order", () => {
  // Checkbox groups and multi-selects submit the same name more than once;
  // ["x","1"],["x","2"] is a different selection from ["x","2"],["x","1"].
  assert.notEqual(
    serializeFormEntries([["x", "1"], ["x", "2"]]),
    serializeFormEntries([["x", "2"], ["x", "1"]]),
  );
});

test("a changed value changes the snapshot", () => {
  assert.notEqual(serializeFormEntries([["a", "1"]]), serializeFormEntries([["a", "2"]]));
});

test("a value and a field name cannot be confused for one another", () => {
  // Naive concatenation would make {ab: ""} and {a: "b"} identical.
  assert.notEqual(serializeFormEntries([["ab", ""]]), serializeFormEntries([["a", "b"]]));
});

test("an added empty field is still a change", () => {
  assert.notEqual(serializeFormEntries([["a", "1"]]), serializeFormEntries([["a", "1"], ["b", ""]]));
});

test("files are compared by identity, not read into memory", () => {
  const file = (name, size, lastModified) => ({ name, size, lastModified });
  const same = serializeFormEntries([["upload", file("hero.jpg", 1024, 5)]]);
  assert.equal(same, serializeFormEntries([["upload", file("hero.jpg", 1024, 5)]]));
  assert.notEqual(same, serializeFormEntries([["upload", file("hero.jpg", 2048, 5)]]));
  assert.notEqual(same, serializeFormEntries([["upload", file("other.jpg", 1024, 5)]]));
  // A file must not collide with a text field that happens to say the same.
  assert.notEqual(
    serializeFormEntries([["upload", file("hero.jpg", 1024, 5)]]),
    serializeFormEntries([["upload", "hero.jpg"]]),
  );
});

// --- the component must not regress to clearing on submit -------------------

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

const guard = fs.readFileSync(path.join(root, "components", "admin", "unsaved-changes-guard.tsx"), "utf8");
const guardCode = guard.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

test("the guard component does not mark itself clean on the submit event", () => {
  // The original defect was one line: `form.addEventListener("submit", markClean)`.
  // Assert on the shape rather than the exact string so a rename cannot hide it.
  const submitHandler = guardCode.match(/addEventListener\(\s*"submit"\s*,\s*(\w+)\s*\)/)?.[1];
  assert.ok(submitHandler, "the guard no longer listens for submit at all");
  const body = guardCode.match(new RegExp(`const ${submitHandler}\\s*=[\\s\\S]*?;\\n`))?.[0] ?? "";
  assert.match(body, /type:\s*"submit"/, "the submit listener must record a submit, not a save");
  assert.doesNotMatch(body, /outcome:\s*"success"|"reset"/, "the submit listener must not clear dirty state");
});

test("the guard arms the warning while a save is still in flight", () => {
  assert.match(guardCode, /phase\s*===\s*"saving"/, "a save in flight must keep the warning armed");
});

// --- ActionForm: a failed save must keep the form mounted ------------------
//
// A form bound straight to `<form action={serverAction}>` has no way to satisfy
// the guarantee above: a thrown validation or PostgREST error is consumed by
// the route error boundary, which unmounts the form (and the guard with it)
// before either can report anything. ActionForm is what keeps them alive.

const actionForm = fs.readFileSync(path.join(root, "components", "admin", "action-form.tsx"), "utf8");
const actionFormCode = actionForm.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

test("ActionForm catches action failures instead of letting them unmount the form", () => {
  assert.match(actionFormCode, /catch\s*\(\s*error\s*\)/, "a thrown action still escapes to the error boundary");
  assert.match(actionFormCode, /status:\s*"error"/, "a failure must be reported as an error status");
});

test("ActionForm rethrows redirects rather than reporting them as failures", () => {
  // redirect() throws NEXT_REDIRECT as control flow. Swallowing it would break
  // every save that redirects to ?saved=1 — and would report a success as an
  // error, which is the same class of bug as the one being fixed.
  assert.match(actionFormCode, /NEXT_REDIRECT/);
  assert.match(actionFormCode, /if\s*\(\s*isRedirectError\(error\)\s*\)\s*throw error;/);
});

test("ActionForm drives the guard with the real outcome, not a guess", () => {
  assert.match(actionFormCode, /<UnsavedChangesGuard\s+status=\{status\}\s*\/>/);
  // pending must win over the settled status, or an in-flight save would be
  // reported as already saved.
  assert.match(actionFormCode, /pending\s*\?\s*"saving"\s*:\s*state\.status/);
});

test("ActionForm surfaces a message the operator can act on", () => {
  assert.match(actionFormCode, /role="alert"/);
  assert.match(actionForm, /Your changes are still here/, "a redacted production error must still say the work survived");
});

test("every form that had a guard now keeps its dirty state on failure", () => {
  // The guard alone cannot survive a thrown action, so a bare
  // `<form action={someServerAction}><UnsavedChangesGuard/>` is the old broken
  // shape. Scan rather than list files so a new editor cannot reintroduce it.
  const offenders = [];
  for (const file of [...sourceFiles(path.join(root, "app")), ...sourceFiles(path.join(root, "components"))]) {
    const source = fs.readFileSync(file, "utf8");
    if (!source.includes("<UnsavedChangesGuard")) continue;
    if (path.basename(file) === "action-form.tsx") continue;
    offenders.push(path.relative(root, file).replace(/\\/g, "/"));
  }
  assert.deepEqual(offenders, [], `these still mount the guard inside a plain form instead of using ActionForm: ${offenders.join(", ")}`);
});

test("the guard derives dirtiness from the shared reducer", () => {
  // If this drifts back into a local boolean the tests above stop covering the
  // component at all.
  for (const symbol of ["reduceGuardState", "isGuardDirty", "serializeFormEntries"]) {
    assert.ok(guardCode.includes(symbol), `the guard no longer uses ${symbol}`);
  }
  assert.doesNotMatch(guardCode, /useState\s*\(\s*false\s*\)/, "dirty state is a sticky boolean again");
});
