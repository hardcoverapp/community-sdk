export { HardcoverClient, type Environment, type HardcoverClientOptions } from "./core/client.ts";
export * from "./core/errors.ts";
export { parseRateLimit, type RateLimitState } from "./core/rate-limit.ts";
export { fetchTransport, TransportFailure, type HttpRequest, type HttpResponse, type Transport } from "./core/transport.ts";
export { operations, operationInfo, type OperationInfo, type OperationKind, type Operations } from "./operations.ts";
export * from "./generated/enums.ts";
export type * from "./generated/graphql.ts";
export { localDate, type OccurredAt } from "./core/dates.ts";
export type { Page, PageOptions } from "./resources/page.ts";
export { MeResource, type Me } from "./resources/me.ts";
export {
  LibraryResource,
  type LibraryEntry,
  type LibraryEntryForBook,
  type LibraryEntryPatch,
  type LibraryEntryWithBook,
  type LibraryListItem,
} from "./resources/library.ts";
export { ReadsResource, type ProgressInput, type Read, type UpdatedRead } from "./resources/reads.ts";
export { ListsResource, type AddBooksResult, type List, type ListBookRow, type ListInput, type ListWithBooks } from "./resources/lists.ts";
export { SearchResource, type RawSearch, type SearchOptions, type SearchResults } from "./resources/search.ts";
export type * from "./resources/search-types.ts";
export { BooksResource, type Book, type BookSummary, type Edition, type EditionWithBook } from "./resources/books.ts";
export { JournalResource, type JournalEntry, type JournalEntryInput, type JournalTag } from "./resources/journal.ts";
export { GoalsResource, goalProgress, type Goal, type GoalFields } from "./resources/goals.ts";
