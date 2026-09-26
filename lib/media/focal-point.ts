// A28: media.focal_x / media.focal_y have existed since the rights-metadata
// migration but no screen ever wrote them, so every crop fell back to centre
// and a subject near an edge was cut off. The column is numeric(5,4), so a
// value outside 0–1 or with more than four decimal places is either rejected
// by Postgres or silently rounded; both are decided here instead.
export const FOCAL_DECIMALS = 4;

export function parseFocalValue(raw: FormDataEntryValue | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  // An empty field means "no focal point", which is a legitimate state and
  // must clear the column rather than fail validation.
  if (!text) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error("Titik fokus harus berupa angka antara 0 dan 1.");
  if (value < 0 || value > 1) throw new Error("Titik fokus harus bernilai antara 0 dan 1.");
  return Number(value.toFixed(FOCAL_DECIMALS));
}

// Both coordinates are stored or neither is: a row with only focal_x tells a
// renderer nothing it can act on, so a half-filled pair is a form error rather
// than something to persist.
export function parseFocalPoint(x: FormDataEntryValue | null | undefined, y: FormDataEntryValue | null | undefined) {
  const focalX = parseFocalValue(x);
  const focalY = parseFocalValue(y);
  if ((focalX === null) !== (focalY === null)) {
    throw new Error("Isi kedua nilai titik fokus, atau kosongkan keduanya.");
  }
  return { focal_x: focalX, focal_y: focalY };
}

// CSS object-position wants percentages; the default matches the browser's own
// 50% 50% so an unset focal point renders exactly as it did before.
export function focalObjectPosition(media: { focal_x?: number | null; focal_y?: number | null } | null | undefined) {
  const x = media?.focal_x;
  const y = media?.focal_y;
  if (typeof x !== "number" || typeof y !== "number") return "50% 50%";
  return `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`;
}
