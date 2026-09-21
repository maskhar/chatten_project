import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const source=fs.readFileSync(new URL("../lib/gallery/validation.ts",import.meta.url),"utf8");
const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {normalizeGalleryOrder,validGalleryMedia,publicGalleryVisible}=await import(`data:text/javascript,${encodeURIComponent(output)}`);
// validGalleryMedia used to take a second argument, the media row's
// rights_status, and reject anything that was not "approved". 20260921000500
// removed that gate: the only thing left to check is that the form posted a
// real media id rather than an empty string or a stray value.
test("Gallery validation",()=>{assert.deepEqual(normalizeGalleryOrder(["a","b","a",""]),["a","b"]);assert.equal(validGalleryMedia("00000000-0000-0000-0000-000000000000"),true);assert.equal(validGalleryMedia("bad"),false);assert.equal(validGalleryMedia(""),false);assert.equal(publicGalleryVisible(true,"published","x"),true);assert.equal(publicGalleryVisible(false,"published","x"),false);});
