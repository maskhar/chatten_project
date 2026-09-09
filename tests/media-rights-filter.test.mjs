import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const src=fs.readFileSync(new URL("../lib/media/search.ts",import.meta.url),"utf8");
const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {filterMediaBySearch}=await import(`data:text/javascript,${encodeURIComponent(js)}`);
const rows=[{title:"Sunset Rooftop",rights_status:"approved"},{title:"Sunset Garden",rights_status:"unknown"},{title:"Coffee",rights_status:"restricted"}];
test("rights filter maps and combines",()=>{assert.equal(filterMediaBySearch(rows,"","approved").length,1);assert.equal(filterMediaBySearch(rows,"","unknown").length,1);assert.equal(filterMediaBySearch(rows,"","restricted").length,1);assert.equal(filterMediaBySearch(rows,"","banana").length,3);assert.equal(filterMediaBySearch(rows,"sunset","approved")[0].title,"Sunset Rooftop");});
