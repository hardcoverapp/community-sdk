/**
 * Types for JSON columns the schema only knows as `jsonb` (spec/03, Types for
 * JSON columns). The shapes are observed from the API, not guaranteed: keys
 * stay exactly as stored, an empty column arrives as `{}`, and the server can
 * add or drop keys, so every field is optional.
 */

/** A cover, author photo or avatar. `{}` when there's no image. */
export interface CachedImage {
  id?: number;
  url?: string;
  /** Dominant color as a hex string, e.g. "#ddd8d7". */
  color?: string;
  width?: number;
  height?: number;
  color_name?: string;
}

/** One credited person on a book or edition. */
export interface CachedContributor {
  author?: { id?: number; slug?: string; name?: string; image?: CachedImage };
  /** "Author", "Narrator", "Illustrator", … */
  contribution?: string | null;
  /** The credit the site shows first. */
  primary?: boolean;
  contributor_role_id?: number | null;
  contributor_role_name?: string | null;
  contributor_role_blurb?: string | null;
  contributor_specialization_id?: number | null;
  contributor_specialization_name?: string | null;
  contributor_specialization_blurb?: string | null;
}

/** A tag with how many readers applied it. These keys are stored in camelCase. */
export interface CachedTag {
  tag?: string;
  tagSlug?: string;
  category?: string;
  categorySlug?: string;
  count?: number;
  spoilerRatio?: number;
}

/** Tags grouped by category: "Genre", "Mood", "Tag", "Content Warning", … */
export type CachedTags = { [category: string]: CachedTag[] | undefined };

/** The series the site features for a book, e.g. "Red Rising Saga" #1. `{}` when it has none. */
export interface CachedFeaturedSeries {
  id?: number;
  series?: { id?: number; name?: string; slug?: string; books_count?: number; primary_books_count?: number | null };
  position?: number | null;
  /** The position as written, e.g. "1" or "1-3". */
  details?: string | null;
  featured?: boolean;
  collection?: boolean;
  unreleased?: boolean;
}

/** Field name to type, wherever the field appears in a response. */
interface JsonColumns {
  cachedImage: CachedImage;
  cachedContributors: CachedContributor[];
  cachedTags: CachedTags;
  cachedFeaturedSeries: CachedFeaturedSeries;
}

/**
 * A generated type with its JSON columns typed. Codegen can only map the
 * `jsonb` scalar as a whole, so the per-field types are applied here.
 */
export type WithJsonColumns<T> = T extends readonly (infer U)[]
  ? WithJsonColumns<U>[]
  : T extends object
    ? { [K in keyof T]: K extends keyof JsonColumns ? JsonColumns[K] : WithJsonColumns<T[K]> }
    : T;
