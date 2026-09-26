"use client";

import { useActionState } from "react";
import { deleteMediaWithFeedback } from "@/lib/admin/media-actions";
import { buildMediaDeleteState, initialMediaDeleteActionState } from "@/lib/media/delete-state";
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

export function MediaDeleteControl({ mediaId, mediaName, references }: MediaDeleteControlProps) {
  const [result, action, pending] = useActionState(deleteMediaWithFeedback, initialMediaDeleteActionState);
  const state = buildMediaDeleteState(result.references ?? references, mediaName);

  if (!state.canDelete) {
    return (
      <div className="mt-3 border-t border-red-200 pt-3 text-sm text-red-800">
        <p>{result.message ?? state.protectedMessage}</p>
        <ReferenceList references={state.references} />
      </div>
    );
  }

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="id" value={mediaId} />
      <button
        className="text-sm text-red-800 underline disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm(state.confirmationMessage ?? "Hapus gambar ini?")) event.preventDefault();
        }}
      >
        {pending ? "Menghapus…" : "Hapus dengan aman"}
      </button>
      {result.status === "error" ? <p className="mt-2 text-sm text-red-800">{result.message}</p> : null}
    </form>
  );
}
