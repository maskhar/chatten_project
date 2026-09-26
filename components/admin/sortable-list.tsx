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
import { useId, useRef, useState, type ReactNode } from "react";
import { ROW_ACTION_BORDERED, TAP_TARGET } from "@/components/ui/control";
import { actionErrorMessage, isRedirectError } from "@/lib/admin/action-feedback";
import { isSameOrder, reconcileOrder } from "@/lib/admin/reorder-core";

type SortableItem = {
  id: string;
  label: string;
  detail?: ReactNode;
  /**
   * Row controls receive the list lock state. Dedicated managers use it to
   * disable visibility/delete/edit while an order is saving, and SortableList
   * receives `rowBusy` from those managers to lock drag/save in the other
   * direction.
   */
  actions?: (state: { reorderBusy: boolean }) => ReactNode;
};

type Props = {
  items: SortableItem[];
  onSave: (ids: string[]) => Promise<void>;
  /** A visibility/delete request is in flight in the parent manager. */
  rowBusy?: boolean;
  empty?: string;
};

type Feedback =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

const REORDER_FAILED = "Gagal menyimpan urutan.";
// The rollback is stated separately so an actionable server message ("Urutan
// galeri harus memuat setiap item galeri tepat satu kali.") keeps its own
// wording and still tells the operator what happened to the list on screen.
const REORDER_RESTORED = "Urutan tersimpan telah dipulihkan.";
const REORDER_UNCHANGED = "Urutan belum berubah, jadi tidak ada yang perlu disimpan.";

function ids(items: readonly SortableItem[]) {
  return items.map((item) => item.id);
}

function Row({
  item,
  index,
  count,
  move,
  disabled,
  saving,
}: {
  item: SortableItem;
  index: number;
  count: number;
  move: (from: number, to: number) => void;
  /** Drag and the arrow controls are locked: an order save or a row action is running. */
  disabled: boolean;
  /** Specifically an order save, which is what row actions must not race. */
  saving: boolean;
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
        {item.actions?.({ reorderBusy: saving })}
      </div>
    </div>
  );
}

export function SortableList({
  items,
  onSave,
  rowBusy = false,
  empty = "Belum ada item.",
}: Props) {
  const [order, setOrder] = useState(items);
  const [saving, setSaving] = useState(false);
  // A91: `saving` is React state, so two clicks in the same tick both read it
  // as false and both fire the action. The ref is written synchronously, before
  // the await, which is what makes the second click a no-op.
  const inFlight = useRef(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  // A79: rollback must use the last order the server accepted, not the `items`
  // closure captured during a failed request. That prop can already be stale
  // after an earlier successful save and would undo more than the failed edit.
  const [persisted, setPersisted] = useState(items);
  // A82: DndContext memberi id otomatis dari penghitung modul global. Server
  // dan browser memulai penghitung itu pada nilai berbeda, sehingga setiap
  // tombol seret dirender dengan aria-describedby="DndDescribedBy-0" di server
  // dan "DndDescribedBy-73" di klien. React melaporkannya sebagai hydration
  // mismatch dan menolak menambalnya, jadi deskripsi aksesibilitas drag-and-drop
  // menunjuk ke elemen yang tidak ada bagi pembaca layar. useId menghasilkan id
  // identik di kedua sisi.
  const dndId = useId();

  // A82: menyelaraskan daftar dengan prop server saat render, bukan lewat
  // useEffect. Versi efek memanggil setOrder di dalam badan efek, sehingga
  // setiap muatan ulang server menghasilkan render berantai — satu render
  // dengan urutan lama yang sudah usang, lalu satu lagi setelah efek berjalan.
  // Pola penyetelan-saat-render React membuang render perantara itu dan
  // menghilangkan peringatan react-hooks/set-state-in-effect.
  const [syncedItems, setSyncedItems] = useState(items);
  // A91: a revalidation can arrive while an order save is in flight. Marking
  // those props as synced and skipping the merge loses them for good — the
  // request settles, `items` is already considered seen, and the newer server
  // rows never reach the list. So the props stay unsynced until the request
  // settles; `setSaving(false)` re-renders, this branch runs again, and the
  // newest props are merged then. Matching row membership preserves the
  // operator's unsaved order; rows added or removed replace it, because the
  // local arrangement describes a set that no longer exists.
  //
  // The gate is the `saving` state, not the `inFlight` ref: a ref read during
  // render is not a render input, so React can skip the re-render that would
  // pick the props up once the request settles. `saving` is true for the whole
  // request and its `false` write is itself the render that merges them.
  if (syncedItems !== items && !saving) {
    setSyncedItems(items);
    // `items` is by definition the order the server now holds, so it is the
    // baseline a failed save rolls back to.
    setPersisted(items);
    setOrder([...reconcileOrder(order, items)]);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  const move = (from: number, to: number) => {
    if (saving || rowBusy || from < 0 || to < 0 || to >= order.length) return;
    const next = [...order];
    const [row] = next.splice(from, 1);
    if (!row) return;
    next.splice(to, 0, row);
    setOrder(next);
    setFeedback(null);
  };

  const drop = (event: DragEndEvent) => {
    if (saving || rowBusy || !event.over || event.active.id === event.over.id) return;
    move(
      order.findIndex((row) => row.id === event.active.id),
      order.findIndex((row) => row.id === event.over?.id),
    );
  };

  async function save() {
    // `inFlight` closes same-tick double activation; `rowBusy` is the inverse
    // lock from a manager visibility/delete request. Neither request can safely
    // arrive while the other is choosing ranks or removing a row.
    if (inFlight.current || rowBusy || !order.length) return;

    const submitted = [...order];
    if (isSameOrder(ids(submitted), ids(persisted))) {
      setFeedback({ kind: "success", message: REORDER_UNCHANGED });
      return;
    }

    inFlight.current = true;
    setSaving(true);
    setFeedback(null);
    try {
      await onSave(ids(submitted));
      setPersisted(submitted);
      setOrder(submitted);
      setFeedback({ kind: "success", message: "Urutan berhasil disimpan." });
    } catch (error) {
      if (isRedirectError(error)) throw error;
      setOrder(persisted);
      setFeedback({
        kind: "error",
        message: `${actionErrorMessage(error, REORDER_FAILED)} ${REORDER_RESTORED}`,
      });
    } finally {
      inFlight.current = false;
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
                disabled={saving || rowBusy}
                saving={saving}
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
          disabled={saving || rowBusy || !order.length}
          aria-busy={saving}
          className="min-h-11 rounded bg-forest px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Menyimpan…" : "Simpan urutan tampilan"}
        </button>
        {feedback?.kind === "success" ? (
          <span role="status" className="text-sm font-semibold text-leaf">
            {feedback.message}
          </span>
        ) : null}
        {feedback?.kind === "error" ? (
          <span role="alert" className="text-sm font-semibold text-rust">
            {feedback.message}
          </span>
        ) : null}
      </div>
    </div>
  );
}
