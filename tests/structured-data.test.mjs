import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync("lib/public-data/structured-data.ts", "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { restaurantJsonLd, openingHoursSpecification } = await import(`data:text/javascript,${encodeURIComponent(js)}`);

const identity = { name: "Chatten Cafe", description: "A place to eat, talk, and experience Batu." };
const contact = { address: "Jl. Raya Batu 1", phone: "+62 812 0000 0000", email: "halo@chatten.example", whatsapp_url: "https://wa.me/6281200000000", directions_url: "https://maps.google.com/?q=chatten", map_embed_url: null };
const hours = [
  { day_of_week: 0, opens_at: "09:00:00", closes_at: "21:00:00", is_closed: false },
  { day_of_week: 1, opens_at: null, closes_at: null, is_closed: true },
  { day_of_week: 2, opens_at: "08:00:00", closes_at: "22:00:00", is_closed: false },
];
const socials = [{ platform: "instagram", label: "Instagram", url: "https://instagram.com/chatten" }];

test("the node is a Restaurant, not a bare WebSite", () => {
  const node = restaurantJsonLd({ identity, contact, hours, socials, appUrl: "https://chatten.example" });
  assert.equal(node["@context"], "https://schema.org");
  assert.equal(node["@type"], "Restaurant");
  assert.equal(node.name, "Chatten Cafe");
  assert.equal(node.url, "https://chatten.example");
});

test("contact columns map onto the schema.org properties", () => {
  const node = restaurantJsonLd({ identity, contact, hours, socials, appUrl: undefined });
  assert.deepEqual(node.address, { "@type": "PostalAddress", streetAddress: "Jl. Raya Batu 1" });
  assert.equal(node.telephone, "+62 812 0000 0000");
  assert.equal(node.email, "halo@chatten.example");
  assert.equal(node.hasMap, "https://maps.google.com/?q=chatten");
  assert.deepEqual(node.sameAs, ["https://instagram.com/chatten"]);
});

test("hours become a specification, with closed days omitted", () => {
  const spec = openingHoursSpecification(hours);
  assert.equal(spec.length, 2, "the closed Monday must not appear");
  assert.deepEqual(spec[0], { "@type": "OpeningHoursSpecification", dayOfWeek: "https://schema.org/Sunday", opens: "09:00", closes: "21:00" });
  assert.equal(spec[1].dayOfWeek, "https://schema.org/Tuesday");
});

test("a half-filled interval is dropped rather than half-emitted", () => {
  const spec = openingHoursSpecification([
    { day_of_week: 3, opens_at: "08:00:00", closes_at: null, is_closed: false },
    { day_of_week: 4, opens_at: null, closes_at: "22:00:00", is_closed: false },
  ]);
  assert.deepEqual(spec, []);
});

test("an out-of-range day index is ignored", () => {
  // day_of_week is `check (between 0 and 6)` in the schema, but this runs on
  // whatever the API returns; a bad index must not emit `schema.org/undefined`.
  assert.deepEqual(openingHoursSpecification([{ day_of_week: 9, opens_at: "08:00:00", closes_at: "22:00:00", is_closed: false }]), []);
});

test("blank CMS columns are omitted, never emitted empty", () => {
  const node = restaurantJsonLd({ identity: { name: "Chatten Cafe", description: null }, contact: null, hours: [], socials: [], appUrl: undefined });
  for (const key of ["address", "telephone", "email", "hasMap", "openingHoursSpecification", "sameAs", "url", "description"]) {
    assert.ok(!(key in node), `${key} should be absent, not empty`);
  }
  assert.equal(node.name, "Chatten Cafe");
});

test("hasMap reads the CMS-editable directions_url (A62)", () => {
  // map_url was superseded by 20260909000200_split_contact_urls.sql and has no
  // field in lib/admin/resources.ts, so nothing could ever populate it and
  // hasMap was dead. Dropped from the schema; this pins the replacement.
  assert.ok(!/contact\??\.?\??\.map_url/.test(source), "structured-data must not read the dropped map_url column");
  const node = restaurantJsonLd({ identity, contact: { ...contact, directions_url: "https://maps.app.goo.gl/chatten" }, hours: [], socials: [], appUrl: undefined });
  assert.equal(node.hasMap, "https://maps.app.goo.gl/chatten");
});

test("a malformed operator-entered social URL is dropped", () => {
  // sameAs must be absolute: a relative value would be resolved against our
  // own origin by a crawler and claim a page we do not control as a profile.
  const node = restaurantJsonLd({ identity, contact: null, hours: [], socials: [{ platform: "x", label: null, url: "/not-a-profile" }, { platform: "ig", label: null, url: "https://instagram.com/chatten" }], appUrl: undefined });
  assert.deepEqual(node.sameAs, ["https://instagram.com/chatten"]);
});

test("null inputs produce a valid node rather than throwing", () => {
  const node = restaurantJsonLd({ identity, contact: null, hours: null, socials: null, appUrl: undefined });
  assert.equal(node["@type"], "Restaurant");
  assert.doesNotThrow(() => JSON.stringify(node));
});

test("the public shell is what emits it", () => {
  const shell = fs.readFileSync("components/public/public-shell.tsx", "utf8");
  assert.match(shell, /restaurantJsonLd/);
  assert.match(shell, /application\/ld\+json/);
});
