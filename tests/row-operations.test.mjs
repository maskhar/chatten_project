import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

// A91. Row mutations need one shared, testable state machine. A React state
// update is scheduled, so use-row-operation.ts additionally carries a
// synchronous ref guard; these tests own the reducer's attribution rules while
// the source-contract test below owns that same-tick guard and manager locks.

async function importTypeScript(file) {
  const source = fs.readFileSync(file, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript,${encodeURIComponent(js)}`);
}

const {
  initialRowOperations,
  isRowBusy,
  isRowPending,
  reduceRowOperations,
  rowFeedback,
} = await importTypeScript("lib/admin/row-operations.ts");

const feedback = await importTypeScript("lib/admin/action-feedback.ts");

test("row operations start idle without feedback", () => {
  const state = initialRowOperations();
  assert.deepEqual(state, {
    pendingId: null,
    feedbackId: null,
    status: "idle",
    message: null,
  });
  assert.equal(isRowBusy(state), false);
  assert.equal(isRowPending(state, "space-1"), false);
  assert.equal(rowFeedback(state, "space-1"), null);
});

test("one row operation starts with no stale feedback", () => {
  const previous = {
    pendingId: null,
    feedbackId: "old",
    status: "error",
    message: "Kesalahan lama",
  };
  const state = reduceRowOperations(previous, { type: "start", id: "space-1" });
  assert.deepEqual(state, {
    pendingId: "space-1",
    feedbackId: null,
    status: "idle",
    message: null,
  });
  assert.equal(isRowBusy(state), true);
  assert.equal(isRowPending(state, "space-1"), true);
  assert.equal(isRowPending(state, "space-2"), false);
});

test("a second start cannot replace the pending row", () => {
  const running = reduceRowOperations(initialRowOperations(), {
    type: "start",
    id: "space-1",
  });
  assert.equal(
    reduceRowOperations(running, { type: "start", id: "space-2" }),
    running,
  );
});

test("a stale completion cannot label another row", () => {
  const running = reduceRowOperations(initialRowOperations(), {
    type: "start",
    id: "space-1",
  });
  assert.equal(
    reduceRowOperations(running, {
      type: "fail",
      id: "space-2",
      message: "Gagal",
    }),
    running,
  );
});

test("success and failure are attributed only to their row", () => {
  const running = reduceRowOperations(initialRowOperations(), {
    type: "start",
    id: "space-1",
  });
  const failed = reduceRowOperations(running, {
    type: "fail",
    id: "space-1",
    message: "Ruang gagal dihapus.",
  });
  assert.equal(isRowBusy(failed), false);
  assert.deepEqual(rowFeedback(failed, "space-1"), {
    status: "error",
    message: "Ruang gagal dihapus.",
  });
  assert.equal(rowFeedback(failed, "space-2"), null);

  const retried = reduceRowOperations(failed, { type: "start", id: "space-1" });
  const succeeded = reduceRowOperations(retried, {
    type: "succeed",
    id: "space-1",
    message: "Ruang dihapus.",
  });
  assert.deepEqual(rowFeedback(succeeded, "space-1"), {
    status: "success",
    message: "Ruang dihapus.",
  });
});

test("dismissing feedback does not cancel a request", () => {
  const running = reduceRowOperations(initialRowOperations(), {
    type: "start",
    id: "space-1",
  });
  const dismissed = reduceRowOperations(running, { type: "dismiss" });
  assert.equal(dismissed.pendingId, "space-1");
  assert.equal(dismissed.feedbackId, null);
  assert.equal(isRowBusy(dismissed), true);
  // Dismiss hides a message; the request it belonged to still reports back.
  const completed = reduceRowOperations(dismissed, {
    type: "succeed",
    id: "space-1",
    message: "Selesai.",
  });
  assert.deepEqual(rowFeedback(completed, "space-1"), {
    status: "success",
    message: "Selesai.",
  });
});

test("a completion arriving after the state settled is discarded", () => {
  const running = reduceRowOperations(initialRowOperations(), {
    type: "start",
    id: "space-1",
  });
  const settled = reduceRowOperations(running, {
    type: "succeed",
    id: "space-1",
    message: "Ruang dihapus.",
  });
  // Nothing is pending, so a late duplicate resolution must not relabel the row
  // or clear the outcome the operator is reading.
  assert.equal(
    reduceRowOperations(settled, { type: "succeed", id: "space-1", message: "Lagi." }),
    settled,
  );
  assert.equal(
    reduceRowOperations(settled, { type: "fail", id: "space-1", message: "Gagal." }),
    settled,
  );
});

test("action feedback preserves actionable errors but redacts framework boilerplate", () => {
  assert.equal(
    feedback.actionErrorMessage(new Error("Ruang tidak ditemukan."), "Gagal"),
    "Ruang tidak ditemukan.",
  );
  assert.equal(
    feedback.actionErrorMessage(
      new Error("An error occurred in the Server Components render. The specific message is omitted."),
      "Gagal aman.",
    ),
    "Gagal aman.",
  );
  assert.equal(feedback.actionErrorMessage("raw", "Gagal aman."), "Gagal aman.");
  assert.equal(feedback.actionErrorMessage(new Error("   "), "Gagal aman."), "Gagal aman.");
});

test("only NEXT_REDIRECT digests are redirect control flow", () => {
  assert.equal(feedback.isRedirectError({ digest: "NEXT_REDIRECT;replace;/admin" }), true);
  assert.equal(feedback.isRedirectError({ digest: "NEXT_NOT_FOUND" }), false);
  assert.equal(feedback.isRedirectError(new Error("NEXT_REDIRECT")), false);
  assert.equal(feedback.isRedirectError(null), false);
});

test("the hook closes same-tick duplicate activation before awaiting", () => {
  const hook = fs.readFileSync("components/admin/use-row-operation.ts", "utf8");
  assert.match(hook, /const running = useRef\(false\)/);
  assert.match(hook, /if \(running\.current\) return/);
  assert.match(hook, /running\.current = true;\s*dispatch\(\{ type: "start", id \}\)/);
  assert.match(hook, /finally \{\s*running\.current = false/);
});

test("dedicated sortable managers expose bidirectional locks and typed feedback", () => {
  const files = [
    "components/admin/spaces-manager-client.tsx",
    "components/admin/experiences-manager-client.tsx",
    "components/admin/gallery-manager-client.tsx",
    "components/admin/menu-manager-client.tsx",
    "components/admin/homepage-sortable.tsx",
  ];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /useRowOperation\(\)/, `${file} does not coordinate row actions`);
    assert.match(source, /rowBusy=\{rowOperation\.busy\}/, `${file} does not lock reordering during a row action`);
    assert.match(source, /reorderBusy \|\| rowOperation\.busy/, `${file} does not lock row controls during reorder`);
    assert.match(source, /<RowFeedback feedback=\{rowOperation\.feedback\(/, `${file} does not render attributed feedback`);
  }
});

test("locked row links are removed from keyboard order and suppress navigation", () => {
  const link = fs.readFileSync("components/admin/row-link.tsx", "utf8");
  assert.match(link, /aria-disabled=\{locked \|\| undefined\}/);
  assert.match(link, /tabIndex=\{locked \? -1 : props\.tabIndex\}/);
  assert.match(link, /if \(locked\) \{\s*event\.preventDefault\(\)/);
});

test("row success and error use distinct live-region semantics", () => {
  const component = fs.readFileSync("components/admin/row-feedback.tsx", "utf8");
  assert.match(component, /role="alert"/);
  assert.match(component, /text-rust/);
  assert.match(component, /role="status"/);
  assert.match(component, /text-leaf/);
});
