"use client";
import { useState } from "react";
import { reorderResource } from "@/lib/admin/actions";

export function SortableList({ resource, items }: { resource: string; items: { id: string; label: string }[] }) {
  const [order, setOrder] = useState(items);
  const [dragging, setDragging] = useState<string | null>(null);
  function move(from: number, to: number) { if (to < 0 || to >= order.length) return; const next = [...order]; const [item] = next.splice(from, 1); next.splice(to, 0, item); setOrder(next); }
  return <div className="grid gap-2"><form action={reorderResource}><input type="hidden" name="resource" value={resource}/><input type="hidden" name="ids" value={order.map(item => item.id).join(",")}/><button className="w-full border border-[#c9bfa8] bg-white px-3 py-2 text-left text-sm font-semibold hover:bg-[#f5f0e6]" type="submit">Save display order</button></form>{order.map((item,index)=><div key={item.id} draggable onDragStart={() => setDragging(item.id)} onDragOver={event => event.preventDefault()} onDrop={() => { if (dragging) move(order.findIndex(row => row.id === dragging), index); setDragging(null); }} className="flex items-center gap-2 border border-[#d9c9aa] bg-white p-3"><span className="cursor-grab text-lg" aria-label="Drag to reorder">⋮⋮</span><span className="min-w-0 flex-1 truncate text-sm">{item.label}</span><button type="button" className="border px-2 py-1 text-xs" onClick={() => move(index,index-1)} aria-label={`Move ${item.label} up`}>↑</button><button type="button" className="border px-2 py-1 text-xs" onClick={() => move(index,index+1)} aria-label={`Move ${item.label} down`}>↓</button></div>)}</div>;
}
