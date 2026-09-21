import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const src=fs.readFileSync(new URL("../lib/media/search.ts",import.meta.url),"utf8");
const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {filterMediaBySearch,mediaCategories}=await import(`data:text/javascript,${encodeURIComponent(js)}`);
const rows=[{title:"Sunset Rooftop",usage_count:2,category:"panorama"},{title:"Sunset Garden",usage_count:0,category:"panorama"},{title:"Coffee",usage_count:1,category:"food"}];
test("category filter combines and options normalize",()=>{assert.equal(filterMediaBySearch(rows,"","","panorama").length,2);assert.equal(filterMediaBySearch(rows,"sunset","used","panorama")[0].title,"Sunset Rooftop");assert.equal(filterMediaBySearch(rows,"","","night").length,0);assert.deepEqual(mediaCategories([...rows,{category:" panorama "},{category:null},{category:""}]),["food","panorama"]);});
