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
  const name = mediaName.trim() || "this image";
  return {
    canDelete: presentation.count === 0,
    usageCount: presentation.count,
    protectedMessage: presentation.count ? "This image cannot be deleted because it is currently used in " + presentation.count + " " + (presentation.count === 1 ? "place." : "places.") : null,
    confirmationMessage: presentation.count ? null : "Delete “" + name + "”? This permanently removes the image from the Media Library and Storage.",
    references,
  };
}

export function mediaInUseActionState(references: readonly MediaUsageReference[]): MediaDeleteActionState {
  const state = buildMediaDeleteState(references, "this image");
  return { status: "error", code: "MEDIA_IN_USE", message: state.protectedMessage ?? "This image cannot be deleted.", references };
}
