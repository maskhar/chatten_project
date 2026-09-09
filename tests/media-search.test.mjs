import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const src=fs.readFileSync(new URL("../lib/media/search.ts",import.meta.url),"utf8");
const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {filterMediaBySearch}=await import(`data:text/javascript,${encodeURIComponent(js)}`);
const rows=[{title:"Golden Hour Rooftop",alt_text:"Batu panorama",caption:"Sunset",original_filename:"roof.jpg"},{title:"Coffee",alt_text:"Latte",caption:"Morning",original_filename:"beans.png"}];
test("Media search matches text fields",()=>{assert.equal(filterMediaBySearch(rows,"golden").length,1);assert.equal(filterMediaBySearch(rows,"GOLDEN").length,1);assert.equal(filterMediaBySearch(rows,"panorama").length,1);assert.equal(filterMediaBySearch(rows,"sunset").length,1);assert.equal(filterMediaBySearch(rows,"beans.png").length,1);assert.equal(filterMediaBySearch(rows,"espresso").length,0);assert.equal(filterMediaBySearch(rows,"  golden ").length,1);assert.equal(filterMediaBySearch(rows,"").length,2);});
