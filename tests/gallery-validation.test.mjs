import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const source=fs.readFileSync(new URL("../lib/gallery/validation.ts",import.meta.url),"utf8");
const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {normalizeGalleryOrder,validGalleryMedia,publicGalleryVisible}=await import(`data:text/javascript,${encodeURIComponent(output)}`);
test("Gallery validation",()=>{assert.deepEqual(normalizeGalleryOrder(["a","b","a",""]),["a","b"]);assert.equal(validGalleryMedia("00000000-0000-0000-0000-000000000000","approved"),true);assert.equal(validGalleryMedia("bad","approved"),false);assert.equal(validGalleryMedia("00000000-0000-0000-0000-000000000000","restricted"),false);assert.equal(publicGalleryVisible(true,"published","x"),true);assert.equal(publicGalleryVisible(false,"published","x"),false);});
