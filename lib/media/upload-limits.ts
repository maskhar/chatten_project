// A78. The upload limits existed twice: `MAX_MEDIA_SELECTION_FILES` in
// upload-selection.ts drove the browser's helper text, `MAX_MEDIA_UPLOAD_FILES`
// in upload-core.ts was what the server actually enforced. Both happened to be
// 20, so nothing was visibly broken — the defect was latent. The moment either
// moved, the dropzone would promise one thing and the server would do another,
// and the mismatch would surface as a rejected upload after the user had
// already picked the files.
//
// They could not simply import each other: upload-core.ts imports `node:crypto`
// for content hashing, and media-upload-dropzone.tsx is a client component, so
// pulling core into the browser bundle would fail. Hence this third module,
// which depends on nothing and can be imported from both sides.
//
// The byte limit had the same split in a quieter form: the number lived in
// upload-core.ts while "10 MB" was hand-typed into two separate user-facing
// strings. `formatMediaSizeLimit()` derives the words from the number.

/** Images per upload. Enforced server-side; shown in the dropzone. */
export const MAX_MEDIA_UPLOAD_FILES = 20;

/** Per-image ceiling. Enforced server-side; shown in the dropzone. */
export const MAX_MEDIA_UPLOAD_BYTES = 10 * 1024 * 1024;

/** "10 MB" — derived, so the copy cannot drift from the enforced value. */
export function formatMediaSizeLimit() {
  return `${Math.round(MAX_MEDIA_UPLOAD_BYTES / (1024 * 1024))} MB`;
}
