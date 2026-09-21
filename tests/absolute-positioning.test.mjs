import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// A70. The menu category edit form was `absolute z-20 mt-2 w-72`, but nothing
// up its tree was positioned: components/admin/sortable-list.tsx applies
// `relative` only while a row is being dragged, the actions wrapper is
// unpositioned, and so is everything up through the admin layout. So the
// popover resolved against the initial containing block and rendered detached
// from the button that opened it — at every viewport width, worst on a phone
// where it also escaped the visible row.
//
// This is a whole class of bug rather than one instance: `absolute` is only
// meaningful relative to a positioned ancestor, and in a codebase where most
// containers are plain flex/grid rows, forgetting the `relative` is the
// default outcome. The test pairs them structurally.

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
const rel = (file) => path.relative(root, file).replace(/\\/g, "/");

test("the menu category popover has a permanently positioned ancestor", () => {
  const file = path.join(root, "components", "admin", "menu-manager-client.tsx");
  const src = fs.readFileSync(file, "utf8");

  const popover = src.indexOf("absolute z-20");
  assert.notEqual(popover, -1, "the category popover is gone; this test no longer guards anything");

  // Walk backwards to the nearest enclosing <details> — the popover lives
  // inside one, with the <summary> as its trigger.
  const openTag = src.lastIndexOf("<details", popover);
  assert.notEqual(openTag, -1, "the popover is no longer inside a <details>; re-check what its containing block is");

  const tag = src.slice(openTag, src.indexOf(">", openTag) + 1);
  assert.match(
    tag,
    /className=(?:"[^"]*\brelative\b[^"]*"|\{`[^`]*\brelative\b[^`]*`\})/,
    `the <details> wrapping the category popover is not \`relative\`, so the popover resolves against the initial containing block and renders detached from its trigger. Found: ${tag}`,
  );
});

test("the sortable row's relative stays conditional on dragging", () => {
  // The tempting fix for A70 is to make the sortable row permanently
  // `relative`. That would work, and it would also change the drag stacking:
  // the row uses `relative z-10 shadow-lg` while dragging specifically so the
  // dragged row paints above its neighbours. A permanent `relative` on every
  // row makes that z-10 compete with static siblings instead of standing out.
  const src = fs.readFileSync(path.join(root, "components", "admin", "sortable-list.tsx"), "utf8");
  assert.match(
    src,
    /isDragging \? "relative z-10/,
    "the dragging row no longer raises itself; drag feedback will be painted under its neighbours",
  );
});

// A third, broader test was written and then deleted: "no file uses `absolute`
// without containing a `relative`/`fixed`/`sticky` of its own". It flagged
// components/public/header.tsx and components/public/skip-to-content.tsx, and
// both are correct — the header IS the absolutely positioned element (it floats
// over the hero on purpose), and the skip link's `focus:absolute` is meant to
// pin to the viewport. A static scan cannot tell "positions itself against an
// ancestor a caller provides" from "forgot the ancestor", and a test that needs
// a growing allowlist is one people add to instead of fix.
//
// So the guard above is deliberately specific to the popover that actually
// broke. If another detached popover appears, it gets its own assertion here.
