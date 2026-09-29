/**
 * Searching. Your query goes straight to the API, which owns matching:
 * titles, authors, series, ISBNs from a barcode scanner, and whatever it
 * learns next, with no SDK update needed. The SDK just tidies the response:
 * numeric ids, camelCase keys, and the total count.
 */
import { HardcoverClient, type BookHit } from "@hardcover/sdk";

export async function searchBooks(hc: HardcoverClient) {
  const { hits, found } = await hc.search.books("project hail mary", { perPage: 5 });
  console.log(`${found} matches`);
  for (const book of hits) {
    console.log(book.id, book.title, book.releaseYear, book.authorNames?.join(", "));
  }

  // Every search type has a method: authors, series, characters, lists,
  // prompts, publishers, users.
  const { hits: authors } = await hc.search.authors("andy weir");
  console.log(authors[0]?.name, authors[0]?.booksCount);
}

/** Scan a barcode and put the book on a list: pass the scan straight to search. */
export async function scanToList(hc: HardcoverClient, scanned: string, listId: number) {
  const { hits } = await hc.search.books(scanned); // "978-0-593-13520-4" works as-is
  const book: BookHit | undefined = hits[0];
  if (!book) return console.log("No match. Try the ISBN barcode, usually inside the cover.");
  await hc.lists.addBook(listId, book.id);
  // Scanning a whole shelf? lists.addBooks(listId, codes) matches exact ISBNs
  // in bulk and adds the exact editions (see bulk-scan-to-list.ts).
}

/** Tune matching with the API's own options; anything else, use raw(). */
export async function tunedSearch(hc: HardcoverClient) {
  await hc.search.books("dune", {
    fields: ["title", "author_names"],
    weights: [5, 1],
    sort: "users_count:desc",
    filterBy: "release_year:>1960",
    page: 2,
  });
  const raw = await hc.search.raw("dune"); // untouched, including Typesense's `results`
  console.log(raw.ids);
}
