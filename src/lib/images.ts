/**
 * Image URL construction for Open Library assets.
 *
 * The catalogue stores bare numeric ids rather than full URLs, so the app can
 * pick a size at the call site: a 52px cover in a list row has no business
 * downloading the 800px file. Sizes follow Open Library's own naming —
 * S (~40px), M (~180px), L (~500px wide).
 *
 * Every helper returns `null` rather than a broken URL when the id is missing,
 * which is the signal `BookCover` / `Avatar` use to fall back to a generated
 * placeholder.
 */

export type CoverSize = 'S' | 'M' | 'L';

const COVERS = 'https://covers.openlibrary.org';

/** Book cover by Open Library cover id (the catalogue's `coverId`). */
export function bookCoverUrl(coverId: number | null | undefined, size: CoverSize = 'M') {
  if (!coverId) return null;
  return `${COVERS}/b/id/${coverId}-${size}.jpg`;
}

/** Author portrait by Open Library photo id (the catalogue's `photoId`). */
export function authorPhotoUrl(photoId: number | null | undefined, size: CoverSize = 'M') {
  if (!photoId) return null;
  return `${COVERS}/a/id/${photoId}-${size}.jpg`;
}

/**
 * Picks the cover size for a rendered width, in device-independent pixels.
 *
 * Data saver drops everything one step so a metered connection never pulls the
 * large file for a grid of forty covers.
 */
export function coverSizeFor(width: number, dataSaver = false): CoverSize {
  if (dataSaver) return width <= 64 ? 'S' : 'M';
  if (width <= 48) return 'S';
  if (width <= 200) return 'M';
  return 'L';
}

/**
 * Deterministic avatar for users, who are demo data and have no real photo.
 *
 * DiceBear renders from a seed, so a username always maps to the same face and
 * the friends list looks populated instead of showing fourteen grey initials.
 */
export function generatedAvatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/thumbs/png?seed=${encodeURIComponent(seed)}&size=160`;
}
