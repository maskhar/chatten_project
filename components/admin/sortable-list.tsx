"use client";
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, type ReactNode } from "react";

type SortableItem = { id: string; label: string; detail?: ReactNode; actions?: ReactNode };
type Props = { items: SortableItem[]; onSave: (ids: string[]) => Promise<void>; empty?: string };
function Row({ item, index, count, move }: { item: SortableItem; index: number; count: number; move: (from: number, to: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex flex-wrap items-center gap-3 border border-[#d9c9aa] bg-white p-3 ${isDragging ? "relative z-10 shadow-lg" : ""}`}>
    <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none px-2 text-lg text-[#768075] active:cursor-grabbing" aria-label={`Drag ${item.label}`}>⋮⋮</button>
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.label}</p>{item.detail}</div>
    <div className="flex flex-wrap items-center gap-2"><button type="button" className="rounded border px-2 py-1 text-xs disabled:opacity-40" disabled={index===0} onClick={()=>move(index,index-1)} aria-label={`Move ${item.label} up`}>↑</button><button type="button" className="rounded border px-2 py-1 text-xs disabled:opacity-40" disabled={index===count-1} onClick={()=>move(index,index+1)} aria-label={`Move ${item.label} down`}>↓</button>{item.actions}</div>
  </div>;
}
export function SortableList({ items, onSave, empty = "No items yet." }: Props) {
  const [order, setOrder] = useState(items); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}),useSensor(TouchSensor,{activationConstraint:{delay:150,tolerance:5}}));
  const move=(from:number,to:number)=>{if(to<0||to>=order.length)return;const next=[...order];const [row]=next.splice(from,1);next.splice(to,0,row);setOrder(next);setMessage("");};
  const drop=(event:DragEndEvent)=>{if(!event.over||event.active.id===event.over.id)return;move(order.findIndex(row=>row.id===event.active.id),order.findIndex(row=>row.id===event.over?.id));};
  async function save(){const previous=order;setSaving(true);setMessage("");try{await onSave(order.map(row=>row.id));setMessage("Order saved");}catch{setOrder(items);setMessage("Unable to save order. Previous order restored.");}finally{setSaving(false);}}
  return <div className="grid gap-3"><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={drop}><SortableContext items={order.map(row=>row.id)} strategy={verticalListSortingStrategy}>{order.length?order.map((item,index)=><Row key={item.id} item={item} index={index} count={order.length} move={move}/>):<p className="border border-dashed p-4 text-sm text-[#657064]">{empty}</p>}</SortableContext></DndContext><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={save} disabled={saving||!order.length} className="rounded bg-[#1f3426] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?"Saving…":"Save display order"}</button>{message?<span role="status" className="text-sm text-[#28623a]">{message}</span>:null}</div></div>;
}


