import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync("lib/env/chatwoot.ts", "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { checkChatwoot, chatwootSocketOrigin, CHATWOOT_BASE_URL, CHATWOOT_TOKEN } = await import(`data:text/javascript,${encodeURIComponent(js)}`);

test("neither value set disables the widget without complaint", () => {
  // Live chat is optional; an operator who never wired it up should not have
  // to read a warning on every build.
  assert.deepEqual(checkChatwoot(undefined, undefined), { ok: true, config: null });
  assert.deepEqual(checkChatwoot("  ", ""), { ok: true, config: null });
});

test("exactly one value set is an error naming the missing half", () => {
  // The failure mode this guards: the widget never renders and nothing says why.
  const noToken = checkChatwoot("https://chatwoot.example", undefined);
  assert.equal(noToken.ok, false);
  assert.match(noToken.message, new RegExp(CHATWOOT_TOKEN));

  const noBaseUrl = checkChatwoot(undefined, "abc123");
  assert.equal(noBaseUrl.ok, false);
  assert.match(noBaseUrl.message, new RegExp(CHATWOOT_BASE_URL));
});

test("a malformed base URL is rejected", () => {
  assert.equal(checkChatwoot("chatwoot.example", "abc123").ok, false);
});

test("a non-http scheme is rejected", () => {
  assert.equal(checkChatwoot("ftp://chatwoot.example", "abc123").ok, false);
});

test("a base URL is normalised to its origin", () => {
  // The SDK appends its own paths ("/packs/js/sdk.js", "/widget"), so a path
  // left here would produce a 404 visible only in the browser console.
  for (const raw of ["https://chatwoot.example/", "https://chatwoot.example/app", "https://chatwoot.example?a=1"]) {
    assert.deepEqual(checkChatwoot(raw, "abc123"), { ok: true, config: { baseUrl: "https://chatwoot.example", websiteToken: "abc123" } });
  }
});

test("surrounding whitespace is trimmed from both values", () => {
  assert.deepEqual(checkChatwoot(" https://chatwoot.example ", " abc123 ").config, { baseUrl: "https://chatwoot.example", websiteToken: "abc123" });
});

test("the websocket origin keeps the scheme's security", () => {
  // The widget's ActionCable connection at /cable is a distinct CSP origin
  // from the https one, so connect-src has to list it separately.
  assert.equal(chatwootSocketOrigin("https://chatwoot.example"), "wss://chatwoot.example");
  assert.equal(chatwootSocketOrigin("http://localhost:3000"), "ws://localhost:3000");
});

test("next.config.ts fails the build on a half-configured widget", () => {
  const config = fs.readFileSync("next.config.ts", "utf8");
  assert.match(config, /assertChatwoot\(\)/);
});

test("the CSP admits the Chatwoot origin in every directive the widget uses", () => {
  // A default-deny policy blocks a third-party widget in several places at
  // once; missing any one of these is a silently broken chat bubble.
  const config = fs.readFileSync("next.config.ts", "utf8");
  for (const directive of ["script-src", "style-src", "img-src"]) {
    assert.match(config, new RegExp(`${directive}[^\`]*\\$\\{chatwootSources\\}`), `${directive} must include the Chatwoot origin`);
  }
  assert.match(config, /connect-src[^`]*\$\{chatwootConnect\}/, "connect-src must include the Chatwoot origin and its websocket");
  assert.match(config, /frameSrc\.push\(chatwoot\.baseUrl\)/, "frame-src must include the Chatwoot origin for the widget iframe");
});

test("the widget component is rendered from the root layout", () => {
  const layout = fs.readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /<ChatwootWidget \/>/);
});

test("the widget reads each env var as a whole literal", () => {
  // Next substitutes NEXT_PUBLIC_* into browser code only where it can see the
  // full property access at build time. `process.env[NAME]` compiles to
  // undefined and the widget vanishes with no error.
  const component = fs
    .readFileSync("components/chatwoot-widget.tsx", "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
  assert.match(component, /process\.env\.NEXT_PUBLIC_CHATWOOT_BASE_URL/);
  assert.match(component, /process\.env\.NEXT_PUBLIC_CHATWOOT_TOKEN/);
  assert.doesNotMatch(component, /process\.env\[/);
});

test("the Docker build receives both values as build args", () => {
  // NEXT_PUBLIC_* is baked in at build time; the compose `env_file` only
  // reaches runtime and cannot patch an already-built bundle.
  const dockerfile = fs.readFileSync("Dockerfile", "utf8");
  const compose = fs.readFileSync("docker-compose.yml", "utf8");
  for (const name of ["NEXT_PUBLIC_CHATWOOT_BASE_URL", "NEXT_PUBLIC_CHATWOOT_TOKEN"]) {
    assert.match(dockerfile, new RegExp(`ARG ${name}`));
    assert.match(dockerfile, new RegExp(`${name}=\\$${name}`));
    assert.match(compose, new RegExp(`${name}: \\$\\{${name}`));
  }
});

test("the service role key is never passed to the browser build", () => {
  // Re-asserted here because this change adds build args: the Dockerfile's
  // build stage must stay free of server-only secrets. Comments are stripped
  // first — the Dockerfile names the key in prose precisely to explain why it
  // is absent, and matching that would make this test assert the opposite of
  // what it means to.
  const directives = fs
    .readFileSync("Dockerfile", "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
  assert.doesNotMatch(directives, /SUPABASE_SERVICE_ROLE_KEY/);
});
