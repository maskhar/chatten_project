"use client";

import { type FormEvent } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { MediaPicker } from "@/components/admin/media-picker";
import { RowFeedback } from "@/components/admin/row-feedback";
import { RowLink } from "@/components/admin/row-link";
import { SortableList } from "@/components/admin/sortable-list";
import { SubmitButton } from "@/components/admin/submit-button";
import { useRowOperation } from "@/components/admin/use-row-operation";
import {
  deleteMenuCategory,
  deleteMenuItem,
  duplicateMenuItem,
  reorderMenuCategories,
  reorderMenuItems,
  saveMenuCategory,
  saveMenuItem,
  toggleMenuItem,
} from "@/lib/admin/menu-actions";
import { formatIdr } from "@/lib/menu/price";
import {
  ROW_ACTION_BORDERED,
  ROW_ACTION_DANGER,
  ROW_ACTION_PRIMARY,
} from "@/components/ui/control";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
};

type Item = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  image_media_id: string | null;
  is_active: boolean;
};

type Media = {
  id: string;
  title: string | null;
  alt_text: string | null;
  category: string | null;
  width: number | null;
  height: number | null;
  bucket: string;
  storage_path: string;
};

const input = "mt-1 w-full rounded border px-3 py-2";

export function MenuManagerClient({
  categories,
  items,
  media,
}: {
  categories: Category[];
  items: Item[];
  media: Media[];
}) {
  const rowOperation = useRowOperation();

  function runForm(
    event: FormEvent<HTMLFormElement>,
    id: string,
    action: (formData: FormData) => Promise<unknown>,
    successMessage: string,
    fallbackMessage: string,
  ) {
    event.preventDefault();
    // FormData must be read here, synchronously. `event.currentTarget` is null
    // by the time an async callback runs, so building it inside the operation
    // closure would submit an empty form.
    const formData = new FormData(event.currentTarget);
    rowOperation.run(id, () => action(formData), successMessage, fallbackMessage);
  }

  const categoryRows = categories.map((category) => ({
    id: category.id,
    label: category.name,
    detail: category.description ? (
      <p className="mt-1 text-sm text-ink-muted">{category.description}</p>
    ) : undefined,
    actions: ({ reorderBusy }: { reorderBusy: boolean }) => {
      const pending = rowOperation.isPending(category.id);
      const locked = reorderBusy || rowOperation.busy;
      return (
        <>
          <details className={`relative${locked ? " pointer-events-none opacity-40" : ""}`}>
            <summary
              aria-disabled={locked || undefined}
              tabIndex={locked ? -1 : undefined}
              className={`${ROW_ACTION_BORDERED} cursor-pointer`}
            >
              Edit
            </summary>
            <form
              className="absolute z-20 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded border bg-white p-4 shadow"
              onSubmit={(event) =>
                runForm(
                  event,
                  category.id,
                  saveMenuCategory,
                  "Kategori menu disimpan.",
                  "Kategori menu gagal disimpan.",
                )
              }
            >
              <input type="hidden" name="id" value={category.id} />
              <label className="block text-sm">
                Nama
                <input className={input} name="name" defaultValue={category.name} />
              </label>
              <label className="mt-2 block text-sm">
                Slug
                <input className={input} name="slug" defaultValue={category.slug} />
              </label>
              <label className="mt-2 block text-sm">
                Deskripsi
                <textarea
                  className={input}
                  name="description"
                  defaultValue={category.description ?? ""}
                />
              </label>
              <label className="mt-2 flex gap-2 text-sm">
                <input
                  name="is_active"
                  type="checkbox"
                  defaultChecked={category.is_active}
                />
                Tampil
              </label>
              <button
                type="submit"
                disabled={locked}
                aria-busy={pending}
                className={`${ROW_ACTION_PRIMARY} mt-3`}
              >
                {pending ? "Menyimpan…" : "Simpan"}
              </button>
            </form>
          </details>
          <button
            type="button"
            disabled={locked}
            aria-busy={pending}
            className={ROW_ACTION_DANGER}
            onClick={() => {
              if (!confirm(`Hapus “${category.name}”?`)) return;
              const formData = new FormData();
              formData.append("id", category.id);
              rowOperation.run(
                category.id,
                () => deleteMenuCategory(formData),
                "Kategori menu dihapus.",
                "Kategori menu gagal dihapus.",
              );
            }}
          >
            {pending ? "Memproses…" : "Hapus"}
          </button>
          <RowFeedback feedback={rowOperation.feedback(category.id)} />
        </>
      );
    },
  }));

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-clay">
            Situs
          </p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl">Menu</h1>
          <p className="mt-3 text-ink-muted">Kelola kategori dan item menu.</p>
        </div>
        <a
          href="#add-item"
          className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white"
        >
          + Tambah item
        </a>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-8">
          <section>
            <h2 className="font-serif text-2xl sm:text-3xl">Kategori</h2>
            <div className="mt-4">
              <SortableList
                onSave={reorderMenuCategories}
                items={categoryRows}
                rowBusy={rowOperation.busy}
              />
            </div>
            <ActionForm
              action={saveMenuCategory}
              className="mt-4 rounded border bg-white p-4"
            >
              <h3 className="font-semibold">+ Tambah Kategori</h3>
              <label className="mt-2 block text-sm">
                Nama
                <input name="name" required className={input} />
              </label>
              <label className="mt-2 block text-sm">
                Slug
                <input name="slug" required className={input} />
              </label>
              <label className="mt-2 block text-sm">
                Deskripsi
                <textarea name="description" className={input} />
              </label>
              <label className="mt-2 flex gap-2 text-sm">
                <input name="is_active" type="checkbox" defaultChecked />
                Tampil
              </label>
              <SubmitButton
                className={`${ROW_ACTION_PRIMARY} mt-3`}
                pendingLabel="Menambahkan…"
              >
                Tambah kategori
              </SubmitButton>
            </ActionForm>
          </section>

          {categories.map((category) => {
            const group = items.filter((item) => item.category_id === category.id);
            const itemRows = group.map((item) => ({
              id: item.id,
              label: item.name,
              detail: (
                <>
                  <p className="mt-1 text-sm text-ink-muted">
                    {item.price === null ? "Harga sesuai permintaan" : formatIdr(item.price)}
                  </p>
                  <p className="mt-1 text-xs">
                    {item.is_active ? "Tersedia" : "Tidak tersedia"}
                  </p>
                </>
              ),
              actions: ({ reorderBusy }: { reorderBusy: boolean }) => {
                const pending = rowOperation.isPending(item.id);
                const locked = reorderBusy || rowOperation.busy;
                return (
                  <>
                    <RowLink
                      href={`/admin/menu/items/${item.id}`}
                      locked={locked}
                      className={ROW_ACTION_PRIMARY}
                    >
                      Edit
                    </RowLink>
                    <button
                      type="button"
                      disabled={locked}
                      aria-busy={pending}
                      className={ROW_ACTION_BORDERED}
                      onClick={() => {
                        const formData = new FormData();
                        formData.append("id", item.id);
                        rowOperation.run(
                          item.id,
                          () => duplicateMenuItem(formData),
                          "Item menu disalin.",
                          "Item menu gagal disalin.",
                        );
                      }}
                    >
                      {pending ? "Memproses…" : "Duplikat"}
                    </button>
                    <button
                      type="button"
                      disabled={locked}
                      aria-busy={pending}
                      className={ROW_ACTION_DANGER}
                      onClick={() => {
                        if (!confirm(`Hapus “${item.name}”?`)) return;
                        const formData = new FormData();
                        formData.append("id", item.id);
                        rowOperation.run(
                          item.id,
                          () => deleteMenuItem(formData),
                          "Item menu dihapus.",
                          "Item menu gagal dihapus.",
                        );
                      }}
                    >
                      {pending ? "Memproses…" : "Hapus"}
                    </button>
                    <button
                      type="button"
                      disabled={locked}
                      aria-busy={pending}
                      className={ROW_ACTION_BORDERED}
                      onClick={() => {
                        const formData = new FormData();
                        formData.append("id", item.id);
                        formData.append("active", String(!item.is_active));
                        rowOperation.run(
                          item.id,
                          () => toggleMenuItem(formData),
                          item.is_active
                            ? "Item menu ditandai tidak tersedia."
                            : "Item menu ditandai tersedia.",
                          "Ketersediaan item menu gagal diperbarui.",
                        );
                      }}
                    >
                      {pending
                        ? "Memproses…"
                        : item.is_active
                          ? "Tandai tidak tersedia"
                          : "Tandai tersedia"}
                    </button>
                    <RowFeedback feedback={rowOperation.feedback(item.id)} />
                  </>
                );
              },
            }));

            return (
              <section key={category.id}>
                <h2 className="font-serif text-2xl sm:text-3xl">{category.name}</h2>
                <div className="mt-4">
                  <SortableList
                    empty="Belum ada item di kategori ini."
                    onSave={(ids) => reorderMenuItems(category.id, ids)}
                    items={itemRows}
                    rowBusy={rowOperation.busy}
                  />
                </div>
              </section>
            );
          })}
        </div>

        <ActionForm
          id="add-item"
          action={saveMenuItem}
          className="h-fit rounded border bg-white p-5"
        >
          <h2 className="font-semibold">Tambah item menu</h2>
          <label className="mt-3 block text-sm">
            Nama
            <input name="name" required className={input} />
          </label>
          <label className="mt-3 block text-sm">
            Kategori
            <select name="category_id" required className={input}>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm">
            Harga
            <input
              name="price"
              inputMode="numeric"
              required
              placeholder="25000"
              className={input}
            />
          </label>
          <label className="mt-3 block text-sm">
            Deskripsi
            <textarea name="description" className={input} />
          </label>
          <MediaPicker name="image_media_id" media={media} />
          <label className="mt-3 flex gap-2 text-sm">
            <input name="is_active" type="checkbox" defaultChecked />
            Tersedia
          </label>
          <input type="hidden" name="status" value="published" />
          <SubmitButton
            className="mt-4 w-full rounded bg-forest px-4 py-3 text-sm font-semibold text-white"
            pendingLabel="Menyimpan…"
          >
            Simpan item menu
          </SubmitButton>
        </ActionForm>
      </div>
    </section>
  );
}
