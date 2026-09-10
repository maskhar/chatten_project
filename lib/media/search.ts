export type SearchableMedia = { title?: string | null; alt_text?: string | null; caption?: string | null; original_filename?: string | null; rights_status?: string | null; usage_count?: number; category?: string | null };
export function filterMediaBySearch<T extends SearchableMedia>(items:T[],query:string,rights="",usage="",category="") {
 const needle=query.trim().toLowerCase(); const safeRights=["approved","unknown","restricted"].includes(rights)?rights:""; const safeUsage=["used","unused"].includes(usage)?usage:""; const safeCategory=category.trim();
 return items.filter(item=>{const text=!needle||[item.title,item.alt_text,item.caption,item.original_filename].some(value=>String(value??"").toLowerCase().includes(needle));const right=!safeRights||item.rights_status===safeRights;const count=item.usage_count??0;const use=!safeUsage||(safeUsage==="used"?count>0:count===0);const cat=!safeCategory||String(item.category??"").trim()===safeCategory;return text&&right&&use&&cat;});
}
export function mediaCategories(items:SearchableMedia[]){return [...new Set(items.map(item=>String(item.category??"").trim()).filter(Boolean))].sort();}
