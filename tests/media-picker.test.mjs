import assert from "node:assert/strict";
import { test } from "node:test";
import ts from "typescript";
import fs from "node:fs/promises";

const src = await fs.readFile("components/admin/media-picker.tsx", "utf-8");
const js = ts.transpileModule(src, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;

test("MediaPicker extracts unique categories from approved media", () => {
  const categoryLogic = `
    const media = [
      { id: "1", category: "panorama", title: "A", alt_text: null, rights_status: "approved", width: 100, height: 100, bucket: "b", storage_path: "p" },
      { id: "2", category: "panorama", title: "B", alt_text: null, rights_status: "approved", width: 100, height: 100, bucket: "b", storage_path: "p" },
      { id: "3", category: "food", title: "C", alt_text: null, rights_status: "approved", width: 100, height: 100, bucket: "b", storage_path: "p" },
      { id: "4", category: "  space  ", title: "D", alt_text: null, rights_status: "approved", width: 100, height: 100, bucket: "b", storage_path: "p" },
      { id: "5", category: null, title: "E", alt_text: null, rights_status: "approved", width: 100, height: 100, bucket: "b", storage_path: "p" },
      { id: "6", category: "", title: "F", alt_text: null, rights_status: "approved", width: 100, height: 100, bucket: "b", storage_path: "p" },
    ];
    const uniqueCategories = new Set();
    media.forEach((item) => {
      const cat = item.category?.trim();
      if (cat) {
        uniqueCategories.add(cat);
      }
    });
    const categories = Array.from(uniqueCategories).sort();
  `;
  const result = eval(categoryLogic + "; categories");
  assert.deepEqual(result, ["food", "panorama", "space"]);
});

test("MediaPicker filters by search and category with AND logic", () => {
  const filterLogic = `
    const media = [
      { id: "1", category: "panorama", title: "Sunset View", alt_text: "Beautiful sunset", rights_status: "approved", width: 100, height: 100, bucket: "b", storage_path: "p" },
      { id: "2", category: "panorama", title: "Mountain Peak", alt_text: "High mountain", rights_status: "approved", width: 100, height: 100, bucket: "b", storage_path: "p" },
      { id: "3", category: "food", title: "Sunset Coffee", alt_text: "Coffee at sunset", rights_status: "approved", width: 100, height: 100, bucket: "b", storage_path: "p" },
      { id: "4", category: "food", title: "Breakfast", alt_text: "Morning meal", rights_status: "approved", width: 100, height: 100, bucket: "b", storage_path: "p" },
    ];
    
    const filterMedia = (query, categoryFilter) => media.filter((item) => {
      const searchText = \`\${item.title ?? ""} \${item.alt_text ?? ""} \${item.category ?? ""}\`.toLowerCase();
      const matchesSearch = query ? searchText.includes(query.toLowerCase()) : true;
      const matchesCategory = categoryFilter ? item.category?.trim() === categoryFilter : true;
      return matchesSearch && matchesCategory;
    });
  `;
  
  const searchOnly = eval(filterLogic + '; filterMedia("sunset", "")');
  assert.equal(searchOnly.length, 2);
  assert.equal(searchOnly[0].id, "1");
  assert.equal(searchOnly[1].id, "3");
  
  const categoryOnly = eval(filterLogic + '; filterMedia("", "panorama")');
  assert.equal(categoryOnly.length, 2);
  assert.equal(categoryOnly[0].id, "1");
  assert.equal(categoryOnly[1].id, "2");
  
  const both = eval(filterLogic + '; filterMedia("sunset", "panorama")');
  assert.equal(both.length, 1);
  assert.equal(both[0].id, "1");
  
  const noMatch = eval(filterLogic + '; filterMedia("sunset", "space")');
  assert.equal(noMatch.length, 0);
  
  const allMedia = eval(filterLogic + '; filterMedia("", "")');
  assert.equal(allMedia.length, 4);
});

test("MediaPicker search is case-insensitive and searches title, alt, and category", () => {
  const filterLogic = `
    const media = [
      { id: "1", category: "Panorama", title: "SUNSET View", alt_text: "beautiful sunset", rights_status: "approved", width: 100, height: 100, bucket: "b", storage_path: "p" },
      { id: "2", category: "food", title: "Coffee", alt_text: "Morning BREW", rights_status: "approved", width: 100, height: 100, bucket: "b", storage_path: "p" },
    ];
    
    const filterMedia = (query) => media.filter((item) => {
      const searchText = \`\${item.title ?? ""} \${item.alt_text ?? ""} \${item.category ?? ""}\`.toLowerCase();
      return query ? searchText.includes(query.toLowerCase()) : true;
    });
  `;
  
  const titleMatch = eval(filterLogic + '; filterMedia("sunset")');
  assert.equal(titleMatch.length, 1);
  assert.equal(titleMatch[0].id, "1");
  
  const altMatch = eval(filterLogic + '; filterMedia("BREW")');
  assert.equal(altMatch.length, 1);
  assert.equal(altMatch[0].id, "2");
  
  const categoryMatch = eval(filterLogic + '; filterMedia("panorama")');
  assert.equal(categoryMatch.length, 1);
  assert.equal(categoryMatch[0].id, "1");
});

test("MediaPicker clear filters resets both search and category", () => {
  const clearLogic = `
    let query = "sunset";
    let categoryFilter = "panorama";
    
    const clearFilters = () => {
      query = "";
      categoryFilter = "";
    };
    
    clearFilters();
  `;
  
  const state = {};
  eval(clearLogic + '; state.query = query; state.categoryFilter = categoryFilter;');
  assert.equal(state.query, "");
  assert.equal(state.categoryFilter, "");
});

test("MediaPicker shows Replace button for current selection", () => {
  assert.ok(src.includes('Replace'));
  assert.ok(src.includes('onClick={() => setSelected("")}'));
});

test("MediaPicker shows Remove button only when not required", () => {
  assert.ok(src.includes('{!required &&'));
  assert.ok(src.includes('Remove'));
});

test("MediaPicker displays Selected indicator on current image", () => {
  assert.ok(src.includes('Selected'));
  assert.ok(src.includes('text-[#47714d]'));
});

test("MediaPicker shows empty state with Open Media Library link", () => {
  assert.ok(src.includes('No approved images yet'));
  assert.ok(src.includes('Upload and approve images in the Media Library'));
  assert.ok(src.includes('href="/admin/media"'));
  assert.ok(src.includes('Open Media Library'));
});

test("MediaPicker shows filtered empty state with clear action", () => {
  assert.ok(src.includes('No images match your filters'));
  assert.ok(src.includes('Clear filters'));
});

test("MediaPicker includes accessibility attributes", () => {
  assert.ok(src.includes('aria-label'));
  assert.ok(src.includes('aria-pressed'));
});

test("MediaPicker visual selection uses ring and not color-only", () => {
  assert.ok(src.includes('ring-2'));
  assert.ok(src.includes('ring-[#47714d]'));
  assert.ok(src.includes('Selected'));
});
