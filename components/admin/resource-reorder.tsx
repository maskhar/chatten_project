"use client";

import { SortableList } from "@/components/admin/sortable-list";

// A26: lib/admin/actions.ts has exported reorderResource since the generic
// module was written, but nothing ever called it — the only way to change
// display order was to type sort_order numbers into each record by hand.
//
// SortableList speaks `(ids: string[]) => Promise<void>` and the server action
// speaks FormData, so this is the adapter between them. It is its own client
// file because the list page is a server component: a server action can cross
// that boundary as a prop, but the closure that builds the FormData cannot.
export function ResourceReorder({ resourceKey, items, offset, action }: { resourceKey: string; items: { id: string; label: string }[]; offset: number; action: (formData: FormData) => Promise<void> }) {
  return (
    <SortableList
      items={items}
      empty="Belum ada yang bisa diurutkan."
      onSave={async (ids) => {
        const formData = new FormData();
        formData.set("resource", resourceKey);
        formData.set("ids", ids.join(","));
        formData.set("offset", String(offset));
        await action(formData);
      }}
    />
  );
}
