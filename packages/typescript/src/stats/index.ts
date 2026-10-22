// @hardcover/sdk/stats: a reader's stats for a period. A separate entry point,
// so apps that don't show stats don't ship it.
export { period, type StatsPeriod, type TodayOptions } from "./period.ts";
export {
  computeStats,
  type AuthorCount,
  type ContributorRoles,
  type ReadingStats,
  type StatsData,
  type StatsLibraryEntry,
  type TagCount,
} from "./compute.ts";
export { fetchStatsData, readingStats } from "./fetch.ts";
