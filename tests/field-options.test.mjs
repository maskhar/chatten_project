import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// Phase 6: the settings-class CMS forms asked editors to type values from
// closed sets with nothing on screen to say what the set was. These tests pin
// each list against the code that actually consumes it, so a route added,
// renamed or removed shows up here rather than as a header link to a 404 or
// an SEO row that saves and changes nothing.

const load = async (file) => {
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript,${encodeURIComponent(js)}`);
};

const { DAY_OPTIONS, NAVIGATION_ROUTE_OPTIONS, ROBOTS_OPTIONS, SEO_PAGE_KEY_OPTIONS, SOCIAL_PLATFORM_OPTIONS, labelFor, optionValues } =
  await load("lib/admin/field-options.ts");

const resourcesSource = fs.readFileSync("lib/admin/resources.ts", "utf8");

test("the day picker covers exactly the seven days, Sunday first", () => {
  // Sunday-first matches Postgres extract(dow) and the public hours list. The
  // field used to be a raw integer box: nothing said whether 0 was Sunday,
  // and 7 was accepted and then never matched a day.
  assert.equal(DAY_OPTIONS.length, 7);
  assert.deepEqual(optionValues(DAY_OPTIONS), ["0", "1", "2", "3", "4", "5", "6"]);
  // The labels are the operator-facing copy and are Indonesian; the values
  // stay the Postgres dow integers the public hours list matches on.
  assert.equal(labelFor(DAY_OPTIONS, 0), "Minggu");
  assert.equal(labelFor(DAY_OPTIONS, 6), "Sabtu");
  assert.equal(labelFor(DAY_OPTIONS, 7), null);
});

test("opening hours offers the day picker, not a number input", () => {
  const hours = resourcesSource.slice(resourcesSource.indexOf('key: "opening-hours"'));
  const field = hours.slice(hours.indexOf('key: "day_of_week"'), hours.indexOf('key: "opens_at"'));
  assert.match(field, /choices: DAY_OPTIONS/);
  assert.ok(!/type: "number"/.test(field), "day_of_week is still a raw number input");
});

test("every navigation route resolves to a real public page", () => {
  // A typo here is a header link to a 404, and the fallback navigation only
  // appears when the table is empty, so one bad row cannot be undone by
  // emptying the list.
  // A106: sebuah route group seperti `(list)` tidak menambah segmen URL, jadi
  // `/spaces` kini dilayani `app/spaces/(list)/page.tsx`. Memetakan path URL ke
  // path direktori satu-ke-satu berhenti benar begitu itu terjadi — dan tes ini
  // gagal justru karena asumsinya, bukan karena rutenya rusak. Yang diperiksa
  // sekarang: ada `page.tsx` tepat di segmen itu, ATAU di dalam satu route group
  // di bawahnya. Bukan pencarian rekursif: `app/spaces/[slug]/page.tsx` tidak
  // boleh dianggap menjawab `/spaces`.
  const hasPage = (dir) => {
    if (fs.existsSync(path.join(dir, "page.tsx"))) return true;
    if (!fs.existsSync(dir)) return false;
    return fs.readdirSync(dir, { withFileTypes: true }).some(
      (entry) => entry.isDirectory() && entry.name.startsWith("(") && fs.existsSync(path.join(dir, entry.name, "page.tsx")),
    );
  };
  for (const { value } of NAVIGATION_ROUTE_OPTIONS) {
    assert.ok(value.startsWith("/"), `${value} is not a site-relative path`);
    const dir = value === "/" ? "app/(public)" : `app${value}`;
    assert.ok(hasPage(dir), `${value} has no page at ${dir}/page.tsx nor in a route group inside it`);
  }
});

test("every public page in the sitemap can be linked from the navigation", () => {
  const sitemap = fs.readFileSync("app/sitemap.ts", "utf8");
  const paths = [...sitemap.matchAll(/"(\/[a-z-]*)"/g)].map((match) => match[1]);
  assert.ok(paths.length >= 8, "the sitemap path list could not be read");
  const offered = new Set(optionValues(NAVIGATION_ROUTE_OPTIONS));
  for (const route of paths) assert.ok(offered.has(route), `${route} is in the sitemap but cannot be added to the navigation`);
});

test("every SEO page key matches a page that actually calls seoMetadata", () => {
  // A row whose page_key matches nothing is inert: it saves, it lists, and no
  // page ever reads it.
  const keys = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== "admin" && entry.name !== "api") walk(full); continue; }
      if (entry.name !== "page.tsx") continue;
      for (const match of fs.readFileSync(full, "utf8").matchAll(/seoMetadata\("([a-z-]+)"/g)) keys.add(match[1]);
    }
  };
  walk("app");
  assert.ok(keys.size > 0, "no seoMetadata call sites were found");
  assert.deepEqual(optionValues(SEO_PAGE_KEY_OPTIONS).sort(), [...keys].sort());
});

test("the home page is deliberately not an SEO page key", () => {
  // Its metadata comes from site_settings, so an seo_settings row for it
  // would look editable and change nothing.
  const home = fs.readFileSync("app/(public)/page.tsx", "utf8");
  assert.ok(!home.includes("seoMetadata("), "the home page now uses seoMetadata; add it to SEO_PAGE_KEY_OPTIONS");
  assert.ok(!optionValues(SEO_PAGE_KEY_OPTIONS).includes("home"));
});

test("social platforms are lowercase keys, since the footer keys off them", () => {
  for (const { value, label } of SOCIAL_PLATFORM_OPTIONS) {
    assert.equal(value, value.toLowerCase(), `${value} must be lowercase`);
    assert.ok(label.length > 0);
  }
  assert.equal(new Set(optionValues(SOCIAL_PLATFORM_OPTIONS)).size, SOCIAL_PLATFORM_OPTIONS.length, "duplicate platform key");
});

test("robots offers a blank default rather than forcing a directive", () => {
  assert.equal(ROBOTS_OPTIONS[0].value, "", "the first robots option must be the empty default");
  // applySeoOverride falls back to the page default on a blank value.
  const seo = fs.readFileSync("lib/seo.ts", "utf8");
  assert.match(seo, /override\.robots\?\.trim\(\) \|\| base\.robots/);
});

test("no settings field is still a bare text box for a closed set", () => {
  for (const [key, field] of [["social", "platform"], ["navigation", "href"], ["seo", "page_key"], ["seo", "robots"]]) {
    const block = resourcesSource.slice(resourcesSource.indexOf(`key: "${key}"`));
    const declaration = block.slice(block.indexOf(`key: "${field}"`), block.indexOf(`key: "${field}"`) + 220);
    assert.match(declaration, /type: "select"/, `${key}.${field} is not a picker`);
    assert.match(declaration, /choices:/, `${key}.${field} has no option list`);
  }
});

test("the server action re-checks the closed sets the form rendered", () => {
  // A select constrains the browser, not the request. The action must not
  // trust the posted value.
  const actions = fs.readFileSync("lib/admin/actions.ts", "utf8");
  // Whitespace is a formatting choice, not part of the contract — the previous
  // literal broke the moment the file was reformatted.
  assert.match(actions, /assertAllowedChoices\(resource,\s*payload\)/);
  assert.match(actions, /allowedValues\(field\)/);
});

test("allowedValues reads both the labelled and the bare option form", async () => {
  const { allowedValues } = await load("lib/admin/resources.ts").catch(() => ({}));
  // resources.ts imports from "@/types/tables", which a data: URL cannot
  // resolve; check the source shape instead.
  if (!allowedValues) {
    assert.match(resourcesSource, /if \(field\.choices\) return field\.choices\.map/);
    assert.match(resourcesSource, /if \(field\.options\) return \[\.\.\.field\.options\]/);
    assert.match(resourcesSource, /return null;/);
  }
});

test("every settings resource still requires the admin role", () => {
  // These forms now carry pickers, which makes them easier to use; that must
  // not have widened who may use them.
  for (const key of ["contact", "social", "navigation", "seo", "site-settings"]) {
    const block = resourcesSource.slice(resourcesSource.indexOf(`key: "${key}"`), resourcesSource.indexOf(`key: "${key}"`) + 200);
    assert.match(block, /group: "settings"/, `${key} lost its settings grouping, so it would drop to the editor role`);
  }
  assert.match(resourcesSource, /resource\.group === "settings" \? "admin"/);
});
