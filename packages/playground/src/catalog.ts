// Every public SDK method, with the inputs the page builds a form from.
// `run` receives the parsed values and calls the SDK exactly as an app would.
import {
  GoalMetric,
  JournalEvent,
  PrivacySetting,
  ReadingFormat,
  UserBookStatus,
  type HardcoverClient,
  type ProgressInput,
} from "@hardcover/sdk";

export type Field =
  | { kind: "number"; name: string; label: string; required?: boolean; value?: number; hint?: string }
  | { kind: "text"; name: string; label: string; required?: boolean; value?: string; hint?: string }
  | { kind: "lines"; name: string; label: string; required?: boolean; value?: string; hint?: string }
  | { kind: "date"; name: string; label: string; required?: boolean; value?: string; hint?: string }
  | { kind: "datetime"; name: string; label: string; hint?: string }
  | { kind: "checkbox"; name: string; label: string; value?: boolean; hint?: string }
  | { kind: "select"; name: string; label: string; options: { label: string; value: string | number }[]; required?: boolean; value?: string | number; hint?: string };

export type Values = Record<string, string | number | boolean | string[] | undefined>;

export interface Method {
  name: string;
  summary: string;
  fields: Field[];
  /** Changes data on the server. Shown as a text badge. */
  writes?: boolean;
  /** Deletes something; the page asks for confirmation first. */
  destructive?: boolean;
  run: (client: HardcoverClient, values: Values) => Promise<unknown>;
}

export interface Resource {
  name: string;
  methods: Method[];
}

// Enum helpers: readable labels from the SDK's own enums.
const label = (key: string) => key.replace(/([a-z])([A-Z])/g, "$1 $2");
const options = (e: Record<string, string | number>) => Object.entries(e).map(([key, value]) => ({ label: label(key), value }));
const optional = (opts: { label: string; value: string | number }[]) => [{ label: "(not set)", value: "" }, ...opts];

const statuses = options(UserBookStatus);
const privacies = options(PrivacySetting);

const n = (v: Values[string]) => (v === undefined || v === "" ? undefined : Number(v));
const s = (v: Values[string]) => (v === undefined || v === "" ? undefined : String(v));
const list = (v: Values[string]) => (Array.isArray(v) ? v : []);
const nums = (v: Values[string]) => list(v).map(Number).filter((x) => !Number.isNaN(x));

const page = (limit = 25): Field[] => [
  { kind: "number", name: "limit", label: "Limit", value: limit },
  { kind: "number", name: "offset", label: "Offset", value: 0 },
];
const pageOf = (v: Values) => ({ limit: n(v.limit), offset: n(v.offset) });

const bookId = (value = 427578): Field => ({ kind: "number", name: "bookId", label: "Book id", required: true, value, hint: "427578 is Project Hail Mary" });
const id = (name = "id", fieldLabel = "Id"): Field => ({ kind: "number", name, label: fieldLabel, required: true });

const searchMethod = (name: keyof HardcoverClient["search"] & string, example: string): Method => ({
  name,
  summary: `Search ${name}. The query goes to the API unchanged.`,
  fields: [
    { kind: "text", name: "query", label: "Query", required: true, value: example },
    { kind: "number", name: "perPage", label: "Per page", value: 5 },
    { kind: "number", name: "page", label: "Page", value: 1 },
    { kind: "text", name: "sort", label: "Sort", hint: "e.g. users_count:desc" },
    { kind: "text", name: "filterBy", label: "Filter", hint: "e.g. release_year:>2000" },
  ],
  run: (c, v) =>
    (c.search[name] as (q: string, o: object) => Promise<unknown>)(String(v.query), {
      perPage: n(v.perPage),
      page: n(v.page),
      sort: s(v.sort),
      filterBy: s(v.filterBy),
    }),
});

export const catalog: Resource[] = [
  {
    name: "me",
    methods: [
      {
        name: "get",
        summary: "The token's user, cached per client.",
        fields: [{ kind: "checkbox", name: "refresh", label: "Fetch again instead of using the cache" }],
        run: (c, v) => c.me.get({ refresh: Boolean(v.refresh) }),
      },
      { name: "id", summary: "The token's user id.", fields: [], run: (c) => c.me.id() },
    ],
  },
  {
    name: "books",
    methods: [
      { name: "get", summary: "A book with contributors and series, or null.", fields: [bookId()], run: (c, v) => c.books.get(Number(v.bookId)) },
      {
        name: "getBySlug",
        summary: "A book by its slug, or null.",
        fields: [{ kind: "text", name: "slug", label: "Slug", required: true, value: "project-hail-mary" }],
        run: (c, v) => c.books.getBySlug(String(v.slug)),
      },
      {
        name: "getMany",
        summary: "Several books, in the order you list them.",
        fields: [{ kind: "lines", name: "ids", label: "Book ids, one per line", required: true, value: "427578\n386446" }],
        run: (c, v) => c.books.getMany(nums(v.ids)),
      },
      { name: "editions", summary: "A book's editions, most-read first.", fields: [bookId(), ...page(10)], run: (c, v) => c.books.editions(Number(v.bookId), pageOf(v)) },
      {
        name: "findByIsbn",
        summary: "Editions with exactly these ISBNs. Spaces and hyphens are fine.",
        fields: [{ kind: "lines", name: "isbns", label: "ISBNs, one per line", required: true, value: "978-0-593-13520-4" }],
        run: (c, v) => c.books.findByIsbn(list(v.isbns)),
      },
      {
        name: "trending",
        summary: "Trending books, in trending order.",
        fields: [
          {
            kind: "select",
            name: "duration",
            label: "Period",
            value: "month",
            options: ["week", "month", "three_month", "one_year", "all"].map((d) => ({ label: d.replace("_", " "), value: d })),
          },
          ...page(10),
        ],
        run: (c, v) => c.books.trending({ duration: String(v.duration) as "month", ...pageOf(v) }),
      },
    ],
  },
  {
    name: "search",
    methods: [
      searchMethod("books", "project hail mary"),
      searchMethod("authors", "andy weir"),
      searchMethod("series", "stormlight"),
      searchMethod("characters", "rocky"),
      searchMethod("lists", "best"),
      searchMethod("prompts", "favorite"),
      searchMethod("publishers", "penguin"),
      searchMethod("users", "the"),
    ],
  },
  {
    name: "library",
    methods: [
      {
        name: "list",
        summary: "Your shelf, optionally one status.",
        fields: [{ kind: "select", name: "status", label: "Status", options: optional(statuses) }, ...page()],
        run: (c, v) => c.library.list({ status: n(v.status) as UserBookStatus | undefined, ...pageOf(v) }),
      },
      {
        name: "count",
        summary: "How many books are on your shelf.",
        fields: [{ kind: "select", name: "status", label: "Status", options: optional(statuses) }],
        run: (c, v) => c.library.count({ status: n(v.status) as UserBookStatus | undefined }),
      },
      { name: "forBook", summary: "Your entry for a book, or null.", fields: [bookId()], run: (c, v) => c.library.forBook(Number(v.bookId)) },
      { name: "get", summary: "An entry by its id, with book and edition.", fields: [id("id", "Entry id")], run: (c, v) => c.library.get(Number(v.id)) },
      {
        name: "add",
        summary: "Add a book. Marking Read without a date records today in your timezone.",
        writes: true,
        fields: [
          bookId(),
          { kind: "select", name: "status", label: "Status", options: statuses, value: UserBookStatus.WantToRead },
          { kind: "number", name: "editionId", label: "Edition id" },
          { kind: "number", name: "rating", label: "Rating", hint: "0.5 to 5 in half steps" },
          { kind: "select", name: "privacy", label: "Privacy", options: optional(privacies) },
          { kind: "date", name: "date", label: "Date" },
        ],
        run: (c, v) =>
          c.library.add(Number(v.bookId), {
            status: n(v.status) as UserBookStatus,
            editionId: n(v.editionId),
            rating: n(v.rating),
            privacy: n(v.privacy) as PrivacySetting | undefined,
            date: s(v.date),
          }),
      },
      {
        name: "setStatus",
        summary: "Change status. Currently Reading starts a read; Read finishes it.",
        writes: true,
        fields: [
          id("id", "Entry id"),
          { kind: "select", name: "status", label: "Status", options: statuses, value: UserBookStatus.CurrentlyReading },
          { kind: "date", name: "date", label: "Date" },
          { kind: "datetime", name: "occurredAt", label: "When it happened", hint: "Leave empty for now" },
        ],
        run: (c, v) =>
          c.library.setStatus(Number(v.id), n(v.status) as UserBookStatus, {
            date: s(v.date),
            occurredAt: v.occurredAt ? new Date(String(v.occurredAt)) : undefined,
          }),
      },
      {
        name: "rate",
        summary: "Rate 0.5 to 5 in half steps. Leave empty to clear.",
        writes: true,
        fields: [id("id", "Entry id"), { kind: "number", name: "rating", label: "Rating" }],
        run: (c, v) => c.library.rate(Number(v.id), n(v.rating) ?? null),
      },
      {
        name: "update",
        summary: "Change only the fields you fill in.",
        writes: true,
        fields: [
          id("id", "Entry id"),
          { kind: "select", name: "privacy", label: "Privacy", options: optional(privacies) },
          { kind: "text", name: "notes", label: "Private notes" },
          { kind: "text", name: "review", label: "Review", hint: "Needs the write:reviews scope" },
        ],
        run: (c, v) =>
          c.library.update(Number(v.id), {
            privacy: n(v.privacy) as PrivacySetting | undefined,
            notes: s(v.notes),
            review: s(v.review) ? { markdown: s(v.review) } : undefined,
          }),
      },
      { name: "remove", summary: "Take a book off your shelf.", writes: true, destructive: true, fields: [id("id", "Entry id")], run: (c, v) => c.library.remove(Number(v.id)) },
    ],
  },
  {
    name: "reads",
    methods: [
      { name: "list", summary: "Every read of a library entry, newest first.", fields: [id("userBookId", "Entry id")], run: (c, v) => c.reads.list(Number(v.userBookId)) },
      { name: "current", summary: "The read in progress, or null.", fields: [id("userBookId", "Entry id")], run: (c, v) => c.reads.current(Number(v.userBookId)) },
      {
        name: "setProgress",
        summary: "Progress on the read in progress. 100% finishes the book.",
        writes: true,
        fields: [
          id("userBookId", "Entry id"),
          {
            kind: "select",
            name: "unit",
            label: "Unit",
            value: "pages",
            options: [
              { label: "Pages", value: "pages" },
              { label: "Percent", value: "percent" },
              { label: "Seconds (audiobook)", value: "seconds" },
            ],
          },
          { kind: "number", name: "amount", label: "Amount", required: true },
          { kind: "datetime", name: "occurredAt", label: "When it happened", hint: "Leave empty for now" },
        ],
        run: (c, v) =>
          c.reads.setProgress(Number(v.userBookId), {
            [String(v.unit)]: Number(v.amount),
            occurredAt: v.occurredAt ? new Date(String(v.occurredAt)) : undefined,
          } as unknown as ProgressInput),
      },
    ],
  },
  {
    name: "journal",
    methods: [
      { name: "forBook", summary: "Your journal for a book, newest first.", fields: [bookId(), ...page()], run: (c, v) => c.journal.forBook(Number(v.bookId), pageOf(v)) },
      {
        name: "add",
        summary: "Add an entry. The server already journals status, progress, ratings and reviews.",
        writes: true,
        fields: [
          bookId(),
          { kind: "select", name: "event", label: "Event", options: options(JournalEvent), value: JournalEvent.Note },
          { kind: "text", name: "entry", label: "Entry", value: "The Rocky chapters are the best part." },
          { kind: "select", name: "privacy", label: "Privacy", options: optional(privacies), hint: "Defaults to your account setting" },
          { kind: "date", name: "date", label: "Day" },
        ],
        run: (c, v) =>
          c.journal.add(Number(v.bookId), {
            event: String(v.event) as JournalEvent,
            entry: s(v.entry),
            privacy: n(v.privacy) as PrivacySetting | undefined,
            date: s(v.date),
          }),
      },
      {
        name: "update",
        summary: "Change an entry's text.",
        writes: true,
        fields: [id("id", "Entry id"), { kind: "text", name: "entry", label: "Entry", required: true }],
        run: (c, v) => c.journal.update(Number(v.id), { entry: s(v.entry) }),
      },
      { name: "delete", summary: "Delete one entry.", writes: true, destructive: true, fields: [id("id", "Entry id")], run: (c, v) => c.journal.delete(Number(v.id)) },
      {
        name: "clearForBook",
        summary: "Delete every entry for a book, including the server's.",
        writes: true,
        destructive: true,
        fields: [bookId()],
        run: (c, v) => c.journal.clearForBook(Number(v.bookId)),
      },
    ],
  },
  {
    name: "lists",
    methods: [
      { name: "mine", summary: "Your lists.", fields: page(), run: (c, v) => c.lists.mine(pageOf(v)) },
      { name: "forUser", summary: "Someone's lists that you can see.", fields: [id("userId", "User id"), ...page()], run: (c, v) => c.lists.forUser(Number(v.userId), pageOf(v)) },
      { name: "get", summary: "A list with a page of its books, or null.", fields: [id("id", "List id"), ...page(50)], run: (c, v) => c.lists.get(Number(v.id), pageOf(v)) },
      {
        name: "create",
        summary: "Make a list.",
        writes: true,
        fields: [
          { kind: "text", name: "name", label: "Name", required: true, value: "Playground list" },
          { kind: "text", name: "description", label: "Description" },
          { kind: "select", name: "privacy", label: "Privacy", options: privacies, value: PrivacySetting.Private },
          { kind: "checkbox", name: "ranked", label: "Ranked" },
        ],
        run: (c, v) =>
          c.lists.create({ name: String(v.name), description: s(v.description), privacy: n(v.privacy) as PrivacySetting, ranked: Boolean(v.ranked) }),
      },
      {
        name: "update",
        summary: "Change only the fields you fill in.",
        writes: true,
        fields: [id("id", "List id"), { kind: "text", name: "name", label: "Name" }, { kind: "text", name: "description", label: "Description" }],
        run: (c, v) => c.lists.update(Number(v.id), { name: s(v.name), description: s(v.description) }),
      },
      { name: "delete", summary: "Delete a list.", writes: true, destructive: true, fields: [id("id", "List id")], run: (c, v) => c.lists.delete(Number(v.id)) },
      {
        name: "addBook",
        summary: "Add one book. Adding it again is harmless.",
        writes: true,
        fields: [id("listId", "List id"), bookId(), { kind: "number", name: "editionId", label: "Edition id" }],
        run: (c, v) => c.lists.addBook(Number(v.listId), Number(v.bookId), { editionId: n(v.editionId) }),
      },
      {
        name: "addBooks",
        summary: "Bulk add by exact ISBN, as from a shelf of barcode scans.",
        writes: true,
        fields: [
          id("listId", "List id"),
          { kind: "lines", name: "codes", label: "Scanned codes, one per line", required: true, value: "978-0-593-13520-4\n071612345678" },
        ],
        run: (c, v) => c.lists.addBooks(Number(v.listId), list(v.codes)),
      },
      {
        name: "removeBook",
        summary: "Take a book off a list.",
        writes: true,
        destructive: true,
        fields: [id("listId", "List id"), bookId()],
        run: (c, v) => c.lists.removeBook(Number(v.listId), Number(v.bookId)),
      },
    ],
  },
  {
    name: "goals",
    methods: [
      {
        name: "list",
        summary: "Your reading goals.",
        fields: [{ kind: "checkbox", name: "includeArchived", label: "Include archived" }],
        run: (c, v) => c.goals.list({ includeArchived: Boolean(v.includeArchived) }),
      },
      { name: "get", summary: "A goal, or null.", fields: [id("id", "Goal id")], run: (c, v) => c.goals.get(Number(v.id)) },
      {
        name: "create",
        summary: "Set a goal. Progress is calculated by the server.",
        writes: true,
        fields: [
          { kind: "select", name: "metric", label: "Metric", options: options(GoalMetric), value: GoalMetric.Book },
          { kind: "number", name: "goal", label: "Target", required: true, value: 50 },
          { kind: "text", name: "description", label: "Description", required: true, value: "50 books this year" },
          { kind: "date", name: "startDate", label: "Start", required: true, value: `${new Date().getFullYear()}-01-01` },
          { kind: "date", name: "endDate", label: "End", required: true, value: `${new Date().getFullYear()}-12-31` },
          { kind: "select", name: "privacy", label: "Privacy", options: optional(privacies) },
          { kind: "select", name: "format", label: "Only this format", options: optional(options(ReadingFormat)) },
        ],
        run: (c, v) =>
          c.goals.create({
            metric: String(v.metric) as GoalMetric,
            goal: Number(v.goal),
            description: String(v.description),
            startDate: String(v.startDate),
            endDate: String(v.endDate),
            privacy: n(v.privacy) as PrivacySetting | undefined,
            conditions: n(v.format) ? { readingFormatId: n(v.format) } : undefined,
          }),
      },
      {
        name: "update",
        summary: "Change the target; everything else stays.",
        writes: true,
        fields: [id("id", "Goal id"), { kind: "number", name: "goal", label: "Target", required: true }],
        run: (c, v) => c.goals.update(Number(v.id), { goal: Number(v.goal) }),
      },
      { name: "archive", summary: "Hide a goal from the default list.", writes: true, fields: [id("id", "Goal id")], run: (c, v) => c.goals.archive(Number(v.id)) },
      { name: "unarchive", summary: "Bring an archived goal back.", writes: true, fields: [id("id", "Goal id")], run: (c, v) => c.goals.unarchive(Number(v.id)) },
      { name: "refreshProgress", summary: "Ask the server to recalculate progress.", writes: true, fields: [id("id", "Goal id")], run: (c, v) => c.goals.refreshProgress(Number(v.id)) },
      { name: "delete", summary: "Delete a goal.", writes: true, destructive: true, fields: [id("id", "Goal id")], run: (c, v) => c.goals.delete(Number(v.id)) },
    ],
  },
];
