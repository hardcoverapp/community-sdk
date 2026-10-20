import type { HardcoverClient } from "../core/client.ts";
import { NotFoundError } from "../core/errors.ts";
import type {
  DynamicSignalCategory,
  PrivacySetting,
  VibeAudience,
  VibeAxiom,
  VibeFormat,
  VibeGenre,
  VibeSeries,
} from "../generated/enums.ts";
import type { BookSummaryFragment, VibeInput, VibeSummaryFragment } from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import { DEFAULT_LIMIT, toPage, type Page, type PageOptions } from "./page.ts";
import { nonNull, pickDefined, required } from "./shared.ts";

export type Vibe = VibeSummaryFragment;

// Taxonomy values autocomplete from the known list but any string is accepted:
// the server validates, and the taxonomy can grow without an SDK release.
type Open<T extends string> = T | (string & {});

/** One thing a vibe should (positive weight) or shouldn't (negative) lean toward. */
export type VibeSignal =
  | { type: "genre"; value: Open<VibeGenre>; weight: number }
  | { type: "axiom"; value: Open<VibeAxiom>; weight: number }
  | { type: "audience"; value: Open<VibeAudience>; weight: number }
  | { type: "format"; value: Open<VibeFormat>; weight: number }
  | { type: "series"; value: Open<VibeSeries>; weight: number }
  /** Like this book, author or reader (you, or someone who follows you). */
  | { type: "book" | "author" | "user"; id: number; weight: number }
  /** Described in words. */
  | { type: "semantic"; text: string; weight: number }
  /** Negative digs up hidden gems; positive boosts bestsellers. */
  | { type: "popularity"; weight: number };

export interface VibeExclusion {
  type: "book" | "author";
  id: number;
}

/** Draws on the reader's own history, e.g. their recent five-star books. */
export interface DynamicSignal {
  category: Open<DynamicSignalCategory>;
  count?: number;
  minRating?: number;
  maxRating?: number;
  weight?: number;
}

export interface VibeFields {
  title?: string;
  description?: string | null;
  privacy?: PrivacySetting;
}

export interface VibeCreate extends VibeFields {
  title: string;
  signals?: VibeSignal[];
  exclusions?: VibeExclusion[];
  dynamicSignals?: DynamicSignal[];
}

/**
 * The API can't list or remove a vibe's existing signals and exclusions yet
 * (spec/06 #25), so updates add them. `dynamicSignals` replaces the whole set.
 */
export interface VibeUpdate extends VibeFields {
  addSignals?: VibeSignal[];
  addExclusions?: VibeExclusion[];
  dynamicSignals?: DynamicSignal[];
}

/** A page of a vibe's books, plus whether those results are current. */
export interface VibeBooks extends Page<BookSummaryFragment> {
  /**
   * True when the site hasn't generated results for this vibe yet, or the vibe
   * changed since. The API can't generate them (spec/06 #26); they appear once
   * the vibe is opened on hardcover.app.
   */
  resultsPending: boolean;
  generatedAt: string | null;
}

const FIELDS_WIRE = { title: "title", description: "description", privacy: "privacy_setting_id" } as const;

function signalToWire(signal: VibeSignal): Record<string, unknown> {
  const base = { signal_type: signal.type, weight: signal.weight };
  if ("value" in signal) return { ...base, value: signal.value };
  if ("id" in signal) return { ...base, value: String(signal.id) };
  if ("text" in signal) return { ...base, value: signal.text };
  return base; // popularity: weight only
}

const exclusionToWire = (exclusion: VibeExclusion) => ({
  excluded_type: exclusion.type === "book" ? "Book" : "Author",
  excluded_id: exclusion.id,
});

const dynamicToWire = (signal: DynamicSignal) =>
  pickDefined(signal, { category: "category", count: "count", minRating: "min_rating", maxRating: "max_rating", weight: "weight" });

function toWire(fields: VibeFields, signals?: VibeSignal[], exclusions?: VibeExclusion[], dynamic?: DynamicSignal[]): VibeInput {
  return {
    ...pickDefined({ title: fields.title, description: fields.description, privacy: fields.privacy }, FIELDS_WIRE),
    ...(signals?.length && { vibe_signals_attributes: signals.map(signalToWire) }),
    ...(exclusions?.length && { vibe_exclusions_attributes: exclusions.map(exclusionToWire) }),
    ...(dynamic && { dynamic_signals: dynamic.map(dynamicToWire) }),
  } as VibeInput;
}

/**
 * Vibes: book-recommendation lists built from signals. The server owns the
 * rules: creating and retuning signals is a Supporter perk; only custom vibes
 * can be renamed, re-described, made public or deleted. Their messages come
 * back as ActionError.
 */
export class VibesResource {
  private readonly client: HardcoverClient;

  constructor(client: HardcoverClient) {
    this.client = client;
  }

  /** Your vibes, most recently changed first. Scopes: `read:me`, `read:vibes`. */
  async mine(options: PageOptions = {}): Promise<Page<Vibe>> {
    return this.forUser(await this.client.me.id(), options);
  }

  /** Someone's vibes that you can see. Scopes: `read:vibes`. */
  async forUser(userId: number, { limit = DEFAULT_LIMIT, offset = 0 }: PageOptions = {}): Promise<Page<Vibe>> {
    const { vibes } = await this.client.request(operations.GetVibesForUser, { userId, limit, offset });
    return toPage(vibes, limit, offset);
  }

  /** Scopes: `read:vibes`. */
  async get(id: number): Promise<Vibe | null> {
    const { vibes_by_pk } = await this.client.request(operations.GetVibe, { id });
    return vibes_by_pk ?? null;
  }

  /**
   * The vibe's books in ranked order, a page at a time, from the results the
   * site generated. Check `resultsPending` before treating an empty page as
   * "no matches". Two requests when there are books to show.
   * Scopes: `read:vibes`, `read:catalog`.
   */
  async books(id: number, { limit = DEFAULT_LIMIT, offset = 0 }: PageOptions = {}): Promise<VibeBooks> {
    const { vibes_by_pk } = await this.client.request(operations.GetVibeBookIds, { id });
    if (!vibes_by_pk) throw new NotFoundError("vibe", id);
    const ids = nonNull(vibes_by_pk.cachedBookIds as (number | null)[] | null);
    const generatedAt = vibes_by_pk.booksGeneratedAt ?? null;
    // Mirrors Vibe#books_stale? (minus its TTL): never generated, empty, or edited since.
    const resultsPending = !generatedAt || ids.length === 0 || Date.parse(generatedAt) < Date.parse(vibes_by_pk.updatedAt);
    const books = await this.client.books.getMany(ids.slice(offset, offset + limit));
    return { ...toPage(books, limit, offset), hasMore: offset + limit < ids.length, resultsPending, generatedAt };
  }

  /** Supporter perk (the server enforces it). Scopes: `write:vibes`. */
  async create({ signals, exclusions, dynamicSignals, ...fields }: VibeCreate): Promise<Vibe> {
    const { insert_vibe } = await this.client.request(operations.CreateVibe, {
      object: toWire(fields, signals, exclusions, dynamicSignals),
    });
    return required(insert_vibe?.vibe, "insert_vibe", "vibe");
  }

  /**
   * Sends only what you pass. Exclusions work for everyone; signals and dynamic
   * signals need Supporter; title, description and privacy only change on
   * custom vibes. Scopes: `write:vibes`.
   */
  async update(id: number, { addSignals, addExclusions, dynamicSignals, ...fields }: VibeUpdate): Promise<Vibe> {
    const { update_vibe } = await this.client.request(operations.UpdateVibe, {
      id,
      object: toWire(fields, addSignals, addExclusions, dynamicSignals),
    });
    return required(update_vibe?.vibe, "update_vibe", "vibe");
  }

  /** Custom vibes only; system vibes always exist. Scopes: `write:vibes`. */
  async delete(id: number): Promise<void> {
    const { delete_vibe } = await this.client.request(operations.DeleteVibe, { id });
    if (!delete_vibe?.success) throw new NotFoundError("vibe", id);
  }
}
