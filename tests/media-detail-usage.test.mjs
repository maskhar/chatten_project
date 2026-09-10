import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const src = fs.readFileSync(new URL("../lib/media/usage-presentation.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { buildMediaUsagePresentation } = await import("data:text/javascript," + encodeURIComponent(js));

test("Media Detail usage presentation formats singular and plural summaries", () => {
  assert.equal(buildMediaUsagePresentation([{ mediaId: "media-1", resource: "event", label: "Event", title: "Acoustic Night" }]).summary, "Used in 1 place");
  assert.equal(buildMediaUsagePresentation([
    { mediaId: "media-1", resource: "gallery", label: "Gallery", title: "Sunset" },
    { mediaId: "media-1", resource: "gallery", label: "Gallery", title: "Night View" },
    { mediaId: "media-1", resource: "event", label: "Event", title: "Acoustic Night" },
  ]).summary, "Used in 3 places");
});

test("Media Detail usage presentation exposes explicit unused state", () => {
  const presentation = buildMediaUsagePresentation([]);
  assert.equal(presentation.count, 0);
  assert.equal(presentation.summary, null);
  assert.equal(presentation.emptyMessage, "This image is not currently used anywhere.");
});

test("Media Detail usage presentation preserves structured labels, titles, and duplicates", () => {
  const references = [
    { mediaId: "media-1", resource: "event", label: "Event", title: "Acoustic Night" },
    { mediaId: "media-1", resource: "promotion", label: "Promotion", title: "Weekend Offer" },
    { mediaId: "media-1", resource: "menu", label: "Menu", title: "Cappuccino" },
    { mediaId: "media-1", resource: "gallery", label: "Gallery", title: "Gallery item" },
    { mediaId: "media-1", resource: "gallery", label: "Gallery", title: "Gallery item" },
  ];
  const presentation = buildMediaUsagePresentation(references);
  assert.equal(presentation.count, 5);
  assert.deepEqual(presentation.references, references);
});

test("Media Detail route renders structured Used In presentation", () => {
  const route = fs.readFileSync(new URL("../app/admin/(dashboard)/media/items/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(route, /loadMediaUsageMap\(\)/);
  assert.match(route, /usageMap\.get\(item\.id\)/);
  assert.match(route, />Used In</);
  assert.match(route, /usage\.emptyMessage/);
  assert.match(route, /reference\.label/);
  assert.match(route, /reference\.title/);
});
