"use client";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ROW_ACTION_BORDERED, TAP_TARGET } from "@/components/ui/control";

type SortableItem = {
  id: string;
  label: string;
  detail?: ReactNode;
  actions?: ReactNode;
};

type Props = {
  items: SortableItem[];
  onSave: (ids: string[]) => Promise<void>;
  empty?: string;
};

function Row({
  item,
  index,
  count,
  move,
  disabled,
}: {
  item: SortableItem;
  index: number;
  count: number;
  move: (from: number, to: number) => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-wrap items-center gap-3 border border-line-soft bg-white p-3 ${
        isDragging ? "relative z-10 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        className={`${TAP_TARGET} cursor-grab touch-none px-2 text-lg text-ink-muted active:cursor-grabbing`}
        aria-label={`Seret ${item.label}`}
      >
        ⋮⋮
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.label}</p>
        {item.detail}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={ROW_ACTION_BORDERED}
          disabled={disabled || index === 0}
          onClick={() => move(index, index - 1)}
          aria-label={`Pindahkan ${item.label} ke atas`}
        >
          ↑
        </button>
        <button
          type="button"
          className={ROW_ACTION_BORDERED}
          disabled={disabled || index === count - 1}
          onClick={() => move(index, index + 1)}
          aria-label={`Pindahkan ${item.label} ke bawah`}
        >
          ↓
        </button>
        {item.actions}
      </div>
    </div>
  );
}

export function SortableList({
  items,
  onSave,
  empty = "Belum ada item.",
}: Props) {
  const [order, setOrder] = useState(items);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  // A79: rollback must use the last order the server accepted, not the `items`
  // closure captured during a failed request. That prop can already be stale
  // after an earlier successful save and would undo more than the failed edit.
  const persisted = useRef(items);
  // A82: DndContext memberi id otomatis dari penghitung modul global. Server
  // dan browser memulai penghitung itu pada nilai berbeda, sehingga setiap
  // tombol seret dirender dengan aria-describedby="DndDescribedBy-0" di server
  // dan "DndDescribedBy-73" di klien. React melaporkannya sebagai hydration
  // mismatch dan menolak menambalnya, jadi deskripsi aksesibilitas drag-and-drop
  // menunjuk ke elemen yang tidak ada bagi pembaca layar. useId menghasilkan id
  // identik di kedua sisi.
  const dndId = useId();

  useEffect(() => {
    persisted.current = items;
    setOrder(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  const move = (from: number, to: number) => {
    if (saving || from < 0 || to < 0 || to >= order.length) return;
    const next = [...order];
    const [row] = next.splice(from, 1);
    if (!row) return;
    next.splice(to, 0, row);
    setOrder(next);
    setMessage("");
  };

  const drop = (event: DragEndEvent) => {
    if (saving || !event.over || event.active.id === event.over.id) return;
    move(
      order.findIndex((row) => row.id === event.active.id),
      order.findIndex((row) => row.id === event.over?.id),
    );
  };

  async function save() {
    const submitted = [...order];
    setSaving(true);
    setMessage("");
    try {
      await onSave(submitted.map((row) => row.id));
      persisted.current = submitted;
      setOrder(submitted);
      setMessage("Urutan berhasil disimpan.");
    } catch {
      setOrder(persisted.current);
      setMessage("Gagal menyimpan urutan. Urutan tersimpan telah dipulihkan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3">
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={drop}
      >
        <SortableContext
          items={order.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          {order.length ? (
            order.map((item, index) => (
              <Row
                key={item.id}
                item={item}
                index={index}
                count={order.length}
                move={move}
                disabled={saving}
              />
            ))
          ) : (
            <p className="border border-dashed p-4 text-sm text-ink-muted">
              {empty}
            </p>
          )}
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !order.length}
          className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Menyimpan…" : "Simpan urutan tampilan"}
        </button>
        {message ? (
          <span role="status" className="text-sm text-leaf">
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
}
