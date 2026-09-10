import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const src=fs.readFileSync(new URL("../lib/media/search.ts",import.meta.url),"utf8");
const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {filterMediaBySearch}=await import(`data:text/javascript,${encodeURIComponent(js)}`);
const rows=[{title:"Sunset Rooftop",rights_status:"approved",usage_count:2},{title:"Sunset Garden",rights_status:"approved",usage_count:0},{title:"Coffee",rights_status:"unknown",usage_count:1}];
test("usage filter combines",()=>{assert.equal(filterMediaBySearch(rows,"","","used").length,2);assert.equal(filterMediaBySearch(rows,"","","unused").length,1);assert.equal(filterMediaBySearch(rows,"","","banana").length,3);assert.equal(filterMediaBySearch(rows,"sunset","approved","used")[0].title,"Sunset Rooftop");});
