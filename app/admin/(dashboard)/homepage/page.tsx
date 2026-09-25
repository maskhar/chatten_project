import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { HomepageSortable } from "@/components/admin/homepage-sortable";

export const dynamic = "force-dynamic";

type Section = {
  id: string;
  section_key: string;
  sort_order: number;
  is_visible: boolean;
};

export default async function HomepageManager() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("homepage_sections")
    .select("*")
    .order("sort_order");

  if (error) {
    return (
      <section>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl">
          Homepage
        </h1>
        <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-4 text-sm">
          Migration bagian homepage belum diterapkan.
        </p>
      </section>
    );
  }

  const rows = (data ?? []) as Section[];
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-clay">
            Website
          </p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl">
            Homepage
          </h1>
          <p className="mt-3 max-w-2xl text-ink-muted">
            Seret, pindahkan, sembunyikan, atau edit bagian tetap website.
          </p>
        </div>
        <Link
          className="rounded border px-4 py-2 text-sm font-semibold"
          href="/"
        >
          Pratinjau website
        </Link>
      </div>
      <div className="mt-8">
        <HomepageSortable rows={rows} />
      </div>
    </section>
  );
}
