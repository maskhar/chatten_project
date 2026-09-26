import { buildMediaUsagePresentation } from "./usage-presentation";
import type { MediaUsageReference } from "./usage";

export type MediaDeleteState = {
  canDelete: boolean;
  usageCount: number;
  protectedMessage: string | null;
  confirmationMessage: string | null;
  references: readonly MediaUsageReference[];
};

export type MediaDeleteActionState = {
  status: "idle" | "success" | "error";
  code?: "MEDIA_IN_USE" | "MEDIA_DELETE_FAILED";
  message?: string;
  references?: readonly MediaUsageReference[];
};

export const initialMediaDeleteActionState: MediaDeleteActionState = { status: "idle" };

export function buildMediaDeleteState(references: readonly MediaUsageReference[], mediaName: string): MediaDeleteState {
  const presentation = buildMediaUsagePresentation(references);
  const name = mediaName.trim() || "gambar ini";
  return {
    canDelete: presentation.count === 0,
    usageCount: presentation.count,
    protectedMessage: presentation.count ? "Gambar ini tidak dapat dihapus karena sedang dipakai di " + presentation.count + " tempat." : null,
    confirmationMessage: presentation.count ? null : "Hapus “" + name + "”? Gambar akan dihapus permanen dari Pustaka Media dan Storage.",
    references,
  };
}

export function mediaInUseActionState(references: readonly MediaUsageReference[]): MediaDeleteActionState {
  const state = buildMediaDeleteState(references, "gambar ini");
  return { status: "error", code: "MEDIA_IN_USE", message: state.protectedMessage ?? "Gambar ini tidak dapat dihapus.", references };
}
