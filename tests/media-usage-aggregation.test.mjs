import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const src = fs.readFileSync(new URL("../lib/media/usage.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { buildMediaUsageMap, isMediaUsed, mediaUsageCount } = await import(`data:text/javascript,${encodeURIComponent(js)}`);

const sharedMediaId = "11111111-1111-1111-1111-111111111111";

test("aggregates structured Media usage across resources", () => {
  const usage = buildMediaUsageMap({
    hero: [{ image_media_id: sharedMediaId, title: "Panoramic Morning" }],
    moments: [{ image_media_id: "moment-media", name: "Golden Hour" }],
    about: [{ image_media_id: "about-media", title: "  Chatten story  " }],
    experiences: [{ image_media_id: "experience-media", name: "Coffee workshop" }],
    spaces: [{ image_media_id: "space-media", name: "Rooftop" }],
    gallery: [{ image_media_id: sharedMediaId, title: "" }, { image_media_id: "gallery-media", caption: "  Garden view  " }],
    events: [{ image_media_id: sharedMediaId, title: "Acoustic Night" }],
    promotions: [{ image_media_id: sharedMediaId, title: "Weekend Offer" }],
    menu: [{ image_media_id: "menu-media", name: "Cappuccino" }],
    seo: [{ og_media_id: sharedMediaId, page_key: "home" }],
  });

  assert.deepEqual(usage.get(sharedMediaId), [
    { mediaId: sharedMediaId, resource: "hero", label: "Hero", title: "Panoramic Morning" },
    { mediaId: sharedMediaId, resource: "gallery", label: "Gallery", title: "Gallery item" },
    { mediaId: sharedMediaId, resource: "event", label: "Event", title: "Acoustic Night" },
    { mediaId: sharedMediaId, resource: "promotion", label: "Promotion", title: "Weekend Offer" },
    { mediaId: sharedMediaId, resource: "seo", label: "SEO", title: "home" },
  ]);
  assert.equal(mediaUsageCount(usage, sharedMediaId), 5);
  assert.equal(isMediaUsed(usage, sharedMediaId), true);
  assert.deepEqual(usage.get("menu-media"), [{ mediaId: "menu-media", resource: "menu", label: "Menu", title: "Cappuccino" }]);
  assert.deepEqual(usage.get("gallery-media"), [{ mediaId: "gallery-media", resource: "gallery", label: "Gallery", title: "Garden view" }]);
});

test("retains each same-resource usage and ignores null media fields", () => {
  const usage = buildMediaUsageMap({
    hero: [{ image_media_id: null, title: "Ignored" }, { image_media_id: "   ", title: "Ignored" }],
    gallery: [
      { image_media_id: sharedMediaId, title: "Morning" },
      { image_media_id: sharedMediaId, title: "Night" },
    ],
    seo: [{ og_media_id: null, page_key: "ignored" }, { og_media_id: "   ", page_key: "ignored" }],
  });

  assert.equal(mediaUsageCount(usage, sharedMediaId), 2);
  assert.deepEqual(usage.get(sharedMediaId)?.map((reference) => reference.title), ["Morning", "Night"]);
  assert.equal(usage.has(""), false);
  assert.equal(isMediaUsed(usage, "unused-media"), false);
  assert.equal(mediaUsageCount(usage, "unused-media"), 0);
});

test("SEO references use og_media_id only", () => {
  const usage = buildMediaUsageMap({ seo: [{ og_media_id: "seo-media", page_key: "events" }] });

  assert.deepEqual(usage.get("seo-media"), [{ mediaId: "seo-media", resource: "seo", label: "SEO", title: "events" }]);
});
