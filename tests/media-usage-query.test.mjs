import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const usageSrc = fs.readFileSync(new URL("../lib/media/usage.ts", import.meta.url), "utf8");
const querySrc = fs.readFileSync(new URL("../lib/media/usage-query.ts", import.meta.url), "utf8");
const usageJs = ts.transpileModule(usageSrc, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const queryJs = ts.transpileModule(querySrc, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace('import { buildMediaUsageMap } from "./usage";\n', "");
const { loadMediaUsageMapWithClient, mediaUsageQueryDefinitions } = await import("data:text/javascript," + encodeURIComponent(usageJs + queryJs));

function mockClient(rows, failures = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        select(columns) {
          calls.push({ table, columns });
          return Promise.resolve({ data: rows[table] ?? [], error: failures[table] ?? null });
        },
      };
    },
  };
}

test("batched query rows feed Event, Promotion, and SEO references into core", async () => {
  const client = mockClient({
    events: [{ image_media_id: "event-media", title: "Acoustic Night" }],
    promotions: [{ image_media_id: "promotion-media", title: "Weekend Offer" }],
    seo_settings: [{ og_media_id: "seo-media", page_key: "events" }],
  });
  const usage = await loadMediaUsageMapWithClient(client);

  assert.deepEqual(usage.get("event-media"), [{ mediaId: "event-media", resource: "event", label: "Event", title: "Acoustic Night" }]);
  assert.deepEqual(usage.get("promotion-media"), [{ mediaId: "promotion-media", resource: "promotion", label: "Promotion", title: "Weekend Offer" }]);
  assert.deepEqual(usage.get("seo-media"), [{ mediaId: "seo-media", resource: "seo", label: "SEO", title: "events" }]);
  assert.equal(client.calls.length, 10);
  assert.deepEqual(client.calls.find((call) => call.table === "seo_settings"), { table: "seo_settings", columns: "og_media_id,page_key,title" });
  assert.equal(mediaUsageQueryDefinitions.some((definition) => definition.table === "seo_settings" && definition.columns.includes("image_media_id")), false);
});

test("resource query errors reject instead of marking Media unused", async () => {
  const client = mockClient({}, { events: { message: "events unavailable" } });
  await assert.rejects(loadMediaUsageMapWithClient(client), /Unable to load Media usage for events: events unavailable/);
});