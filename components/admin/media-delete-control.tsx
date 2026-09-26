"use client";

import { useActionState } from "react";
import { deleteMediaWithFeedback } from "@/lib/admin/media-actions";
import { ROW_ACTION_DANGER } from "@/components/ui/control";
import {
  buildMediaDeleteState,
  initialMediaDeleteActionState,
  isMediaDeleteSettled,
} from "@/lib/media/delete-state";
import type { MediaUsageReference } from "@/lib/media/usage";

type MediaDeleteControlProps = {
  mediaId: string;
  mediaName: string;
  references: readonly MediaUsageReference[];
};

function ReferenceList({ references }: { references: readonly MediaUsageReference[] }) {
  return (
    <ul className="mt-3 grid gap-1 text-sm">
      <li className="sr-only">Digunakan di:</li>
      {references.map((reference, index) => (
        <li className="break-words" key={reference.resource + "-" + reference.mediaId + "-" + index}>
          {reference.href ? (
            <a className="underline" href={reference.href}>
              {reference.label} — {reference.title}
            </a>
          ) : (
            <span>
              {reference.label} — {reference.title}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

// A91 (lanjutan). Tiga hal sebelumnya tidak dilaporkan di sini:
//
//   1. Keberhasilan. Kontrol hanya menulis pesan untuk `status === "error"`,
//      jadi hapus yang berhasil hanya terlihat dari kartunya yang hilang setelah
//      revalidasi — dan bila revalidasi belum terlihat, tampak seperti tidak
//      terjadi apa pun.
//   2. Keadaan terminal. Tombol hapus tetap aktif setelah baris terhapus, dan
//      pada kasus berkas yatim juga tetap aktif untuk baris yang sudah tidak ada,
//      sehingga klik berikutnya hanya bisa menghasilkan error menyesatkan.
//   3. Error usang. `result.message` dari percobaan sebelumnya tetap terbaca
//      selama percobaan berikutnya berjalan, jadi operator membaca kegagalan lama
//      sementara request baru justru sedang berhasil.
export function MediaDeleteControl({ mediaId, mediaName, references }: MediaDeleteControlProps) {
  const [result, action, pending] = useActionState(deleteMediaWithFeedback, initialMediaDeleteActionState);
  const state = buildMediaDeleteState(result.references ?? references, mediaName);
  const settled = isMediaDeleteSettled(result);

  if (!state.canDelete) {
    return (
      <div className="mt-3 border-t border-terracotta pt-3 text-sm text-rust">
        <p role="alert">{result.message ?? state.protectedMessage}</p>
        <ReferenceList references={state.references} />
      </div>
    );
  }

  // Terminal: baris sudah hilang dari basis data. Tidak ada tombol yang masuk
  // akal di sini — baik untuk hapus yang berhasil maupun untuk berkas yatim,
  // yang berikutnya perlu penanganan administrator, bukan percobaan ulang.
  if (settled) {
    return result.status === "success" ? (
      <p role="status" className="mt-3 border-t border-line pt-3 text-sm font-medium text-leaf">
        {result.message ?? "Gambar dihapus."}
      </p>
    ) : (
      <p role="alert" className="mt-3 break-words border-t border-terracotta pt-3 text-sm font-medium text-rust">
        {result.message}
      </p>
    );
  }

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="id" value={mediaId} />
      <button
        className={`${ROW_ACTION_DANGER} disabled:cursor-not-allowed disabled:opacity-60`}
        disabled={pending}
        aria-busy={pending}
        onClick={(event) => {
          if (!window.confirm(state.confirmationMessage ?? "Hapus gambar ini?")) event.preventDefault();
        }}
      >
        {pending ? "Menghapus…" : "Hapus dengan aman"}
      </button>
      {/* Pesan gagal disembunyikan selama percobaan berikutnya berjalan: sebuah
          error dari percobaan sebelumnya bukan keterangan yang benar tentang
          request yang sedang berjalan sekarang. */}
      {result.status === "error" && !pending ? (
        <p role="alert" className="mt-2 text-sm text-rust">{result.message}</p>
      ) : null}
    </form>
  );
}
