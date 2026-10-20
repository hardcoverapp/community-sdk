# Teasers

Images of real SDK calls, for the README, docs and posts. Each shows a snippet
exactly as it runs (type-checked against the SDK) and a rendering of what it
returned from the live API on 2026-10-20.

They're illustrative: the SDK returns JSON data, and the covers and cards are
drawn from it for display. Every image says so.

| Image | Shows |
|---|---|
| [prompts.webp](prompts.webp) | `prompts.books`: a community prompt's books, most picked first |
| [import.webp](import.webp) | `books.findByExternalIds`: Goodreads ids to Hardcover books in one request |
| [released.webp](released.webp) | `books.released`: books first released in a week |
| [trending-series.webp](trending-series.webp) | `books.trending`, one book per series via `cachedFeaturedSeries` |
| [search.webp](search.webp) | `search.books`: results ranked by the API |
| [year-in-review.webp](year-in-review.webp) | `reads.finished`: a year of finished reads and pages |
| [ranked.webp](ranked.webp) | `lists.create` and `lists.reorder`: a ranked list in your own order |
| [scan.webp](scan.webp) | `lists.addBooks`: barcode scans to a list by exact ISBN |
| [shelve.webp](shelve.webp) | `library.add`, `setStatus`, `rate`: shelving a book |
| [journal.webp](journal.webp) | `journal.add`: saving a quote |
| [vibes.webp](vibes.webp) | `vibes.create`: a recommendation vibe from weighted signals |

Rendered at 1200 px wide (2x), with the same outer margin on every image; the
height follows the content. WebP keeps them small in the repo.
