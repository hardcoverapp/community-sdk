/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type BasicTag = {
  category: string;
  spoiler: boolean;
  tag: string;
};

export type DatesReadInput = {
  action?: string | null | undefined;
  action_at?: string | null | undefined;
  edition_id?: number | null | undefined;
  finished_at?: string | null | undefined;
  finished_at_precision?: number | null | undefined;
  id?: number | null | undefined;
  progress_pages?: number | null | undefined;
  progress_seconds?: number | null | undefined;
  started_at?: string | null | undefined;
};

export type GoalConditionInput = {
  authorBipoc?: number | null | undefined;
  authorGenderIds?: Array<number | null | undefined> | null | undefined;
  authorLgbtqia?: number | null | undefined;
  bookCategoryIds?: Array<number | null | undefined> | null | undefined;
  readingFormatId?: number | null | undefined;
};

export type GoalInput = {
  archived?: boolean | null | undefined;
  conditions: GoalConditionInput;
  description: string;
  end_date: string;
  goal: number;
  metric: string;
  privacy_setting_id?: number | null | undefined;
  start_date: string;
};

export type ListBookInput = {
  book_id: number;
  edition_id?: number | null | undefined;
  list_id: number;
  position?: number | null | undefined;
};

export type ListInput = {
  default_view?: string | null | undefined;
  description?: string | null | undefined;
  featured_profile?: boolean | null | undefined;
  name?: string | null | undefined;
  privacy_setting_id?: number | null | undefined;
  ranked?: boolean | null | undefined;
  url?: string | null | undefined;
};

export type ReadingJournalCreateType = {
  action_at?: string | null | undefined;
  book_id: number;
  edition_id?: number | null | undefined;
  entry?: string | null | undefined;
  event: string;
  metadata?: unknown;
  privacy_setting_id: number;
  tags: Array<BasicTag | null | undefined>;
};

export type ReadingJournalUpdateType = {
  action_at?: string | null | undefined;
  edition_id?: number | null | undefined;
  entry?: string | null | undefined;
  event?: string | null | undefined;
  metadata?: unknown;
  privacy_setting_id?: number | null | undefined;
  tags?: Array<BasicTag | null | undefined> | null | undefined;
};

export type TrendingDuration =
  | 'all'
  | 'month'
  | 'one_year'
  | 'three_month'
  | 'week';

export type UserBookCreateInput = {
  action_at?: string | null | undefined;
  book_id: number;
  date_added?: string | null | undefined;
  edition_id?: number | null | undefined;
  finished_at_precision?: number | null | undefined;
  first_started_reading_date?: string | null | undefined;
  last_read_date?: string | null | undefined;
  media_url?: string | null | undefined;
  privacy_setting_id?: number | null | undefined;
  private_notes?: string | null | undefined;
  rating?: number | null | undefined;
  read_count?: number | null | undefined;
  recommended_by?: string | null | undefined;
  recommended_for?: string | null | undefined;
  referrer_user_id?: number | null | undefined;
  review_has_spoilers?: boolean | null | undefined;
  review_markdown?: string | null | undefined;
  review_slate?: unknown;
  reviewed_at?: string | null | undefined;
  sponsored_review?: boolean | null | undefined;
  status_id?: number | null | undefined;
  url?: string | null | undefined;
  user_date?: string | null | undefined;
  user_start_date?: string | null | undefined;
};

export type UserBookUpdateInput = {
  action_at?: string | null | undefined;
  date_added?: string | null | undefined;
  edition_id?: number | null | undefined;
  finished_at_precision?: number | null | undefined;
  first_started_reading_date?: string | null | undefined;
  last_read_date?: string | null | undefined;
  media_url?: string | null | undefined;
  privacy_setting_id?: number | null | undefined;
  private_notes?: string | null | undefined;
  rating?: number | null | undefined;
  read_count?: number | null | undefined;
  recommended_by?: string | null | undefined;
  recommended_for?: string | null | undefined;
  referrer_user_id?: number | null | undefined;
  review_has_spoilers?: boolean | null | undefined;
  review_markdown?: string | null | undefined;
  review_slate?: unknown;
  reviewed_at?: string | null | undefined;
  sponsored_review?: boolean | null | undefined;
  status_id?: number | null | undefined;
  url?: string | null | undefined;
  user_date?: string | null | undefined;
  user_start_date?: string | null | undefined;
};

/** order by aggregate values of table "activities" */
export type Activities_Aggregate_Order_By = {
  avg?: Activities_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Activities_Max_Order_By | null | undefined;
  min?: Activities_Min_Order_By | null | undefined;
  stddev?: Activities_Stddev_Order_By | null | undefined;
  stddev_pop?: Activities_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Activities_Stddev_Samp_Order_By | null | undefined;
  sum?: Activities_Sum_Order_By | null | undefined;
  var_pop?: Activities_Var_Pop_Order_By | null | undefined;
  var_samp?: Activities_Var_Samp_Order_By | null | undefined;
  variance?: Activities_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "activities" */
export type Activities_Avg_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "activities" */
export type Activities_Max_Order_By = {
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  event?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  uid?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "activities" */
export type Activities_Min_Order_By = {
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  event?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  uid?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "activities" */
export type Activities_Stddev_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "activities" */
export type Activities_Stddev_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "activities" */
export type Activities_Stddev_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "activities" */
export type Activities_Sum_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "activities" */
export type Activities_Var_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "activities" */
export type Activities_Var_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "activities" */
export type Activities_Variance_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "authors" */
export type Authors_Aggregate_Order_By = {
  avg?: Authors_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Authors_Max_Order_By | null | undefined;
  min?: Authors_Min_Order_By | null | undefined;
  stddev?: Authors_Stddev_Order_By | null | undefined;
  stddev_pop?: Authors_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Authors_Stddev_Samp_Order_By | null | undefined;
  sum?: Authors_Sum_Order_By | null | undefined;
  var_pop?: Authors_Var_Pop_Order_By | null | undefined;
  var_samp?: Authors_Var_Samp_Order_By | null | undefined;
  variance?: Authors_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "authors" */
export type Authors_Avg_Order_By = {
  alias_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  born_year?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  death_year?: Order_By | null | undefined;
  gender_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by max() on columns of table "authors" */
export type Authors_Max_Order_By = {
  alias_id?: Order_By | null | undefined;
  bio?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  born_date?: Order_By | null | undefined;
  born_year?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  death_date?: Order_By | null | undefined;
  death_year?: Order_By | null | undefined;
  gender_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  location?: Order_By | null | undefined;
  name?: Order_By | null | undefined;
  name_personal?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  slug?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  title?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by min() on columns of table "authors" */
export type Authors_Min_Order_By = {
  alias_id?: Order_By | null | undefined;
  bio?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  born_date?: Order_By | null | undefined;
  born_year?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  death_date?: Order_By | null | undefined;
  death_year?: Order_By | null | undefined;
  gender_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  location?: Order_By | null | undefined;
  name?: Order_By | null | undefined;
  name_personal?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  slug?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  title?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "authors". */
export type Authors_Order_By = {
  alias_aggregate?: Authors_Aggregate_Order_By | null | undefined;
  alias_id?: Order_By | null | undefined;
  alternate_names?: Order_By | null | undefined;
  bio?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  born_date?: Order_By | null | undefined;
  born_year?: Order_By | null | undefined;
  cached_image?: Order_By | null | undefined;
  canonical?: Authors_Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  contributions_aggregate?: Contributions_Aggregate_Order_By | null | undefined;
  creator?: Users_Order_By | null | undefined;
  death_date?: Order_By | null | undefined;
  death_year?: Order_By | null | undefined;
  gender_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  identifiers?: Order_By | null | undefined;
  image?: Images_Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  is_bipoc?: Order_By | null | undefined;
  is_lgbtq?: Order_By | null | undefined;
  links?: Order_By | null | undefined;
  location?: Order_By | null | undefined;
  locked?: Order_By | null | undefined;
  name?: Order_By | null | undefined;
  name_personal?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  slug?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  title?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "authors" */
export type Authors_Stddev_Order_By = {
  alias_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  born_year?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  death_year?: Order_By | null | undefined;
  gender_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "authors" */
export type Authors_Stddev_Pop_Order_By = {
  alias_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  born_year?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  death_year?: Order_By | null | undefined;
  gender_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "authors" */
export type Authors_Stddev_Samp_Order_By = {
  alias_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  born_year?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  death_year?: Order_By | null | undefined;
  gender_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by sum() on columns of table "authors" */
export type Authors_Sum_Order_By = {
  alias_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  born_year?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  death_year?: Order_By | null | undefined;
  gender_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "authors" */
export type Authors_Var_Pop_Order_By = {
  alias_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  born_year?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  death_year?: Order_By | null | undefined;
  gender_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "authors" */
export type Authors_Var_Samp_Order_By = {
  alias_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  born_year?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  death_year?: Order_By | null | undefined;
  gender_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by variance() on columns of table "authors" */
export type Authors_Variance_Order_By = {
  alias_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  born_year?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  death_year?: Order_By | null | undefined;
  gender_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by aggregate values of table "book_characters" */
export type Book_Characters_Aggregate_Order_By = {
  avg?: Book_Characters_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Book_Characters_Max_Order_By | null | undefined;
  min?: Book_Characters_Min_Order_By | null | undefined;
  stddev?: Book_Characters_Stddev_Order_By | null | undefined;
  stddev_pop?: Book_Characters_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Book_Characters_Stddev_Samp_Order_By | null | undefined;
  sum?: Book_Characters_Sum_Order_By | null | undefined;
  var_pop?: Book_Characters_Var_Pop_Order_By | null | undefined;
  var_samp?: Book_Characters_Var_Samp_Order_By | null | undefined;
  variance?: Book_Characters_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "book_characters" */
export type Book_Characters_Avg_Order_By = {
  book_id?: Order_By | null | undefined;
  character_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
};

/** order by max() on columns of table "book_characters" */
export type Book_Characters_Max_Order_By = {
  book_id?: Order_By | null | undefined;
  character_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
};

/** order by min() on columns of table "book_characters" */
export type Book_Characters_Min_Order_By = {
  book_id?: Order_By | null | undefined;
  character_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "book_characters" */
export type Book_Characters_Stddev_Order_By = {
  book_id?: Order_By | null | undefined;
  character_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "book_characters" */
export type Book_Characters_Stddev_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  character_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "book_characters" */
export type Book_Characters_Stddev_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  character_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
};

/** order by sum() on columns of table "book_characters" */
export type Book_Characters_Sum_Order_By = {
  book_id?: Order_By | null | undefined;
  character_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "book_characters" */
export type Book_Characters_Var_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  character_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "book_characters" */
export type Book_Characters_Var_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  character_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
};

/** order by variance() on columns of table "book_characters" */
export type Book_Characters_Variance_Order_By = {
  book_id?: Order_By | null | undefined;
  character_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
};

/** order by aggregate values of table "book_mappings" */
export type Book_Mappings_Aggregate_Order_By = {
  avg?: Book_Mappings_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Book_Mappings_Max_Order_By | null | undefined;
  min?: Book_Mappings_Min_Order_By | null | undefined;
  stddev?: Book_Mappings_Stddev_Order_By | null | undefined;
  stddev_pop?: Book_Mappings_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Book_Mappings_Stddev_Samp_Order_By | null | undefined;
  sum?: Book_Mappings_Sum_Order_By | null | undefined;
  var_pop?: Book_Mappings_Var_Pop_Order_By | null | undefined;
  var_samp?: Book_Mappings_Var_Samp_Order_By | null | undefined;
  variance?: Book_Mappings_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "book_mappings" */
export type Book_Mappings_Avg_Order_By = {
  attempts?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  external_data_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "book_mappings" */
export type Book_Mappings_Max_Order_By = {
  attempts?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  external_data_id?: Order_By | null | undefined;
  external_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  loaded_at?: Order_By | null | undefined;
  normalized_at?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  verified_at?: Order_By | null | undefined;
};

/** order by min() on columns of table "book_mappings" */
export type Book_Mappings_Min_Order_By = {
  attempts?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  external_data_id?: Order_By | null | undefined;
  external_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  loaded_at?: Order_By | null | undefined;
  normalized_at?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  verified_at?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "book_mappings" */
export type Book_Mappings_Stddev_Order_By = {
  attempts?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  external_data_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "book_mappings" */
export type Book_Mappings_Stddev_Pop_Order_By = {
  attempts?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  external_data_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "book_mappings" */
export type Book_Mappings_Stddev_Samp_Order_By = {
  attempts?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  external_data_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "book_mappings" */
export type Book_Mappings_Sum_Order_By = {
  attempts?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  external_data_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "book_mappings" */
export type Book_Mappings_Var_Pop_Order_By = {
  attempts?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  external_data_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "book_mappings" */
export type Book_Mappings_Var_Samp_Order_By = {
  attempts?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  external_data_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "book_mappings" */
export type Book_Mappings_Variance_Order_By = {
  attempts?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  external_data_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "book_series" */
export type Book_Series_Aggregate_Order_By = {
  avg?: Book_Series_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Book_Series_Max_Order_By | null | undefined;
  min?: Book_Series_Min_Order_By | null | undefined;
  stddev?: Book_Series_Stddev_Order_By | null | undefined;
  stddev_pop?: Book_Series_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Book_Series_Stddev_Samp_Order_By | null | undefined;
  sum?: Book_Series_Sum_Order_By | null | undefined;
  var_pop?: Book_Series_Var_Pop_Order_By | null | undefined;
  var_samp?: Book_Series_Var_Samp_Order_By | null | undefined;
  variance?: Book_Series_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "book_series" */
export type Book_Series_Avg_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  series_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "book_series" */
export type Book_Series_Max_Order_By = {
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  details?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  series_id?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
};

/** order by min() on columns of table "book_series" */
export type Book_Series_Min_Order_By = {
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  details?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  series_id?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "book_series". */
export type Book_Series_Order_By = {
  book?: Books_Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  compilation?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  details?: Order_By | null | undefined;
  featured?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  series?: Series_Order_By | null | undefined;
  series_id?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "book_series" */
export type Book_Series_Stddev_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  series_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "book_series" */
export type Book_Series_Stddev_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  series_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "book_series" */
export type Book_Series_Stddev_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  series_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "book_series" */
export type Book_Series_Sum_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  series_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "book_series" */
export type Book_Series_Var_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  series_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "book_series" */
export type Book_Series_Var_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  series_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "book_series" */
export type Book_Series_Variance_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  series_id?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "book_statuses". */
export type Book_Statuses_Order_By = {
  books_aggregate?: Books_Aggregate_Order_By | null | undefined;
  id?: Order_By | null | undefined;
  name?: Order_By | null | undefined;
};

/** order by aggregate values of table "books" */
export type Books_Aggregate_Order_By = {
  avg?: Books_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Books_Max_Order_By | null | undefined;
  min?: Books_Min_Order_By | null | undefined;
  stddev?: Books_Stddev_Order_By | null | undefined;
  stddev_pop?: Books_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Books_Stddev_Samp_Order_By | null | undefined;
  sum?: Books_Sum_Order_By | null | undefined;
  var_pop?: Books_Var_Pop_Order_By | null | undefined;
  var_samp?: Books_Var_Samp_Order_By | null | undefined;
  variance?: Books_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "books" */
export type Books_Avg_Order_By = {
  activities_count?: Order_By | null | undefined;
  audio_seconds?: Order_By | null | undefined;
  book_category_id?: Order_By | null | undefined;
  book_status_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  default_audio_edition_id?: Order_By | null | undefined;
  default_cover_edition_id?: Order_By | null | undefined;
  default_ebook_edition_id?: Order_By | null | undefined;
  default_physical_edition_id?: Order_By | null | undefined;
  editions_count?: Order_By | null | undefined;
  featured_book_series_id?: Order_By | null | undefined;
  header_image_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  import_platform_id?: Order_By | null | undefined;
  journals_count?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  literary_type_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  parent_book_id?: Order_By | null | undefined;
  prompts_count?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  ratings_count?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  reviews_count?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by max() on columns of table "books" */
export type Books_Max_Order_By = {
  activities_count?: Order_By | null | undefined;
  audio_seconds?: Order_By | null | undefined;
  book_category_id?: Order_By | null | undefined;
  book_status_id?: Order_By | null | undefined;
  cached_similar_books_updated_at?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  default_audio_edition_id?: Order_By | null | undefined;
  default_cover_edition_id?: Order_By | null | undefined;
  default_ebook_edition_id?: Order_By | null | undefined;
  default_physical_edition_id?: Order_By | null | undefined;
  description?: Order_By | null | undefined;
  editions_count?: Order_By | null | undefined;
  featured_book_series_id?: Order_By | null | undefined;
  header_image_id?: Order_By | null | undefined;
  headline?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  import_platform_id?: Order_By | null | undefined;
  journals_count?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  literary_type_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  parent_book_id?: Order_By | null | undefined;
  prompts_count?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  ratings_count?: Order_By | null | undefined;
  release_date?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  reviews_count?: Order_By | null | undefined;
  slug?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  subtitle?: Order_By | null | undefined;
  title?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by min() on columns of table "books" */
export type Books_Min_Order_By = {
  activities_count?: Order_By | null | undefined;
  audio_seconds?: Order_By | null | undefined;
  book_category_id?: Order_By | null | undefined;
  book_status_id?: Order_By | null | undefined;
  cached_similar_books_updated_at?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  default_audio_edition_id?: Order_By | null | undefined;
  default_cover_edition_id?: Order_By | null | undefined;
  default_ebook_edition_id?: Order_By | null | undefined;
  default_physical_edition_id?: Order_By | null | undefined;
  description?: Order_By | null | undefined;
  editions_count?: Order_By | null | undefined;
  featured_book_series_id?: Order_By | null | undefined;
  header_image_id?: Order_By | null | undefined;
  headline?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  import_platform_id?: Order_By | null | undefined;
  journals_count?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  literary_type_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  parent_book_id?: Order_By | null | undefined;
  prompts_count?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  ratings_count?: Order_By | null | undefined;
  release_date?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  reviews_count?: Order_By | null | undefined;
  slug?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  subtitle?: Order_By | null | undefined;
  title?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "books". */
export type Books_Order_By = {
  activities_count?: Order_By | null | undefined;
  alternative_titles?: Order_By | null | undefined;
  audio_seconds?: Order_By | null | undefined;
  book_category_id?: Order_By | null | undefined;
  book_characters_aggregate?: Book_Characters_Aggregate_Order_By | null | undefined;
  book_mappings_aggregate?: Book_Mappings_Aggregate_Order_By | null | undefined;
  book_series_aggregate?: Book_Series_Aggregate_Order_By | null | undefined;
  book_status?: Book_Statuses_Order_By | null | undefined;
  book_status_id?: Order_By | null | undefined;
  cached_contributors?: Order_By | null | undefined;
  cached_featured_series?: Order_By | null | undefined;
  cached_header_image?: Order_By | null | undefined;
  cached_image?: Order_By | null | undefined;
  cached_similar_book_ids?: Order_By | null | undefined;
  cached_similar_books_updated_at?: Order_By | null | undefined;
  cached_tags?: Order_By | null | undefined;
  canonical?: Books_Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  collection_import_results_aggregate?: Collection_Import_Results_Aggregate_Order_By | null | undefined;
  compilation?: Order_By | null | undefined;
  contributions_aggregate?: Contributions_Aggregate_Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  default_audio_edition?: Editions_Order_By | null | undefined;
  default_audio_edition_id?: Order_By | null | undefined;
  default_cover_edition?: Editions_Order_By | null | undefined;
  default_cover_edition_id?: Order_By | null | undefined;
  default_ebook_edition?: Editions_Order_By | null | undefined;
  default_ebook_edition_id?: Order_By | null | undefined;
  default_physical_edition?: Editions_Order_By | null | undefined;
  default_physical_edition_id?: Order_By | null | undefined;
  description?: Order_By | null | undefined;
  editions_aggregate?: Editions_Aggregate_Order_By | null | undefined;
  editions_count?: Order_By | null | undefined;
  featured_book_series?: Book_Series_Order_By | null | undefined;
  featured_book_series_id?: Order_By | null | undefined;
  header_image_id?: Order_By | null | undefined;
  headline?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image?: Images_Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  images_aggregate?: Images_Aggregate_Order_By | null | undefined;
  import_platform_id?: Order_By | null | undefined;
  is_partial_book?: Order_By | null | undefined;
  journals_count?: Order_By | null | undefined;
  links?: Order_By | null | undefined;
  list_books_aggregate?: List_Books_Aggregate_Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  literary_type_id?: Order_By | null | undefined;
  locked?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  parent_book?: Books_Order_By | null | undefined;
  parent_book_id?: Order_By | null | undefined;
  prompt_answers_aggregate?: Prompt_Answers_Aggregate_Order_By | null | undefined;
  prompt_summaries_aggregate?: Prompt_Books_Summary_Aggregate_Order_By | null | undefined;
  prompts_count?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  ratings_count?: Order_By | null | undefined;
  ratings_distribution?: Order_By | null | undefined;
  release_date?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  reviews_count?: Order_By | null | undefined;
  slug?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  subtitle?: Order_By | null | undefined;
  taggable_counts_aggregate?: Taggable_Counts_Aggregate_Order_By | null | undefined;
  taggings_aggregate?: Taggings_Aggregate_Order_By | null | undefined;
  title?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  user_books_aggregate?: User_Books_Aggregate_Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "books" */
export type Books_Stddev_Order_By = {
  activities_count?: Order_By | null | undefined;
  audio_seconds?: Order_By | null | undefined;
  book_category_id?: Order_By | null | undefined;
  book_status_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  default_audio_edition_id?: Order_By | null | undefined;
  default_cover_edition_id?: Order_By | null | undefined;
  default_ebook_edition_id?: Order_By | null | undefined;
  default_physical_edition_id?: Order_By | null | undefined;
  editions_count?: Order_By | null | undefined;
  featured_book_series_id?: Order_By | null | undefined;
  header_image_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  import_platform_id?: Order_By | null | undefined;
  journals_count?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  literary_type_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  parent_book_id?: Order_By | null | undefined;
  prompts_count?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  ratings_count?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  reviews_count?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "books" */
export type Books_Stddev_Pop_Order_By = {
  activities_count?: Order_By | null | undefined;
  audio_seconds?: Order_By | null | undefined;
  book_category_id?: Order_By | null | undefined;
  book_status_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  default_audio_edition_id?: Order_By | null | undefined;
  default_cover_edition_id?: Order_By | null | undefined;
  default_ebook_edition_id?: Order_By | null | undefined;
  default_physical_edition_id?: Order_By | null | undefined;
  editions_count?: Order_By | null | undefined;
  featured_book_series_id?: Order_By | null | undefined;
  header_image_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  import_platform_id?: Order_By | null | undefined;
  journals_count?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  literary_type_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  parent_book_id?: Order_By | null | undefined;
  prompts_count?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  ratings_count?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  reviews_count?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "books" */
export type Books_Stddev_Samp_Order_By = {
  activities_count?: Order_By | null | undefined;
  audio_seconds?: Order_By | null | undefined;
  book_category_id?: Order_By | null | undefined;
  book_status_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  default_audio_edition_id?: Order_By | null | undefined;
  default_cover_edition_id?: Order_By | null | undefined;
  default_ebook_edition_id?: Order_By | null | undefined;
  default_physical_edition_id?: Order_By | null | undefined;
  editions_count?: Order_By | null | undefined;
  featured_book_series_id?: Order_By | null | undefined;
  header_image_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  import_platform_id?: Order_By | null | undefined;
  journals_count?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  literary_type_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  parent_book_id?: Order_By | null | undefined;
  prompts_count?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  ratings_count?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  reviews_count?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by sum() on columns of table "books" */
export type Books_Sum_Order_By = {
  activities_count?: Order_By | null | undefined;
  audio_seconds?: Order_By | null | undefined;
  book_category_id?: Order_By | null | undefined;
  book_status_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  default_audio_edition_id?: Order_By | null | undefined;
  default_cover_edition_id?: Order_By | null | undefined;
  default_ebook_edition_id?: Order_By | null | undefined;
  default_physical_edition_id?: Order_By | null | undefined;
  editions_count?: Order_By | null | undefined;
  featured_book_series_id?: Order_By | null | undefined;
  header_image_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  import_platform_id?: Order_By | null | undefined;
  journals_count?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  literary_type_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  parent_book_id?: Order_By | null | undefined;
  prompts_count?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  ratings_count?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  reviews_count?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "books" */
export type Books_Var_Pop_Order_By = {
  activities_count?: Order_By | null | undefined;
  audio_seconds?: Order_By | null | undefined;
  book_category_id?: Order_By | null | undefined;
  book_status_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  default_audio_edition_id?: Order_By | null | undefined;
  default_cover_edition_id?: Order_By | null | undefined;
  default_ebook_edition_id?: Order_By | null | undefined;
  default_physical_edition_id?: Order_By | null | undefined;
  editions_count?: Order_By | null | undefined;
  featured_book_series_id?: Order_By | null | undefined;
  header_image_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  import_platform_id?: Order_By | null | undefined;
  journals_count?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  literary_type_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  parent_book_id?: Order_By | null | undefined;
  prompts_count?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  ratings_count?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  reviews_count?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "books" */
export type Books_Var_Samp_Order_By = {
  activities_count?: Order_By | null | undefined;
  audio_seconds?: Order_By | null | undefined;
  book_category_id?: Order_By | null | undefined;
  book_status_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  default_audio_edition_id?: Order_By | null | undefined;
  default_cover_edition_id?: Order_By | null | undefined;
  default_ebook_edition_id?: Order_By | null | undefined;
  default_physical_edition_id?: Order_By | null | undefined;
  editions_count?: Order_By | null | undefined;
  featured_book_series_id?: Order_By | null | undefined;
  header_image_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  import_platform_id?: Order_By | null | undefined;
  journals_count?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  literary_type_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  parent_book_id?: Order_By | null | undefined;
  prompts_count?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  ratings_count?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  reviews_count?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by variance() on columns of table "books" */
export type Books_Variance_Order_By = {
  activities_count?: Order_By | null | undefined;
  audio_seconds?: Order_By | null | undefined;
  book_category_id?: Order_By | null | undefined;
  book_status_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  default_audio_edition_id?: Order_By | null | undefined;
  default_cover_edition_id?: Order_By | null | undefined;
  default_ebook_edition_id?: Order_By | null | undefined;
  default_physical_edition_id?: Order_By | null | undefined;
  editions_count?: Order_By | null | undefined;
  featured_book_series_id?: Order_By | null | undefined;
  header_image_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  import_platform_id?: Order_By | null | undefined;
  journals_count?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  literary_type_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  parent_book_id?: Order_By | null | undefined;
  prompts_count?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  ratings_count?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  reviews_count?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by aggregate values of table "collection_import_results" */
export type Collection_Import_Results_Aggregate_Order_By = {
  avg?: Collection_Import_Results_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Collection_Import_Results_Max_Order_By | null | undefined;
  min?: Collection_Import_Results_Min_Order_By | null | undefined;
  stddev?: Collection_Import_Results_Stddev_Order_By | null | undefined;
  stddev_pop?: Collection_Import_Results_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Collection_Import_Results_Stddev_Samp_Order_By | null | undefined;
  sum?: Collection_Import_Results_Sum_Order_By | null | undefined;
  var_pop?: Collection_Import_Results_Var_Pop_Order_By | null | undefined;
  var_samp?: Collection_Import_Results_Var_Samp_Order_By | null | undefined;
  variance?: Collection_Import_Results_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "collection_import_results" */
export type Collection_Import_Results_Avg_Order_By = {
  book_id?: Order_By | null | undefined;
  collection_import_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  report?: Order_By | null | undefined;
};

/** order by max() on columns of table "collection_import_results" */
export type Collection_Import_Results_Max_Order_By = {
  author?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  collection_import_id?: Order_By | null | undefined;
  error?: Order_By | null | undefined;
  external_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  report?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  title?: Order_By | null | undefined;
};

/** order by min() on columns of table "collection_import_results" */
export type Collection_Import_Results_Min_Order_By = {
  author?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  collection_import_id?: Order_By | null | undefined;
  error?: Order_By | null | undefined;
  external_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  report?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  title?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "collection_import_results" */
export type Collection_Import_Results_Stddev_Order_By = {
  book_id?: Order_By | null | undefined;
  collection_import_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  report?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "collection_import_results" */
export type Collection_Import_Results_Stddev_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  collection_import_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  report?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "collection_import_results" */
export type Collection_Import_Results_Stddev_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  collection_import_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  report?: Order_By | null | undefined;
};

/** order by sum() on columns of table "collection_import_results" */
export type Collection_Import_Results_Sum_Order_By = {
  book_id?: Order_By | null | undefined;
  collection_import_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  report?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "collection_import_results" */
export type Collection_Import_Results_Var_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  collection_import_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  report?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "collection_import_results" */
export type Collection_Import_Results_Var_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  collection_import_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  report?: Order_By | null | undefined;
};

/** order by variance() on columns of table "collection_import_results" */
export type Collection_Import_Results_Variance_Order_By = {
  book_id?: Order_By | null | undefined;
  collection_import_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  report?: Order_By | null | undefined;
};

/** order by aggregate values of table "collection_imports" */
export type Collection_Imports_Aggregate_Order_By = {
  avg?: Collection_Imports_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Collection_Imports_Max_Order_By | null | undefined;
  min?: Collection_Imports_Min_Order_By | null | undefined;
  stddev?: Collection_Imports_Stddev_Order_By | null | undefined;
  stddev_pop?: Collection_Imports_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Collection_Imports_Stddev_Samp_Order_By | null | undefined;
  sum?: Collection_Imports_Sum_Order_By | null | undefined;
  var_pop?: Collection_Imports_Var_Pop_Order_By | null | undefined;
  var_samp?: Collection_Imports_Var_Samp_Order_By | null | undefined;
  variance?: Collection_Imports_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "collection_imports" */
export type Collection_Imports_Avg_Order_By = {
  failure_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
  processed_count?: Order_By | null | undefined;
  reimport_count?: Order_By | null | undefined;
  success_count?: Order_By | null | undefined;
  tag_resolution?: Order_By | null | undefined;
  total_count?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "collection_imports" */
export type Collection_Imports_Max_Order_By = {
  completed_at?: Order_By | null | undefined;
  contents_key?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  current_book?: Order_By | null | undefined;
  error_message?: Order_By | null | undefined;
  failure_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
  processed_count?: Order_By | null | undefined;
  reimport_count?: Order_By | null | undefined;
  started_at?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  success_count?: Order_By | null | undefined;
  tag_resolution?: Order_By | null | undefined;
  total_count?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "collection_imports" */
export type Collection_Imports_Min_Order_By = {
  completed_at?: Order_By | null | undefined;
  contents_key?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  current_book?: Order_By | null | undefined;
  error_message?: Order_By | null | undefined;
  failure_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
  processed_count?: Order_By | null | undefined;
  reimport_count?: Order_By | null | undefined;
  started_at?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  success_count?: Order_By | null | undefined;
  tag_resolution?: Order_By | null | undefined;
  total_count?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "collection_imports" */
export type Collection_Imports_Stddev_Order_By = {
  failure_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
  processed_count?: Order_By | null | undefined;
  reimport_count?: Order_By | null | undefined;
  success_count?: Order_By | null | undefined;
  tag_resolution?: Order_By | null | undefined;
  total_count?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "collection_imports" */
export type Collection_Imports_Stddev_Pop_Order_By = {
  failure_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
  processed_count?: Order_By | null | undefined;
  reimport_count?: Order_By | null | undefined;
  success_count?: Order_By | null | undefined;
  tag_resolution?: Order_By | null | undefined;
  total_count?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "collection_imports" */
export type Collection_Imports_Stddev_Samp_Order_By = {
  failure_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
  processed_count?: Order_By | null | undefined;
  reimport_count?: Order_By | null | undefined;
  success_count?: Order_By | null | undefined;
  tag_resolution?: Order_By | null | undefined;
  total_count?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "collection_imports" */
export type Collection_Imports_Sum_Order_By = {
  failure_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
  processed_count?: Order_By | null | undefined;
  reimport_count?: Order_By | null | undefined;
  success_count?: Order_By | null | undefined;
  tag_resolution?: Order_By | null | undefined;
  total_count?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "collection_imports" */
export type Collection_Imports_Var_Pop_Order_By = {
  failure_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
  processed_count?: Order_By | null | undefined;
  reimport_count?: Order_By | null | undefined;
  success_count?: Order_By | null | undefined;
  tag_resolution?: Order_By | null | undefined;
  total_count?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "collection_imports" */
export type Collection_Imports_Var_Samp_Order_By = {
  failure_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
  processed_count?: Order_By | null | undefined;
  reimport_count?: Order_By | null | undefined;
  success_count?: Order_By | null | undefined;
  tag_resolution?: Order_By | null | undefined;
  total_count?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "collection_imports" */
export type Collection_Imports_Variance_Order_By = {
  failure_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  platform_id?: Order_By | null | undefined;
  processed_count?: Order_By | null | undefined;
  reimport_count?: Order_By | null | undefined;
  success_count?: Order_By | null | undefined;
  tag_resolution?: Order_By | null | undefined;
  total_count?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "contributions" */
export type Contributions_Aggregate_Order_By = {
  avg?: Contributions_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Contributions_Max_Order_By | null | undefined;
  min?: Contributions_Min_Order_By | null | undefined;
  stddev?: Contributions_Stddev_Order_By | null | undefined;
  stddev_pop?: Contributions_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Contributions_Stddev_Samp_Order_By | null | undefined;
  sum?: Contributions_Sum_Order_By | null | undefined;
  var_pop?: Contributions_Var_Pop_Order_By | null | undefined;
  var_samp?: Contributions_Var_Samp_Order_By | null | undefined;
  variance?: Contributions_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "contributions" */
export type Contributions_Avg_Order_By = {
  author_id?: Order_By | null | undefined;
  contributable_id?: Order_By | null | undefined;
  contributor_role_id?: Order_By | null | undefined;
  contributor_specialization_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
};

/** order by max() on columns of table "contributions" */
export type Contributions_Max_Order_By = {
  author_id?: Order_By | null | undefined;
  contributable_id?: Order_By | null | undefined;
  contributable_type?: Order_By | null | undefined;
  contribution?: Order_By | null | undefined;
  contributor_role_id?: Order_By | null | undefined;
  contributor_specialization_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
};

/** order by min() on columns of table "contributions" */
export type Contributions_Min_Order_By = {
  author_id?: Order_By | null | undefined;
  contributable_id?: Order_By | null | undefined;
  contributable_type?: Order_By | null | undefined;
  contribution?: Order_By | null | undefined;
  contributor_role_id?: Order_By | null | undefined;
  contributor_specialization_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "contributions" */
export type Contributions_Stddev_Order_By = {
  author_id?: Order_By | null | undefined;
  contributable_id?: Order_By | null | undefined;
  contributor_role_id?: Order_By | null | undefined;
  contributor_specialization_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "contributions" */
export type Contributions_Stddev_Pop_Order_By = {
  author_id?: Order_By | null | undefined;
  contributable_id?: Order_By | null | undefined;
  contributor_role_id?: Order_By | null | undefined;
  contributor_specialization_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "contributions" */
export type Contributions_Stddev_Samp_Order_By = {
  author_id?: Order_By | null | undefined;
  contributable_id?: Order_By | null | undefined;
  contributor_role_id?: Order_By | null | undefined;
  contributor_specialization_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "contributions" */
export type Contributions_Sum_Order_By = {
  author_id?: Order_By | null | undefined;
  contributable_id?: Order_By | null | undefined;
  contributor_role_id?: Order_By | null | undefined;
  contributor_specialization_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "contributions" */
export type Contributions_Var_Pop_Order_By = {
  author_id?: Order_By | null | undefined;
  contributable_id?: Order_By | null | undefined;
  contributor_role_id?: Order_By | null | undefined;
  contributor_specialization_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "contributions" */
export type Contributions_Var_Samp_Order_By = {
  author_id?: Order_By | null | undefined;
  contributable_id?: Order_By | null | undefined;
  contributor_role_id?: Order_By | null | undefined;
  contributor_specialization_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "contributions" */
export type Contributions_Variance_Order_By = {
  author_id?: Order_By | null | undefined;
  contributable_id?: Order_By | null | undefined;
  contributor_role_id?: Order_By | null | undefined;
  contributor_specialization_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "countries". */
export type Countries_Order_By = {
  code2?: Order_By | null | undefined;
  code3?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  editions_aggregate?: Editions_Aggregate_Order_By | null | undefined;
  id?: Order_By | null | undefined;
  intermediate_region?: Order_By | null | undefined;
  intermediate_region_code?: Order_By | null | undefined;
  iso_3166?: Order_By | null | undefined;
  name?: Order_By | null | undefined;
  phone_code?: Order_By | null | undefined;
  region?: Order_By | null | undefined;
  region_code?: Order_By | null | undefined;
  sub_region?: Order_By | null | undefined;
  sub_region_code?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
};

/** order by aggregate values of table "editions" */
export type Editions_Aggregate_Order_By = {
  avg?: Editions_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Editions_Max_Order_By | null | undefined;
  min?: Editions_Min_Order_By | null | undefined;
  stddev?: Editions_Stddev_Order_By | null | undefined;
  stddev_pop?: Editions_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Editions_Stddev_Samp_Order_By | null | undefined;
  sum?: Editions_Sum_Order_By | null | undefined;
  var_pop?: Editions_Var_Pop_Order_By | null | undefined;
  var_samp?: Editions_Var_Samp_Order_By | null | undefined;
  variance?: Editions_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "editions" */
export type Editions_Avg_Order_By = {
  audio_seconds?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  country_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  language_id?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  publisher_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  reading_format_id?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  score?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by max() on columns of table "editions" */
export type Editions_Max_Order_By = {
  asin?: Order_By | null | undefined;
  audio_seconds?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  country_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  edition_format?: Order_By | null | undefined;
  edition_information?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  isbn_10?: Order_By | null | undefined;
  isbn_13?: Order_By | null | undefined;
  language_id?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  normalized_at?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  physical_format?: Order_By | null | undefined;
  physical_information?: Order_By | null | undefined;
  publisher_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  reading_format_id?: Order_By | null | undefined;
  release_date?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  score?: Order_By | null | undefined;
  source?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  subtitle?: Order_By | null | undefined;
  title?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by min() on columns of table "editions" */
export type Editions_Min_Order_By = {
  asin?: Order_By | null | undefined;
  audio_seconds?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  country_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  edition_format?: Order_By | null | undefined;
  edition_information?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  isbn_10?: Order_By | null | undefined;
  isbn_13?: Order_By | null | undefined;
  language_id?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  normalized_at?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  physical_format?: Order_By | null | undefined;
  physical_information?: Order_By | null | undefined;
  publisher_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  reading_format_id?: Order_By | null | undefined;
  release_date?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  score?: Order_By | null | undefined;
  source?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  subtitle?: Order_By | null | undefined;
  title?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "editions". */
export type Editions_Order_By = {
  alternative_titles?: Order_By | null | undefined;
  asin?: Order_By | null | undefined;
  audio_seconds?: Order_By | null | undefined;
  book?: Books_Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  book_mappings_aggregate?: Book_Mappings_Aggregate_Order_By | null | undefined;
  cached_contributors?: Order_By | null | undefined;
  cached_image?: Order_By | null | undefined;
  cached_tags?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  compilation?: Order_By | null | undefined;
  contributions_aggregate?: Contributions_Aggregate_Order_By | null | undefined;
  country?: Countries_Order_By | null | undefined;
  country_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  edition_format?: Order_By | null | undefined;
  edition_information?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image?: Images_Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  images_aggregate?: Images_Aggregate_Order_By | null | undefined;
  isbn_10?: Order_By | null | undefined;
  isbn_10_valid?: Order_By | null | undefined;
  isbn_13?: Order_By | null | undefined;
  isbn_13_valid?: Order_By | null | undefined;
  isbns_match?: Order_By | null | undefined;
  language?: Languages_Order_By | null | undefined;
  language_id?: Order_By | null | undefined;
  list_books_aggregate?: List_Books_Aggregate_Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  locked?: Order_By | null | undefined;
  normalized_at?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  physical_format?: Order_By | null | undefined;
  physical_information?: Order_By | null | undefined;
  publisher?: Publishers_Order_By | null | undefined;
  publisher_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  reading_format?: Reading_Formats_Order_By | null | undefined;
  reading_format_id?: Order_By | null | undefined;
  release_date?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  score?: Order_By | null | undefined;
  source?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  subtitle?: Order_By | null | undefined;
  title?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "editions" */
export type Editions_Stddev_Order_By = {
  audio_seconds?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  country_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  language_id?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  publisher_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  reading_format_id?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  score?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "editions" */
export type Editions_Stddev_Pop_Order_By = {
  audio_seconds?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  country_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  language_id?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  publisher_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  reading_format_id?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  score?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "editions" */
export type Editions_Stddev_Samp_Order_By = {
  audio_seconds?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  country_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  language_id?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  publisher_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  reading_format_id?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  score?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by sum() on columns of table "editions" */
export type Editions_Sum_Order_By = {
  audio_seconds?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  country_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  language_id?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  publisher_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  reading_format_id?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  score?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "editions" */
export type Editions_Var_Pop_Order_By = {
  audio_seconds?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  country_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  language_id?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  publisher_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  reading_format_id?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  score?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "editions" */
export type Editions_Var_Samp_Order_By = {
  audio_seconds?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  country_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  language_id?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  publisher_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  reading_format_id?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  score?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by variance() on columns of table "editions" */
export type Editions_Variance_Order_By = {
  audio_seconds?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  country_id?: Order_By | null | undefined;
  created_by_user_id?: Order_By | null | undefined;
  curation_status?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  language_id?: Order_By | null | undefined;
  lists_count?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  pages?: Order_By | null | undefined;
  publisher_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  reading_format_id?: Order_By | null | undefined;
  release_year?: Order_By | null | undefined;
  score?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
  users_read_count?: Order_By | null | undefined;
};

/** order by aggregate values of table "followed_lists" */
export type Followed_Lists_Aggregate_Order_By = {
  avg?: Followed_Lists_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Followed_Lists_Max_Order_By | null | undefined;
  min?: Followed_Lists_Min_Order_By | null | undefined;
  stddev?: Followed_Lists_Stddev_Order_By | null | undefined;
  stddev_pop?: Followed_Lists_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Followed_Lists_Stddev_Samp_Order_By | null | undefined;
  sum?: Followed_Lists_Sum_Order_By | null | undefined;
  var_pop?: Followed_Lists_Var_Pop_Order_By | null | undefined;
  var_samp?: Followed_Lists_Var_Samp_Order_By | null | undefined;
  variance?: Followed_Lists_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "followed_lists" */
export type Followed_Lists_Avg_Order_By = {
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "followed_lists" */
export type Followed_Lists_Max_Order_By = {
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "followed_lists" */
export type Followed_Lists_Min_Order_By = {
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "followed_lists" */
export type Followed_Lists_Stddev_Order_By = {
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "followed_lists" */
export type Followed_Lists_Stddev_Pop_Order_By = {
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "followed_lists" */
export type Followed_Lists_Stddev_Samp_Order_By = {
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "followed_lists" */
export type Followed_Lists_Sum_Order_By = {
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "followed_lists" */
export type Followed_Lists_Var_Pop_Order_By = {
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "followed_lists" */
export type Followed_Lists_Var_Samp_Order_By = {
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "followed_lists" */
export type Followed_Lists_Variance_Order_By = {
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "followed_prompts" */
export type Followed_Prompts_Aggregate_Order_By = {
  avg?: Followed_Prompts_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Followed_Prompts_Max_Order_By | null | undefined;
  min?: Followed_Prompts_Min_Order_By | null | undefined;
  stddev?: Followed_Prompts_Stddev_Order_By | null | undefined;
  stddev_pop?: Followed_Prompts_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Followed_Prompts_Stddev_Samp_Order_By | null | undefined;
  sum?: Followed_Prompts_Sum_Order_By | null | undefined;
  var_pop?: Followed_Prompts_Var_Pop_Order_By | null | undefined;
  var_samp?: Followed_Prompts_Var_Samp_Order_By | null | undefined;
  variance?: Followed_Prompts_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "followed_prompts" */
export type Followed_Prompts_Avg_Order_By = {
  id?: Order_By | null | undefined;
  order?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "followed_prompts" */
export type Followed_Prompts_Max_Order_By = {
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  order?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "followed_prompts" */
export type Followed_Prompts_Min_Order_By = {
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  order?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "followed_prompts" */
export type Followed_Prompts_Stddev_Order_By = {
  id?: Order_By | null | undefined;
  order?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "followed_prompts" */
export type Followed_Prompts_Stddev_Pop_Order_By = {
  id?: Order_By | null | undefined;
  order?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "followed_prompts" */
export type Followed_Prompts_Stddev_Samp_Order_By = {
  id?: Order_By | null | undefined;
  order?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "followed_prompts" */
export type Followed_Prompts_Sum_Order_By = {
  id?: Order_By | null | undefined;
  order?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "followed_prompts" */
export type Followed_Prompts_Var_Pop_Order_By = {
  id?: Order_By | null | undefined;
  order?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "followed_prompts" */
export type Followed_Prompts_Var_Samp_Order_By = {
  id?: Order_By | null | undefined;
  order?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "followed_prompts" */
export type Followed_Prompts_Variance_Order_By = {
  id?: Order_By | null | undefined;
  order?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "followed_users" */
export type Followed_Users_Aggregate_Order_By = {
  avg?: Followed_Users_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Followed_Users_Max_Order_By | null | undefined;
  min?: Followed_Users_Min_Order_By | null | undefined;
  stddev?: Followed_Users_Stddev_Order_By | null | undefined;
  stddev_pop?: Followed_Users_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Followed_Users_Stddev_Samp_Order_By | null | undefined;
  sum?: Followed_Users_Sum_Order_By | null | undefined;
  var_pop?: Followed_Users_Var_Pop_Order_By | null | undefined;
  var_samp?: Followed_Users_Var_Samp_Order_By | null | undefined;
  variance?: Followed_Users_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "followed_users" */
export type Followed_Users_Avg_Order_By = {
  followed_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "followed_users" */
export type Followed_Users_Max_Order_By = {
  created_at?: Order_By | null | undefined;
  followed_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "followed_users" */
export type Followed_Users_Min_Order_By = {
  created_at?: Order_By | null | undefined;
  followed_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "followed_users" */
export type Followed_Users_Stddev_Order_By = {
  followed_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "followed_users" */
export type Followed_Users_Stddev_Pop_Order_By = {
  followed_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "followed_users" */
export type Followed_Users_Stddev_Samp_Order_By = {
  followed_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "followed_users" */
export type Followed_Users_Sum_Order_By = {
  followed_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "followed_users" */
export type Followed_Users_Var_Pop_Order_By = {
  followed_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "followed_users" */
export type Followed_Users_Var_Samp_Order_By = {
  followed_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "followed_users" */
export type Followed_Users_Variance_Order_By = {
  followed_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "follows" */
export type Follows_Aggregate_Order_By = {
  avg?: Follows_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Follows_Max_Order_By | null | undefined;
  min?: Follows_Min_Order_By | null | undefined;
  stddev?: Follows_Stddev_Order_By | null | undefined;
  stddev_pop?: Follows_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Follows_Stddev_Samp_Order_By | null | undefined;
  sum?: Follows_Sum_Order_By | null | undefined;
  var_pop?: Follows_Var_Pop_Order_By | null | undefined;
  var_samp?: Follows_Var_Samp_Order_By | null | undefined;
  variance?: Follows_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "follows" */
export type Follows_Avg_Order_By = {
  followable_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "follows" */
export type Follows_Max_Order_By = {
  created_at?: Order_By | null | undefined;
  followable_id?: Order_By | null | undefined;
  followable_type?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "follows" */
export type Follows_Min_Order_By = {
  created_at?: Order_By | null | undefined;
  followable_id?: Order_By | null | undefined;
  followable_type?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "follows" */
export type Follows_Stddev_Order_By = {
  followable_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "follows" */
export type Follows_Stddev_Pop_Order_By = {
  followable_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "follows" */
export type Follows_Stddev_Samp_Order_By = {
  followable_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "follows" */
export type Follows_Sum_Order_By = {
  followable_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "follows" */
export type Follows_Var_Pop_Order_By = {
  followable_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "follows" */
export type Follows_Var_Samp_Order_By = {
  followable_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "follows" */
export type Follows_Variance_Order_By = {
  followable_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "goals" */
export type Goals_Aggregate_Order_By = {
  avg?: Goals_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Goals_Max_Order_By | null | undefined;
  min?: Goals_Min_Order_By | null | undefined;
  stddev?: Goals_Stddev_Order_By | null | undefined;
  stddev_pop?: Goals_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Goals_Stddev_Samp_Order_By | null | undefined;
  sum?: Goals_Sum_Order_By | null | undefined;
  var_pop?: Goals_Var_Pop_Order_By | null | undefined;
  var_samp?: Goals_Var_Samp_Order_By | null | undefined;
  variance?: Goals_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "goals" */
export type Goals_Avg_Order_By = {
  goal?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "goals" */
export type Goals_Max_Order_By = {
  completed_at?: Order_By | null | undefined;
  description?: Order_By | null | undefined;
  end_date?: Order_By | null | undefined;
  goal?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  metric?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  start_date?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "goals" */
export type Goals_Min_Order_By = {
  completed_at?: Order_By | null | undefined;
  description?: Order_By | null | undefined;
  end_date?: Order_By | null | undefined;
  goal?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  metric?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  start_date?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "goals" */
export type Goals_Stddev_Order_By = {
  goal?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "goals" */
export type Goals_Stddev_Pop_Order_By = {
  goal?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "goals" */
export type Goals_Stddev_Samp_Order_By = {
  goal?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "goals" */
export type Goals_Sum_Order_By = {
  goal?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "goals" */
export type Goals_Var_Pop_Order_By = {
  goal?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "goals" */
export type Goals_Var_Samp_Order_By = {
  goal?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "goals" */
export type Goals_Variance_Order_By = {
  goal?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "images" */
export type Images_Aggregate_Order_By = {
  avg?: Images_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Images_Max_Order_By | null | undefined;
  min?: Images_Min_Order_By | null | undefined;
  stddev?: Images_Stddev_Order_By | null | undefined;
  stddev_pop?: Images_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Images_Stddev_Samp_Order_By | null | undefined;
  sum?: Images_Sum_Order_By | null | undefined;
  var_pop?: Images_Var_Pop_Order_By | null | undefined;
  var_samp?: Images_Var_Samp_Order_By | null | undefined;
  variance?: Images_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "images" */
export type Images_Avg_Order_By = {
  height?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  imageable_id?: Order_By | null | undefined;
  ratio?: Order_By | null | undefined;
  width?: Order_By | null | undefined;
};

/** order by max() on columns of table "images" */
export type Images_Max_Order_By = {
  color?: Order_By | null | undefined;
  height?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  imageable_id?: Order_By | null | undefined;
  imageable_type?: Order_By | null | undefined;
  ratio?: Order_By | null | undefined;
  url?: Order_By | null | undefined;
  width?: Order_By | null | undefined;
};

/** order by min() on columns of table "images" */
export type Images_Min_Order_By = {
  color?: Order_By | null | undefined;
  height?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  imageable_id?: Order_By | null | undefined;
  imageable_type?: Order_By | null | undefined;
  ratio?: Order_By | null | undefined;
  url?: Order_By | null | undefined;
  width?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "images". */
export type Images_Order_By = {
  color?: Order_By | null | undefined;
  colors?: Order_By | null | undefined;
  height?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  imageable_id?: Order_By | null | undefined;
  imageable_type?: Order_By | null | undefined;
  ratio?: Order_By | null | undefined;
  url?: Order_By | null | undefined;
  width?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "images" */
export type Images_Stddev_Order_By = {
  height?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  imageable_id?: Order_By | null | undefined;
  ratio?: Order_By | null | undefined;
  width?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "images" */
export type Images_Stddev_Pop_Order_By = {
  height?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  imageable_id?: Order_By | null | undefined;
  ratio?: Order_By | null | undefined;
  width?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "images" */
export type Images_Stddev_Samp_Order_By = {
  height?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  imageable_id?: Order_By | null | undefined;
  ratio?: Order_By | null | undefined;
  width?: Order_By | null | undefined;
};

/** order by sum() on columns of table "images" */
export type Images_Sum_Order_By = {
  height?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  imageable_id?: Order_By | null | undefined;
  ratio?: Order_By | null | undefined;
  width?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "images" */
export type Images_Var_Pop_Order_By = {
  height?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  imageable_id?: Order_By | null | undefined;
  ratio?: Order_By | null | undefined;
  width?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "images" */
export type Images_Var_Samp_Order_By = {
  height?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  imageable_id?: Order_By | null | undefined;
  ratio?: Order_By | null | undefined;
  width?: Order_By | null | undefined;
};

/** order by variance() on columns of table "images" */
export type Images_Variance_Order_By = {
  height?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  imageable_id?: Order_By | null | undefined;
  ratio?: Order_By | null | undefined;
  width?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "languages". */
export type Languages_Order_By = {
  code2?: Order_By | null | undefined;
  code3?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  language?: Order_By | null | undefined;
};

/** order by aggregate values of table "likes" */
export type Likes_Aggregate_Order_By = {
  avg?: Likes_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Likes_Max_Order_By | null | undefined;
  min?: Likes_Min_Order_By | null | undefined;
  stddev?: Likes_Stddev_Order_By | null | undefined;
  stddev_pop?: Likes_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Likes_Stddev_Samp_Order_By | null | undefined;
  sum?: Likes_Sum_Order_By | null | undefined;
  var_pop?: Likes_Var_Pop_Order_By | null | undefined;
  var_samp?: Likes_Var_Samp_Order_By | null | undefined;
  variance?: Likes_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "likes" */
export type Likes_Avg_Order_By = {
  id?: Order_By | null | undefined;
  likeable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "likes" */
export type Likes_Max_Order_By = {
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likeable_id?: Order_By | null | undefined;
  likeable_type?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "likes" */
export type Likes_Min_Order_By = {
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likeable_id?: Order_By | null | undefined;
  likeable_type?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "likes" */
export type Likes_Stddev_Order_By = {
  id?: Order_By | null | undefined;
  likeable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "likes" */
export type Likes_Stddev_Pop_Order_By = {
  id?: Order_By | null | undefined;
  likeable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "likes" */
export type Likes_Stddev_Samp_Order_By = {
  id?: Order_By | null | undefined;
  likeable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "likes" */
export type Likes_Sum_Order_By = {
  id?: Order_By | null | undefined;
  likeable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "likes" */
export type Likes_Var_Pop_Order_By = {
  id?: Order_By | null | undefined;
  likeable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "likes" */
export type Likes_Var_Samp_Order_By = {
  id?: Order_By | null | undefined;
  likeable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "likes" */
export type Likes_Variance_Order_By = {
  id?: Order_By | null | undefined;
  likeable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "links". */
export type Links_Order_By = {
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  linkable_id?: Order_By | null | undefined;
  linkable_type?: Order_By | null | undefined;
  social_type?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  url?: Order_By | null | undefined;
  user?: Users_Order_By | null | undefined;
  username?: Order_By | null | undefined;
};

/** order by aggregate values of table "list_books" */
export type List_Books_Aggregate_Order_By = {
  avg?: List_Books_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: List_Books_Max_Order_By | null | undefined;
  min?: List_Books_Min_Order_By | null | undefined;
  stddev?: List_Books_Stddev_Order_By | null | undefined;
  stddev_pop?: List_Books_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: List_Books_Stddev_Samp_Order_By | null | undefined;
  sum?: List_Books_Sum_Order_By | null | undefined;
  var_pop?: List_Books_Var_Pop_Order_By | null | undefined;
  var_samp?: List_Books_Var_Samp_Order_By | null | undefined;
  variance?: List_Books_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "list_books" */
export type List_Books_Avg_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "list_books" */
export type List_Books_Max_Order_By = {
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  date_added?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  merged_at?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  reason?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "list_books" */
export type List_Books_Min_Order_By = {
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  date_added?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  merged_at?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  reason?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "list_books" */
export type List_Books_Stddev_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "list_books" */
export type List_Books_Stddev_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "list_books" */
export type List_Books_Stddev_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "list_books" */
export type List_Books_Sum_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "list_books" */
export type List_Books_Var_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "list_books" */
export type List_Books_Var_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "list_books" */
export type List_Books_Variance_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  list_id?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  position?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "lists" */
export type Lists_Aggregate_Order_By = {
  avg?: Lists_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Lists_Max_Order_By | null | undefined;
  min?: Lists_Min_Order_By | null | undefined;
  stddev?: Lists_Stddev_Order_By | null | undefined;
  stddev_pop?: Lists_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Lists_Stddev_Samp_Order_By | null | undefined;
  sum?: Lists_Sum_Order_By | null | undefined;
  var_pop?: Lists_Var_Pop_Order_By | null | undefined;
  var_samp?: Lists_Var_Samp_Order_By | null | undefined;
  variance?: Lists_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "lists" */
export type Lists_Avg_Order_By = {
  books_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "lists" */
export type Lists_Max_Order_By = {
  books_count?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  default_view?: Order_By | null | undefined;
  description?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  name?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  slug?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  url?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "lists" */
export type Lists_Min_Order_By = {
  books_count?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  default_view?: Order_By | null | undefined;
  description?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  name?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  slug?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  url?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "lists" */
export type Lists_Stddev_Order_By = {
  books_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "lists" */
export type Lists_Stddev_Pop_Order_By = {
  books_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "lists" */
export type Lists_Stddev_Samp_Order_By = {
  books_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "lists" */
export type Lists_Sum_Order_By = {
  books_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "lists" */
export type Lists_Var_Pop_Order_By = {
  books_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "lists" */
export type Lists_Var_Samp_Order_By = {
  books_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "lists" */
export type Lists_Variance_Order_By = {
  books_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "notification_deliveries" */
export type Notification_Deliveries_Aggregate_Order_By = {
  avg?: Notification_Deliveries_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Notification_Deliveries_Max_Order_By | null | undefined;
  min?: Notification_Deliveries_Min_Order_By | null | undefined;
  stddev?: Notification_Deliveries_Stddev_Order_By | null | undefined;
  stddev_pop?: Notification_Deliveries_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Notification_Deliveries_Stddev_Samp_Order_By | null | undefined;
  sum?: Notification_Deliveries_Sum_Order_By | null | undefined;
  var_pop?: Notification_Deliveries_Var_Pop_Order_By | null | undefined;
  var_samp?: Notification_Deliveries_Var_Samp_Order_By | null | undefined;
  variance?: Notification_Deliveries_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "notification_deliveries" */
export type Notification_Deliveries_Avg_Order_By = {
  channel_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  notification_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "notification_deliveries" */
export type Notification_Deliveries_Max_Order_By = {
  channel_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  notification_id?: Order_By | null | undefined;
  read_at?: Order_By | null | undefined;
  sent_at?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "notification_deliveries" */
export type Notification_Deliveries_Min_Order_By = {
  channel_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  notification_id?: Order_By | null | undefined;
  read_at?: Order_By | null | undefined;
  sent_at?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "notification_deliveries" */
export type Notification_Deliveries_Stddev_Order_By = {
  channel_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  notification_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "notification_deliveries" */
export type Notification_Deliveries_Stddev_Pop_Order_By = {
  channel_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  notification_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "notification_deliveries" */
export type Notification_Deliveries_Stddev_Samp_Order_By = {
  channel_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  notification_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "notification_deliveries" */
export type Notification_Deliveries_Sum_Order_By = {
  channel_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  notification_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "notification_deliveries" */
export type Notification_Deliveries_Var_Pop_Order_By = {
  channel_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  notification_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "notification_deliveries" */
export type Notification_Deliveries_Var_Samp_Order_By = {
  channel_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  notification_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "notification_deliveries" */
export type Notification_Deliveries_Variance_Order_By = {
  channel_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  notification_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** column ordering options */
export type Order_By =
  /** in ascending order, nulls last */
  | 'asc'
  /** in ascending order, nulls first */
  | 'asc_nulls_first'
  /** in ascending order, nulls last */
  | 'asc_nulls_last'
  /** in descending order, nulls first */
  | 'desc'
  /** in descending order, nulls first */
  | 'desc_nulls_first'
  /** in descending order, nulls last */
  | 'desc_nulls_last';

/** Ordering options when selecting data from "privacy_settings". */
export type Privacy_Settings_Order_By = {
  activities_aggregate?: Activities_Aggregate_Order_By | null | undefined;
  id?: Order_By | null | undefined;
  lists_aggregate?: Lists_Aggregate_Order_By | null | undefined;
  prompts_aggregate?: Prompts_Aggregate_Order_By | null | undefined;
  setting?: Order_By | null | undefined;
  user_books_aggregate?: User_Books_Aggregate_Order_By | null | undefined;
  users_aggregate?: Users_Aggregate_Order_By | null | undefined;
  users_by_activity_aggregate?: Users_Aggregate_Order_By | null | undefined;
};

/** order by aggregate values of table "prompt_answers" */
export type Prompt_Answers_Aggregate_Order_By = {
  avg?: Prompt_Answers_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Prompt_Answers_Max_Order_By | null | undefined;
  min?: Prompt_Answers_Min_Order_By | null | undefined;
  stddev?: Prompt_Answers_Stddev_Order_By | null | undefined;
  stddev_pop?: Prompt_Answers_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Prompt_Answers_Stddev_Samp_Order_By | null | undefined;
  sum?: Prompt_Answers_Sum_Order_By | null | undefined;
  var_pop?: Prompt_Answers_Var_Pop_Order_By | null | undefined;
  var_samp?: Prompt_Answers_Var_Samp_Order_By | null | undefined;
  variance?: Prompt_Answers_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "prompt_answers" */
export type Prompt_Answers_Avg_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "prompt_answers" */
export type Prompt_Answers_Max_Order_By = {
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  description?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "prompt_answers" */
export type Prompt_Answers_Min_Order_By = {
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  description?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "prompt_answers" */
export type Prompt_Answers_Stddev_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "prompt_answers" */
export type Prompt_Answers_Stddev_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "prompt_answers" */
export type Prompt_Answers_Stddev_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "prompt_answers" */
export type Prompt_Answers_Sum_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "prompt_answers" */
export type Prompt_Answers_Var_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "prompt_answers" */
export type Prompt_Answers_Var_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "prompt_answers" */
export type Prompt_Answers_Variance_Order_By = {
  book_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "prompt_books_summary" */
export type Prompt_Books_Summary_Aggregate_Order_By = {
  avg?: Prompt_Books_Summary_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Prompt_Books_Summary_Max_Order_By | null | undefined;
  min?: Prompt_Books_Summary_Min_Order_By | null | undefined;
  stddev?: Prompt_Books_Summary_Stddev_Order_By | null | undefined;
  stddev_pop?: Prompt_Books_Summary_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Prompt_Books_Summary_Stddev_Samp_Order_By | null | undefined;
  sum?: Prompt_Books_Summary_Sum_Order_By | null | undefined;
  var_pop?: Prompt_Books_Summary_Var_Pop_Order_By | null | undefined;
  var_samp?: Prompt_Books_Summary_Var_Samp_Order_By | null | undefined;
  variance?: Prompt_Books_Summary_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "prompt_books_summary" */
export type Prompt_Books_Summary_Avg_Order_By = {
  answers_count?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "prompt_books_summary" */
export type Prompt_Books_Summary_Max_Order_By = {
  answers_count?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "prompt_books_summary" */
export type Prompt_Books_Summary_Min_Order_By = {
  answers_count?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "prompt_books_summary" */
export type Prompt_Books_Summary_Stddev_Order_By = {
  answers_count?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "prompt_books_summary" */
export type Prompt_Books_Summary_Stddev_Pop_Order_By = {
  answers_count?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "prompt_books_summary" */
export type Prompt_Books_Summary_Stddev_Samp_Order_By = {
  answers_count?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "prompt_books_summary" */
export type Prompt_Books_Summary_Sum_Order_By = {
  answers_count?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "prompt_books_summary" */
export type Prompt_Books_Summary_Var_Pop_Order_By = {
  answers_count?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "prompt_books_summary" */
export type Prompt_Books_Summary_Var_Samp_Order_By = {
  answers_count?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "prompt_books_summary" */
export type Prompt_Books_Summary_Variance_Order_By = {
  answers_count?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  prompt_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "prompts" */
export type Prompts_Aggregate_Order_By = {
  avg?: Prompts_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Prompts_Max_Order_By | null | undefined;
  min?: Prompts_Min_Order_By | null | undefined;
  stddev?: Prompts_Stddev_Order_By | null | undefined;
  stddev_pop?: Prompts_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Prompts_Stddev_Samp_Order_By | null | undefined;
  sum?: Prompts_Sum_Order_By | null | undefined;
  var_pop?: Prompts_Var_Pop_Order_By | null | undefined;
  var_samp?: Prompts_Var_Samp_Order_By | null | undefined;
  variance?: Prompts_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "prompts" */
export type Prompts_Avg_Order_By = {
  answers_count?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by max() on columns of table "prompts" */
export type Prompts_Max_Order_By = {
  answers_count?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  description?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  question?: Order_By | null | undefined;
  slug?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by min() on columns of table "prompts" */
export type Prompts_Min_Order_By = {
  answers_count?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  description?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  question?: Order_By | null | undefined;
  slug?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "prompts" */
export type Prompts_Stddev_Order_By = {
  answers_count?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "prompts" */
export type Prompts_Stddev_Pop_Order_By = {
  answers_count?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "prompts" */
export type Prompts_Stddev_Samp_Order_By = {
  answers_count?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by sum() on columns of table "prompts" */
export type Prompts_Sum_Order_By = {
  answers_count?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "prompts" */
export type Prompts_Var_Pop_Order_By = {
  answers_count?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "prompts" */
export type Prompts_Var_Samp_Order_By = {
  answers_count?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** order by variance() on columns of table "prompts" */
export type Prompts_Variance_Order_By = {
  answers_count?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
  users_count?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "publishers". */
export type Publishers_Order_By = {
  canonical_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  editions_aggregate?: Editions_Aggregate_Order_By | null | undefined;
  editions_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  locked?: Order_By | null | undefined;
  name?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  parent_id?: Order_By | null | undefined;
  parent_publisher?: Publishers_Order_By | null | undefined;
  slug?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "reading_formats". */
export type Reading_Formats_Order_By = {
  format?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
};

/** order by aggregate values of table "reading_journals" */
export type Reading_Journals_Aggregate_Order_By = {
  avg?: Reading_Journals_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Reading_Journals_Max_Order_By | null | undefined;
  min?: Reading_Journals_Min_Order_By | null | undefined;
  stddev?: Reading_Journals_Stddev_Order_By | null | undefined;
  stddev_pop?: Reading_Journals_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Reading_Journals_Stddev_Samp_Order_By | null | undefined;
  sum?: Reading_Journals_Sum_Order_By | null | undefined;
  var_pop?: Reading_Journals_Var_Pop_Order_By | null | undefined;
  var_samp?: Reading_Journals_Var_Samp_Order_By | null | undefined;
  variance?: Reading_Journals_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "reading_journals" */
export type Reading_Journals_Avg_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "reading_journals" */
export type Reading_Journals_Max_Order_By = {
  action_at?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  entry?: Order_By | null | undefined;
  event?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  journal_date?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "reading_journals" */
export type Reading_Journals_Min_Order_By = {
  action_at?: Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  entry?: Order_By | null | undefined;
  event?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  journal_date?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "reading_journals" */
export type Reading_Journals_Stddev_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "reading_journals" */
export type Reading_Journals_Stddev_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "reading_journals" */
export type Reading_Journals_Stddev_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "reading_journals" */
export type Reading_Journals_Sum_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "reading_journals_summary". */
export type Reading_Journals_Summary_Order_By = {
  book?: Books_Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  followers_aggregate?: Followed_Users_Aggregate_Order_By | null | undefined;
  journals_count?: Order_By | null | undefined;
  last_updated_at?: Order_By | null | undefined;
  reading_journals_aggregate?: Reading_Journals_Aggregate_Order_By | null | undefined;
  user?: Users_Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "reading_journals" */
export type Reading_Journals_Var_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "reading_journals" */
export type Reading_Journals_Var_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "reading_journals" */
export type Reading_Journals_Variance_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "series". */
export type Series_Order_By = {
  author?: Authors_Order_By | null | undefined;
  author_id?: Order_By | null | undefined;
  book_series_aggregate?: Book_Series_Aggregate_Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  canonical?: Series_Order_By | null | undefined;
  canonical_id?: Order_By | null | undefined;
  creator?: Users_Order_By | null | undefined;
  description?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  identifiers?: Order_By | null | undefined;
  is_completed?: Order_By | null | undefined;
  locked?: Order_By | null | undefined;
  name?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  primary_books_count?: Order_By | null | undefined;
  slug?: Order_By | null | undefined;
  state?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "taggable_counts" */
export type Taggable_Counts_Aggregate_Order_By = {
  avg?: Taggable_Counts_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Taggable_Counts_Max_Order_By | null | undefined;
  min?: Taggable_Counts_Min_Order_By | null | undefined;
  stddev?: Taggable_Counts_Stddev_Order_By | null | undefined;
  stddev_pop?: Taggable_Counts_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Taggable_Counts_Stddev_Samp_Order_By | null | undefined;
  sum?: Taggable_Counts_Sum_Order_By | null | undefined;
  var_pop?: Taggable_Counts_Var_Pop_Order_By | null | undefined;
  var_samp?: Taggable_Counts_Var_Samp_Order_By | null | undefined;
  variance?: Taggable_Counts_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "taggable_counts" */
export type Taggable_Counts_Avg_Order_By = {
  count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  spoiler_ratio?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "taggable_counts" */
export type Taggable_Counts_Max_Order_By = {
  count?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  spoiler_ratio?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
  taggable_type?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
};

/** order by min() on columns of table "taggable_counts" */
export type Taggable_Counts_Min_Order_By = {
  count?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  spoiler_ratio?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
  taggable_type?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "taggable_counts" */
export type Taggable_Counts_Stddev_Order_By = {
  count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  spoiler_ratio?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "taggable_counts" */
export type Taggable_Counts_Stddev_Pop_Order_By = {
  count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  spoiler_ratio?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "taggable_counts" */
export type Taggable_Counts_Stddev_Samp_Order_By = {
  count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  spoiler_ratio?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "taggable_counts" */
export type Taggable_Counts_Sum_Order_By = {
  count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  spoiler_ratio?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "taggable_counts" */
export type Taggable_Counts_Var_Pop_Order_By = {
  count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  spoiler_ratio?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "taggable_counts" */
export type Taggable_Counts_Var_Samp_Order_By = {
  count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  spoiler_ratio?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "taggable_counts" */
export type Taggable_Counts_Variance_Order_By = {
  count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  spoiler_ratio?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "taggings" */
export type Taggings_Aggregate_Order_By = {
  avg?: Taggings_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Taggings_Max_Order_By | null | undefined;
  min?: Taggings_Min_Order_By | null | undefined;
  stddev?: Taggings_Stddev_Order_By | null | undefined;
  stddev_pop?: Taggings_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Taggings_Stddev_Samp_Order_By | null | undefined;
  sum?: Taggings_Sum_Order_By | null | undefined;
  var_pop?: Taggings_Var_Pop_Order_By | null | undefined;
  var_samp?: Taggings_Var_Samp_Order_By | null | undefined;
  variance?: Taggings_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "taggings" */
export type Taggings_Avg_Order_By = {
  id?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "taggings" */
export type Taggings_Max_Order_By = {
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
  taggable_type?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "taggings" */
export type Taggings_Min_Order_By = {
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
  taggable_type?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "taggings" */
export type Taggings_Stddev_Order_By = {
  id?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "taggings" */
export type Taggings_Stddev_Pop_Order_By = {
  id?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "taggings" */
export type Taggings_Stddev_Samp_Order_By = {
  id?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "taggings" */
export type Taggings_Sum_Order_By = {
  id?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "taggings" */
export type Taggings_Var_Pop_Order_By = {
  id?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "taggings" */
export type Taggings_Var_Samp_Order_By = {
  id?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "taggings" */
export type Taggings_Variance_Order_By = {
  id?: Order_By | null | undefined;
  tag_id?: Order_By | null | undefined;
  taggable_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "user_blocks" */
export type User_Blocks_Aggregate_Order_By = {
  avg?: User_Blocks_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: User_Blocks_Max_Order_By | null | undefined;
  min?: User_Blocks_Min_Order_By | null | undefined;
  stddev?: User_Blocks_Stddev_Order_By | null | undefined;
  stddev_pop?: User_Blocks_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: User_Blocks_Stddev_Samp_Order_By | null | undefined;
  sum?: User_Blocks_Sum_Order_By | null | undefined;
  var_pop?: User_Blocks_Var_Pop_Order_By | null | undefined;
  var_samp?: User_Blocks_Var_Samp_Order_By | null | undefined;
  variance?: User_Blocks_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "user_blocks" */
export type User_Blocks_Avg_Order_By = {
  blocked_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "user_blocks" */
export type User_Blocks_Max_Order_By = {
  blocked_user_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "user_blocks" */
export type User_Blocks_Min_Order_By = {
  blocked_user_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "user_blocks" */
export type User_Blocks_Stddev_Order_By = {
  blocked_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "user_blocks" */
export type User_Blocks_Stddev_Pop_Order_By = {
  blocked_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "user_blocks" */
export type User_Blocks_Stddev_Samp_Order_By = {
  blocked_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "user_blocks" */
export type User_Blocks_Sum_Order_By = {
  blocked_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "user_blocks" */
export type User_Blocks_Var_Pop_Order_By = {
  blocked_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "user_blocks" */
export type User_Blocks_Var_Samp_Order_By = {
  blocked_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "user_blocks" */
export type User_Blocks_Variance_Order_By = {
  blocked_user_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "user_book_reads" */
export type User_Book_Reads_Aggregate_Order_By = {
  avg?: User_Book_Reads_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: User_Book_Reads_Max_Order_By | null | undefined;
  min?: User_Book_Reads_Min_Order_By | null | undefined;
  stddev?: User_Book_Reads_Stddev_Order_By | null | undefined;
  stddev_pop?: User_Book_Reads_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: User_Book_Reads_Stddev_Samp_Order_By | null | undefined;
  sum?: User_Book_Reads_Sum_Order_By | null | undefined;
  var_pop?: User_Book_Reads_Var_Pop_Order_By | null | undefined;
  var_samp?: User_Book_Reads_Var_Samp_Order_By | null | undefined;
  variance?: User_Book_Reads_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "user_book_reads" */
export type User_Book_Reads_Avg_Order_By = {
  edition_id?: Order_By | null | undefined;
  finished_at_precision?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  progress_pages?: Order_By | null | undefined;
  progress_seconds?: Order_By | null | undefined;
  user_book_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "user_book_reads" */
export type User_Book_Reads_Max_Order_By = {
  edition_id?: Order_By | null | undefined;
  finished_at?: Order_By | null | undefined;
  finished_at_precision?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  paused_at?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  progress_pages?: Order_By | null | undefined;
  progress_seconds?: Order_By | null | undefined;
  started_at?: Order_By | null | undefined;
  user_book_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "user_book_reads" */
export type User_Book_Reads_Min_Order_By = {
  edition_id?: Order_By | null | undefined;
  finished_at?: Order_By | null | undefined;
  finished_at_precision?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  paused_at?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  progress_pages?: Order_By | null | undefined;
  progress_seconds?: Order_By | null | undefined;
  started_at?: Order_By | null | undefined;
  user_book_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "user_book_reads" */
export type User_Book_Reads_Stddev_Order_By = {
  edition_id?: Order_By | null | undefined;
  finished_at_precision?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  progress_pages?: Order_By | null | undefined;
  progress_seconds?: Order_By | null | undefined;
  user_book_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "user_book_reads" */
export type User_Book_Reads_Stddev_Pop_Order_By = {
  edition_id?: Order_By | null | undefined;
  finished_at_precision?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  progress_pages?: Order_By | null | undefined;
  progress_seconds?: Order_By | null | undefined;
  user_book_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "user_book_reads" */
export type User_Book_Reads_Stddev_Samp_Order_By = {
  edition_id?: Order_By | null | undefined;
  finished_at_precision?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  progress_pages?: Order_By | null | undefined;
  progress_seconds?: Order_By | null | undefined;
  user_book_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "user_book_reads" */
export type User_Book_Reads_Sum_Order_By = {
  edition_id?: Order_By | null | undefined;
  finished_at_precision?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  progress_pages?: Order_By | null | undefined;
  progress_seconds?: Order_By | null | undefined;
  user_book_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "user_book_reads" */
export type User_Book_Reads_Var_Pop_Order_By = {
  edition_id?: Order_By | null | undefined;
  finished_at_precision?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  progress_pages?: Order_By | null | undefined;
  progress_seconds?: Order_By | null | undefined;
  user_book_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "user_book_reads" */
export type User_Book_Reads_Var_Samp_Order_By = {
  edition_id?: Order_By | null | undefined;
  finished_at_precision?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  progress_pages?: Order_By | null | undefined;
  progress_seconds?: Order_By | null | undefined;
  user_book_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "user_book_reads" */
export type User_Book_Reads_Variance_Order_By = {
  edition_id?: Order_By | null | undefined;
  finished_at_precision?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  progress?: Order_By | null | undefined;
  progress_pages?: Order_By | null | undefined;
  progress_seconds?: Order_By | null | undefined;
  user_book_id?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "user_book_statuses". */
export type User_Book_Statuses_Order_By = {
  description?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  slug?: Order_By | null | undefined;
  status?: Order_By | null | undefined;
  user_books_aggregate?: User_Books_Aggregate_Order_By | null | undefined;
};

/** order by aggregate values of table "user_books" */
export type User_Books_Aggregate_Order_By = {
  avg?: User_Books_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: User_Books_Max_Order_By | null | undefined;
  min?: User_Books_Min_Order_By | null | undefined;
  stddev?: User_Books_Stddev_Order_By | null | undefined;
  stddev_pop?: User_Books_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: User_Books_Stddev_Samp_Order_By | null | undefined;
  sum?: User_Books_Sum_Order_By | null | undefined;
  var_pop?: User_Books_Var_Pop_Order_By | null | undefined;
  var_samp?: User_Books_Var_Samp_Order_By | null | undefined;
  variance?: User_Books_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "user_books" */
export type User_Books_Avg_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  mod_status?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  owned_copies?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  read_count?: Order_By | null | undefined;
  referrer_user_id?: Order_By | null | undefined;
  review_length?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "user_books" */
export type User_Books_Max_Order_By = {
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  date_added?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  first_read_date?: Order_By | null | undefined;
  first_started_reading_date?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  last_read_date?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  media_url?: Order_By | null | undefined;
  merged_at?: Order_By | null | undefined;
  mod_status?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  owned_copies?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  private_notes?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  read_count?: Order_By | null | undefined;
  recommended_by?: Order_By | null | undefined;
  recommended_for?: Order_By | null | undefined;
  referrer_user_id?: Order_By | null | undefined;
  review?: Order_By | null | undefined;
  review_length?: Order_By | null | undefined;
  review_markdown?: Order_By | null | undefined;
  review_raw?: Order_By | null | undefined;
  reviewed_at?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  url?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "user_books" */
export type User_Books_Min_Order_By = {
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  date_added?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  first_read_date?: Order_By | null | undefined;
  first_started_reading_date?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  last_read_date?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  media_url?: Order_By | null | undefined;
  merged_at?: Order_By | null | undefined;
  mod_status?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  owned_copies?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  private_notes?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  read_count?: Order_By | null | undefined;
  recommended_by?: Order_By | null | undefined;
  recommended_for?: Order_By | null | undefined;
  referrer_user_id?: Order_By | null | undefined;
  review?: Order_By | null | undefined;
  review_length?: Order_By | null | undefined;
  review_markdown?: Order_By | null | undefined;
  review_raw?: Order_By | null | undefined;
  reviewed_at?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  url?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "user_books". */
export type User_Books_Order_By = {
  book?: Books_Order_By | null | undefined;
  book_id?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  date_added?: Order_By | null | undefined;
  edition?: Editions_Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  first_read_date?: Order_By | null | undefined;
  first_started_reading_date?: Order_By | null | undefined;
  followers_aggregate?: Followed_Users_Aggregate_Order_By | null | undefined;
  has_review?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  imported?: Order_By | null | undefined;
  last_read_date?: Order_By | null | undefined;
  likes_aggregate?: Likes_Aggregate_Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  media_url?: Order_By | null | undefined;
  merged_at?: Order_By | null | undefined;
  mod_status?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  owned?: Order_By | null | undefined;
  owned_copies?: Order_By | null | undefined;
  privacy_setting?: Privacy_Settings_Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  private_notes?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  read_count?: Order_By | null | undefined;
  reading_journal_summary?: Reading_Journals_Summary_Order_By | null | undefined;
  reading_journals_aggregate?: Reading_Journals_Aggregate_Order_By | null | undefined;
  recommended_by?: Order_By | null | undefined;
  recommended_for?: Order_By | null | undefined;
  referrer?: Users_Order_By | null | undefined;
  referrer_user_id?: Order_By | null | undefined;
  review?: Order_By | null | undefined;
  review_has_spoilers?: Order_By | null | undefined;
  review_length?: Order_By | null | undefined;
  review_markdown?: Order_By | null | undefined;
  review_migrated?: Order_By | null | undefined;
  review_raw?: Order_By | null | undefined;
  review_slate?: Order_By | null | undefined;
  reviewed_at?: Order_By | null | undefined;
  sponsored_review?: Order_By | null | undefined;
  starred?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  url?: Order_By | null | undefined;
  user?: Users_Order_By | null | undefined;
  user_book_reads_aggregate?: User_Book_Reads_Aggregate_Order_By | null | undefined;
  user_book_status?: User_Book_Statuses_Order_By | null | undefined;
  user_books_aggregate?: User_Books_Aggregate_Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "user_books" */
export type User_Books_Stddev_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  mod_status?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  owned_copies?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  read_count?: Order_By | null | undefined;
  referrer_user_id?: Order_By | null | undefined;
  review_length?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "user_books" */
export type User_Books_Stddev_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  mod_status?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  owned_copies?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  read_count?: Order_By | null | undefined;
  referrer_user_id?: Order_By | null | undefined;
  review_length?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "user_books" */
export type User_Books_Stddev_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  mod_status?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  owned_copies?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  read_count?: Order_By | null | undefined;
  referrer_user_id?: Order_By | null | undefined;
  review_length?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "user_books" */
export type User_Books_Sum_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  mod_status?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  owned_copies?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  read_count?: Order_By | null | undefined;
  referrer_user_id?: Order_By | null | undefined;
  review_length?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "user_books" */
export type User_Books_Var_Pop_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  mod_status?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  owned_copies?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  read_count?: Order_By | null | undefined;
  referrer_user_id?: Order_By | null | undefined;
  review_length?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "user_books" */
export type User_Books_Var_Samp_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  mod_status?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  owned_copies?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  read_count?: Order_By | null | undefined;
  referrer_user_id?: Order_By | null | undefined;
  review_length?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "user_books" */
export type User_Books_Variance_Order_By = {
  book_id?: Order_By | null | undefined;
  edition_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  likes_count?: Order_By | null | undefined;
  mod_status?: Order_By | null | undefined;
  original_book_id?: Order_By | null | undefined;
  original_edition_id?: Order_By | null | undefined;
  owned_copies?: Order_By | null | undefined;
  privacy_setting_id?: Order_By | null | undefined;
  rating?: Order_By | null | undefined;
  read_count?: Order_By | null | undefined;
  referrer_user_id?: Order_By | null | undefined;
  review_length?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "user_flags" */
export type User_Flags_Aggregate_Order_By = {
  avg?: User_Flags_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: User_Flags_Max_Order_By | null | undefined;
  min?: User_Flags_Min_Order_By | null | undefined;
  stddev?: User_Flags_Stddev_Order_By | null | undefined;
  stddev_pop?: User_Flags_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: User_Flags_Stddev_Samp_Order_By | null | undefined;
  sum?: User_Flags_Sum_Order_By | null | undefined;
  var_pop?: User_Flags_Var_Pop_Order_By | null | undefined;
  var_samp?: User_Flags_Var_Samp_Order_By | null | undefined;
  variance?: User_Flags_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "user_flags" */
export type User_Flags_Avg_Order_By = {
  action_id?: Order_By | null | undefined;
  flag_status_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  reported_user_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "user_flags" */
export type User_Flags_Max_Order_By = {
  action_id?: Order_By | null | undefined;
  action_type?: Order_By | null | undefined;
  category?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  details?: Order_By | null | undefined;
  flag_status_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  reported_user_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by min() on columns of table "user_flags" */
export type User_Flags_Min_Order_By = {
  action_id?: Order_By | null | undefined;
  action_type?: Order_By | null | undefined;
  category?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  details?: Order_By | null | undefined;
  flag_status_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  reported_user_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "user_flags" */
export type User_Flags_Stddev_Order_By = {
  action_id?: Order_By | null | undefined;
  flag_status_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  reported_user_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "user_flags" */
export type User_Flags_Stddev_Pop_Order_By = {
  action_id?: Order_By | null | undefined;
  flag_status_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  reported_user_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "user_flags" */
export type User_Flags_Stddev_Samp_Order_By = {
  action_id?: Order_By | null | undefined;
  flag_status_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  reported_user_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "user_flags" */
export type User_Flags_Sum_Order_By = {
  action_id?: Order_By | null | undefined;
  flag_status_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  reported_user_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "user_flags" */
export type User_Flags_Var_Pop_Order_By = {
  action_id?: Order_By | null | undefined;
  flag_status_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  reported_user_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "user_flags" */
export type User_Flags_Var_Samp_Order_By = {
  action_id?: Order_By | null | undefined;
  flag_status_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  reported_user_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "user_flags" */
export type User_Flags_Variance_Order_By = {
  action_id?: Order_By | null | undefined;
  flag_status_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  reported_user_id?: Order_By | null | undefined;
  user_id?: Order_By | null | undefined;
};

/** order by aggregate values of table "users" */
export type Users_Aggregate_Order_By = {
  avg?: Users_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Users_Max_Order_By | null | undefined;
  min?: Users_Min_Order_By | null | undefined;
  stddev?: Users_Stddev_Order_By | null | undefined;
  stddev_pop?: Users_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Users_Stddev_Samp_Order_By | null | undefined;
  sum?: Users_Sum_Order_By | null | undefined;
  var_pop?: Users_Var_Pop_Order_By | null | undefined;
  var_samp?: Users_Var_Samp_Order_By | null | undefined;
  variance?: Users_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "users" */
export type Users_Avg_Order_By = {
  access_level?: Order_By | null | undefined;
  account_privacy_setting_id?: Order_By | null | undefined;
  activity_privacy_settings_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  default_reading_format_id?: Order_By | null | undefined;
  followed_users_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  payment_system_id?: Order_By | null | undefined;
  referrer_id?: Order_By | null | undefined;
  sign_in_count?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
};

/** order by max() on columns of table "users" */
export type Users_Max_Order_By = {
  access_level?: Order_By | null | undefined;
  account_privacy_setting_id?: Order_By | null | undefined;
  activity_privacy_settings_id?: Order_By | null | undefined;
  bio?: Order_By | null | undefined;
  birthdate?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  confirmation_sent_at?: Order_By | null | undefined;
  confirmed_at?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  current_sign_in_at?: Order_By | null | undefined;
  default_reading_format_id?: Order_By | null | undefined;
  email?: Order_By | null | undefined;
  email_verified?: Order_By | null | undefined;
  flair?: Order_By | null | undefined;
  followed_users_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  last_activity_at?: Order_By | null | undefined;
  last_sign_in_at?: Order_By | null | undefined;
  link?: Order_By | null | undefined;
  location?: Order_By | null | undefined;
  locked_at?: Order_By | null | undefined;
  membership?: Order_By | null | undefined;
  membership_ends_at?: Order_By | null | undefined;
  name?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  payment_system_id?: Order_By | null | undefined;
  pronoun_personal?: Order_By | null | undefined;
  pronoun_possessive?: Order_By | null | undefined;
  referrer_id?: Order_By | null | undefined;
  referrer_url?: Order_By | null | undefined;
  remember_created_at?: Order_By | null | undefined;
  reset_password_sent_at?: Order_By | null | undefined;
  sign_in_count?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
  timezone?: Order_By | null | undefined;
  unconfirmed_email?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  username?: Order_By | null | undefined;
};

/** order by min() on columns of table "users" */
export type Users_Min_Order_By = {
  access_level?: Order_By | null | undefined;
  account_privacy_setting_id?: Order_By | null | undefined;
  activity_privacy_settings_id?: Order_By | null | undefined;
  bio?: Order_By | null | undefined;
  birthdate?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  confirmation_sent_at?: Order_By | null | undefined;
  confirmed_at?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  current_sign_in_at?: Order_By | null | undefined;
  default_reading_format_id?: Order_By | null | undefined;
  email?: Order_By | null | undefined;
  email_verified?: Order_By | null | undefined;
  flair?: Order_By | null | undefined;
  followed_users_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  last_activity_at?: Order_By | null | undefined;
  last_sign_in_at?: Order_By | null | undefined;
  link?: Order_By | null | undefined;
  location?: Order_By | null | undefined;
  locked_at?: Order_By | null | undefined;
  membership?: Order_By | null | undefined;
  membership_ends_at?: Order_By | null | undefined;
  name?: Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  payment_system_id?: Order_By | null | undefined;
  pronoun_personal?: Order_By | null | undefined;
  pronoun_possessive?: Order_By | null | undefined;
  referrer_id?: Order_By | null | undefined;
  referrer_url?: Order_By | null | undefined;
  remember_created_at?: Order_By | null | undefined;
  reset_password_sent_at?: Order_By | null | undefined;
  sign_in_count?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
  timezone?: Order_By | null | undefined;
  unconfirmed_email?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  username?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "users". */
export type Users_Order_By = {
  access_level?: Order_By | null | undefined;
  account_privacy_setting_id?: Order_By | null | undefined;
  activities_aggregate?: Activities_Aggregate_Order_By | null | undefined;
  activity_privacy_settings_id?: Order_By | null | undefined;
  admin?: Order_By | null | undefined;
  bio?: Order_By | null | undefined;
  birthdate?: Order_By | null | undefined;
  blocked_users_aggregate?: User_Blocks_Aggregate_Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  cached_cover?: Order_By | null | undefined;
  cached_genres?: Order_By | null | undefined;
  cached_image?: Order_By | null | undefined;
  collection_imports_aggregate?: Collection_Imports_Aggregate_Order_By | null | undefined;
  confirmation_sent_at?: Order_By | null | undefined;
  confirmed_at?: Order_By | null | undefined;
  created_at?: Order_By | null | undefined;
  current_sign_in_at?: Order_By | null | undefined;
  default_reading_format_id?: Order_By | null | undefined;
  email?: Order_By | null | undefined;
  email_verified?: Order_By | null | undefined;
  flair?: Order_By | null | undefined;
  followed_by_users_aggregate?: Followed_Users_Aggregate_Order_By | null | undefined;
  followed_lists_aggregate?: Followed_Lists_Aggregate_Order_By | null | undefined;
  followed_prompts_aggregate?: Followed_Prompts_Aggregate_Order_By | null | undefined;
  followed_users_aggregate?: Followed_Users_Aggregate_Order_By | null | undefined;
  followed_users_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  follows_aggregate?: Follows_Aggregate_Order_By | null | undefined;
  goals_aggregate?: Goals_Aggregate_Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image?: Images_Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  last_activity_at?: Order_By | null | undefined;
  last_sign_in_at?: Order_By | null | undefined;
  librarian_roles?: Order_By | null | undefined;
  link?: Order_By | null | undefined;
  links?: Links_Order_By | null | undefined;
  lists_aggregate?: Lists_Aggregate_Order_By | null | undefined;
  location?: Order_By | null | undefined;
  locked_at?: Order_By | null | undefined;
  membership?: Order_By | null | undefined;
  membership_ends_at?: Order_By | null | undefined;
  name?: Order_By | null | undefined;
  notification_deliveries_aggregate?: Notification_Deliveries_Aggregate_Order_By | null | undefined;
  object_type?: Order_By | null | undefined;
  onboarded?: Order_By | null | undefined;
  payment_system_id?: Order_By | null | undefined;
  pro?: Order_By | null | undefined;
  prompt_answers_aggregate?: Prompt_Answers_Aggregate_Order_By | null | undefined;
  prompts_aggregate?: Prompts_Aggregate_Order_By | null | undefined;
  pronoun_personal?: Order_By | null | undefined;
  pronoun_possessive?: Order_By | null | undefined;
  referrer_id?: Order_By | null | undefined;
  referrer_url?: Order_By | null | undefined;
  referrered_users_aggregate?: User_Books_Aggregate_Order_By | null | undefined;
  remember_created_at?: Order_By | null | undefined;
  reported_user_flags_aggregate?: User_Flags_Aggregate_Order_By | null | undefined;
  reset_password_sent_at?: Order_By | null | undefined;
  sign_in_count?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
  taggings_aggregate?: Taggings_Aggregate_Order_By | null | undefined;
  timezone?: Order_By | null | undefined;
  unconfirmed_email?: Order_By | null | undefined;
  updated_at?: Order_By | null | undefined;
  user_books_aggregate?: User_Books_Aggregate_Order_By | null | undefined;
  user_flags_aggregate?: User_Flags_Aggregate_Order_By | null | undefined;
  username?: Order_By | null | undefined;
};

/** order by stddev() on columns of table "users" */
export type Users_Stddev_Order_By = {
  access_level?: Order_By | null | undefined;
  account_privacy_setting_id?: Order_By | null | undefined;
  activity_privacy_settings_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  default_reading_format_id?: Order_By | null | undefined;
  followed_users_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  payment_system_id?: Order_By | null | undefined;
  referrer_id?: Order_By | null | undefined;
  sign_in_count?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "users" */
export type Users_Stddev_Pop_Order_By = {
  access_level?: Order_By | null | undefined;
  account_privacy_setting_id?: Order_By | null | undefined;
  activity_privacy_settings_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  default_reading_format_id?: Order_By | null | undefined;
  followed_users_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  payment_system_id?: Order_By | null | undefined;
  referrer_id?: Order_By | null | undefined;
  sign_in_count?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "users" */
export type Users_Stddev_Samp_Order_By = {
  access_level?: Order_By | null | undefined;
  account_privacy_setting_id?: Order_By | null | undefined;
  activity_privacy_settings_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  default_reading_format_id?: Order_By | null | undefined;
  followed_users_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  payment_system_id?: Order_By | null | undefined;
  referrer_id?: Order_By | null | undefined;
  sign_in_count?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
};

/** order by sum() on columns of table "users" */
export type Users_Sum_Order_By = {
  access_level?: Order_By | null | undefined;
  account_privacy_setting_id?: Order_By | null | undefined;
  activity_privacy_settings_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  default_reading_format_id?: Order_By | null | undefined;
  followed_users_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  payment_system_id?: Order_By | null | undefined;
  referrer_id?: Order_By | null | undefined;
  sign_in_count?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "users" */
export type Users_Var_Pop_Order_By = {
  access_level?: Order_By | null | undefined;
  account_privacy_setting_id?: Order_By | null | undefined;
  activity_privacy_settings_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  default_reading_format_id?: Order_By | null | undefined;
  followed_users_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  payment_system_id?: Order_By | null | undefined;
  referrer_id?: Order_By | null | undefined;
  sign_in_count?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "users" */
export type Users_Var_Samp_Order_By = {
  access_level?: Order_By | null | undefined;
  account_privacy_setting_id?: Order_By | null | undefined;
  activity_privacy_settings_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  default_reading_format_id?: Order_By | null | undefined;
  followed_users_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  payment_system_id?: Order_By | null | undefined;
  referrer_id?: Order_By | null | undefined;
  sign_in_count?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
};

/** order by variance() on columns of table "users" */
export type Users_Variance_Order_By = {
  access_level?: Order_By | null | undefined;
  account_privacy_setting_id?: Order_By | null | undefined;
  activity_privacy_settings_id?: Order_By | null | undefined;
  books_count?: Order_By | null | undefined;
  default_reading_format_id?: Order_By | null | undefined;
  followed_users_count?: Order_By | null | undefined;
  followers_count?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  image_id?: Order_By | null | undefined;
  payment_system_id?: Order_By | null | undefined;
  referrer_id?: Order_By | null | undefined;
  sign_in_count?: Order_By | null | undefined;
  status_id?: Order_By | null | undefined;
};

export type BookSummaryFragment = { id: number, slug: string | null, title: string | null, subtitle: string | null, pages: number | null, rating: number | null, releaseYear: number | null, audioSeconds: number | null, ratingsCount: number, usersCount: number, cachedImage: unknown, cachedContributors: unknown };

export type BookDetailFragment = { headline: string | null, description: string | null, id: number, slug: string | null, title: string | null, subtitle: string | null, pages: number | null, rating: number | null, releaseDate: string | null, editionsCount: number, cachedTags: unknown, releaseYear: number | null, audioSeconds: number | null, ratingsCount: number, usersCount: number, cachedImage: unknown, cachedContributors: unknown, contributions: Array<{ contribution: string | null, author: { id: number, slug: string | null, name: string, cachedImage: unknown, booksCount: number } | null }>, bookSeries: Array<{ position: number | null, series: { id: number, slug: string, name: string, booksCount: number, primaryBooksCount: number | null, isCompleted: boolean | null } | null }> };

export type AuthorSummaryFragment = { id: number, slug: string | null, name: string, cachedImage: unknown, booksCount: number };

export type SeriesSummaryFragment = { id: number, slug: string, name: string, booksCount: number, primaryBooksCount: number | null, isCompleted: boolean | null };

export type EditionSummaryFragment = { id: number, title: string | null, subtitle: string | null, asin: string | null, pages: number | null, bookId: number, isbn10: string | null, isbn13: string | null, audioSeconds: number | null, releaseDate: string | null, releaseYear: number | null, readingFormatId: number, editionFormat: string | null, cachedImage: unknown, language: { code2: string | null, language: string } | null, publisher: { id: number, name: string | null, slug: string } | null };

export type JournalEntryFragment = { id: number, event: string | null, entry: string | null, metadata: unknown, bookId: number | null, editionId: number | null, privacySettingId: number, actionAt: string, createdAt: string };

export type GoalFragment = { id: number, metric: string, goal: number, progress: number, description: string | null, conditions: unknown, archived: boolean, state: string, startDate: string, endDate: string, completedAt: string | null, privacySettingId: number | null };

export type UserBookReadFragment = { id: number, progress: number | null, userBookId: number, editionId: number | null, startedAt: string | null, finishedAt: string | null, finishedAtPrecision: number | null, pausedAt: string | null, progressPages: number | null, progressSeconds: number | null, edition: { id: number, pages: number | null, audioSeconds: number | null, readingFormatId: number } | null };

export type UserBookFragment = { id: number, rating: number | null, owned: boolean, bookId: number, editionId: number | null, userId: number, statusId: number, privacySettingId: number, hasReview: boolean, readCount: number, dateAdded: string, firstStartedReadingDate: string | null, lastReadDate: string | null, updatedAt: string | null, userBookReads: Array<{ id: number, progress: number | null, userBookId: number, editionId: number | null, startedAt: string | null, finishedAt: string | null, finishedAtPrecision: number | null, pausedAt: string | null, progressPages: number | null, progressSeconds: number | null, edition: { id: number, pages: number | null, audioSeconds: number | null, readingFormatId: number } | null }> };

export type UserBookFullFragment = { id: number, rating: number | null, owned: boolean, reviewMarkdown: string | null, reviewHasSpoilers: boolean, reviewedAt: string | null, privateNotes: string | null, recommendedBy: string | null, recommendedFor: string | null, bookId: number, editionId: number | null, userId: number, statusId: number, privacySettingId: number, hasReview: boolean, readCount: number, dateAdded: string, firstStartedReadingDate: string | null, lastReadDate: string | null, updatedAt: string | null, userBookReads: Array<{ id: number, progress: number | null, userBookId: number, editionId: number | null, startedAt: string | null, finishedAt: string | null, finishedAtPrecision: number | null, pausedAt: string | null, progressPages: number | null, progressSeconds: number | null, edition: { id: number, pages: number | null, audioSeconds: number | null, readingFormatId: number } | null }> };

export type ListSummaryFragment = { id: number, slug: string | null, name: string, description: string | null, ranked: boolean, privacySettingId: number, defaultView: string, booksCount: number, likesCount: number, userId: number, createdAt: string | null, updatedAt: string | null };

export type ListBookFragment = { id: number, position: number | null, reason: string | null, listId: number, bookId: number, editionId: number | null, dateAdded: string | null };

export type UserProfileFragment = { id: number, username: string | null, name: string | null, bio: string | null, flair: string | null, pro: boolean, cachedImage: unknown, booksCount: number, followersCount: number, followedUsersCount: number, createdAt: string };

export type MeFragment = { timezone: string | null, id: number, username: string | null, name: string | null, bio: string | null, flair: string | null, pro: boolean, defaultReadingFormatId: number | null, accountPrivacySettingId: number, cachedImage: unknown, booksCount: number, followersCount: number, followedUsersCount: number, createdAt: string };

export type CreateGoalMutationVariables = Exact<{
  object: GoalInput;
}>;


export type CreateGoalMutation = { insert_goal: { id: number | null, errors: Array<string | null> | null, goal: { id: number, metric: string, goal: number, progress: number, description: string | null, conditions: unknown, archived: boolean, state: string, startDate: string, endDate: string, completedAt: string | null, privacySettingId: number | null } | null } | null };

export type UpdateGoalMutationVariables = Exact<{
  id: number;
  object: GoalInput;
}>;


export type UpdateGoalMutation = { update_goal: { id: number | null, errors: Array<string | null> | null, goal: { id: number, metric: string, goal: number, progress: number, description: string | null, conditions: unknown, archived: boolean, state: string, startDate: string, endDate: string, completedAt: string | null, privacySettingId: number | null } | null } | null };

export type RefreshGoalProgressMutationVariables = Exact<{
  id: number;
}>;


export type RefreshGoalProgressMutation = { update_goal_progress: { id: number | null, errors: Array<string | null> | null, goal: { id: number, metric: string, goal: number, progress: number, description: string | null, conditions: unknown, archived: boolean, state: string, startDate: string, endDate: string, completedAt: string | null, privacySettingId: number | null } | null } | null };

export type DeleteGoalMutationVariables = Exact<{
  id: number;
}>;


export type DeleteGoalMutation = { delete_goal: { id: number | null, errors: Array<string | null> | null } | null };

export type AddJournalEntryMutationVariables = Exact<{
  object: ReadingJournalCreateType;
}>;


export type AddJournalEntryMutation = { insert_reading_journal: { id: number | null, errors: Array<string | null> | null, readingJournal: { id: number, event: string | null, entry: string | null, metadata: unknown, bookId: number | null, editionId: number | null, privacySettingId: number, actionAt: string, createdAt: string } | null } | null };

export type UpdateJournalEntryMutationVariables = Exact<{
  id: number;
  object: ReadingJournalUpdateType;
}>;


export type UpdateJournalEntryMutation = { update_reading_journal: { id: number | null, errors: Array<string | null> | null, readingJournal: { id: number, event: string | null, entry: string | null, metadata: unknown, bookId: number | null, editionId: number | null, privacySettingId: number, actionAt: string, createdAt: string } | null } | null };

export type DeleteJournalEntryMutationVariables = Exact<{
  id: number;
}>;


export type DeleteJournalEntryMutation = { delete_reading_journal: { id: number } | null };

export type ClearJournalForBookMutationVariables = Exact<{
  bookId: number;
}>;


export type ClearJournalForBookMutation = { delete_reading_journals_for_book: { ids: Array<number | null> | null } | null };

export type AddUserBookMutationVariables = Exact<{
  object: UserBookCreateInput;
}>;


export type AddUserBookMutation = { insert_user_book: { id: number | null, error: string | null, userBook: { id: number, rating: number | null, owned: boolean, reviewMarkdown: string | null, reviewHasSpoilers: boolean, reviewedAt: string | null, privateNotes: string | null, recommendedBy: string | null, recommendedFor: string | null, bookId: number, editionId: number | null, userId: number, statusId: number, privacySettingId: number, hasReview: boolean, readCount: number, dateAdded: string, firstStartedReadingDate: string | null, lastReadDate: string | null, updatedAt: string | null, userBookReads: Array<{ id: number, progress: number | null, userBookId: number, editionId: number | null, startedAt: string | null, finishedAt: string | null, finishedAtPrecision: number | null, pausedAt: string | null, progressPages: number | null, progressSeconds: number | null, edition: { id: number, pages: number | null, audioSeconds: number | null, readingFormatId: number } | null }> } | null } | null };

export type UpdateUserBookMutationVariables = Exact<{
  id: number;
  object: UserBookUpdateInput;
}>;


export type UpdateUserBookMutation = { update_user_book: { id: number | null, error: string | null, userBook: { id: number, rating: number | null, owned: boolean, reviewMarkdown: string | null, reviewHasSpoilers: boolean, reviewedAt: string | null, privateNotes: string | null, recommendedBy: string | null, recommendedFor: string | null, bookId: number, editionId: number | null, userId: number, statusId: number, privacySettingId: number, hasReview: boolean, readCount: number, dateAdded: string, firstStartedReadingDate: string | null, lastReadDate: string | null, updatedAt: string | null, userBookReads: Array<{ id: number, progress: number | null, userBookId: number, editionId: number | null, startedAt: string | null, finishedAt: string | null, finishedAtPrecision: number | null, pausedAt: string | null, progressPages: number | null, progressSeconds: number | null, edition: { id: number, pages: number | null, audioSeconds: number | null, readingFormatId: number } | null }> } | null } | null };

export type RemoveUserBookMutationVariables = Exact<{
  id: number;
}>;


export type RemoveUserBookMutation = { delete_user_book: { id: number | null, bookId: number | null, userId: number | null } | null };

export type AddUserBookReadMutationVariables = Exact<{
  userBookId: number;
  read: DatesReadInput;
}>;


export type AddUserBookReadMutation = { insert_user_book_read: { id: number | null, error: string | null, userBookRead: { id: number, progress: number | null, userBookId: number, editionId: number | null, startedAt: string | null, finishedAt: string | null, finishedAtPrecision: number | null, pausedAt: string | null, progressPages: number | null, progressSeconds: number | null, edition: { id: number, pages: number | null, audioSeconds: number | null, readingFormatId: number } | null } | null } | null };

export type UpdateUserBookReadMutationVariables = Exact<{
  id: number;
  read: DatesReadInput;
}>;


export type UpdateUserBookReadMutation = { update_user_book_read: { id: number | null, error: string | null, userBookRead: { id: number, progress: number | null, userBookId: number, editionId: number | null, startedAt: string | null, finishedAt: string | null, finishedAtPrecision: number | null, pausedAt: string | null, progressPages: number | null, progressSeconds: number | null, edition: { id: number, pages: number | null, audioSeconds: number | null, readingFormatId: number } | null } | null } | null };

export type RemoveUserBookReadMutationVariables = Exact<{
  id: number;
}>;


export type RemoveUserBookReadMutation = { delete_user_book_read: { id: number | null, error: string | null } | null };

export type CreateListMutationVariables = Exact<{
  object: ListInput;
}>;


export type CreateListMutation = { insert_list: { id: number | null, errors: Array<string | null> | null, list: { id: number, slug: string | null, name: string, description: string | null, ranked: boolean, privacySettingId: number, defaultView: string, booksCount: number, likesCount: number, userId: number, createdAt: string | null, updatedAt: string | null } | null } | null };

export type UpdateListMutationVariables = Exact<{
  id: number;
  object: ListInput;
}>;


export type UpdateListMutation = { update_list: { id: number | null, errors: Array<string | null> | null, list: { id: number, slug: string | null, name: string, description: string | null, ranked: boolean, privacySettingId: number, defaultView: string, booksCount: number, likesCount: number, userId: number, createdAt: string | null, updatedAt: string | null } | null } | null };

export type DeleteListMutationVariables = Exact<{
  id: number;
}>;


export type DeleteListMutation = { delete_list: { success: boolean } | null };

export type AddBookToListMutationVariables = Exact<{
  object: ListBookInput;
}>;


export type AddBookToListMutation = { insert_list_book: { id: number | null, listBook: { id: number, position: number | null, reason: string | null, listId: number, bookId: number, editionId: number | null, dateAdded: string | null } | null } | null };

export type RemoveListBookMutationVariables = Exact<{
  id: number;
}>;


export type RemoveListBookMutation = { delete_list_book: { id: number | null, listId: number | null } | null };

export type GetBookQueryVariables = Exact<{
  id: number;
}>;


export type GetBookQuery = { books_by_pk: { headline: string | null, description: string | null, id: number, slug: string | null, title: string | null, subtitle: string | null, pages: number | null, rating: number | null, releaseDate: string | null, editionsCount: number, cachedTags: unknown, releaseYear: number | null, audioSeconds: number | null, ratingsCount: number, usersCount: number, cachedImage: unknown, cachedContributors: unknown, contributions: Array<{ contribution: string | null, author: { id: number, slug: string | null, name: string, cachedImage: unknown, booksCount: number } | null }>, bookSeries: Array<{ position: number | null, series: { id: number, slug: string, name: string, booksCount: number, primaryBooksCount: number | null, isCompleted: boolean | null } | null }> } | null };

export type GetBookBySlugQueryVariables = Exact<{
  slug: string;
}>;


export type GetBookBySlugQuery = { books: Array<{ headline: string | null, description: string | null, id: number, slug: string | null, title: string | null, subtitle: string | null, pages: number | null, rating: number | null, releaseDate: string | null, editionsCount: number, cachedTags: unknown, releaseYear: number | null, audioSeconds: number | null, ratingsCount: number, usersCount: number, cachedImage: unknown, cachedContributors: unknown, contributions: Array<{ contribution: string | null, author: { id: number, slug: string | null, name: string, cachedImage: unknown, booksCount: number } | null }>, bookSeries: Array<{ position: number | null, series: { id: number, slug: string, name: string, booksCount: number, primaryBooksCount: number | null, isCompleted: boolean | null } | null }> }> };

export type GetBooksQueryVariables = Exact<{
  ids: Array<number> | number;
}>;


export type GetBooksQuery = { books: Array<{ id: number, slug: string | null, title: string | null, subtitle: string | null, pages: number | null, rating: number | null, releaseYear: number | null, audioSeconds: number | null, ratingsCount: number, usersCount: number, cachedImage: unknown, cachedContributors: unknown }> };

export type GetEditionsForBookQueryVariables = Exact<{
  bookId: number;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type GetEditionsForBookQuery = { editions: Array<{ id: number, title: string | null, subtitle: string | null, asin: string | null, pages: number | null, bookId: number, isbn10: string | null, isbn13: string | null, audioSeconds: number | null, releaseDate: string | null, releaseYear: number | null, readingFormatId: number, editionFormat: string | null, cachedImage: unknown, language: { code2: string | null, language: string } | null, publisher: { id: number, name: string | null, slug: string } | null }> };

export type FindEditionsByIsbnQueryVariables = Exact<{
  isbns: Array<string> | string;
}>;


export type FindEditionsByIsbnQuery = { editions: Array<{ id: number, title: string | null, subtitle: string | null, asin: string | null, pages: number | null, bookId: number, isbn10: string | null, isbn13: string | null, audioSeconds: number | null, releaseDate: string | null, releaseYear: number | null, readingFormatId: number, editionFormat: string | null, cachedImage: unknown, book: { id: number, slug: string | null, title: string | null, subtitle: string | null, pages: number | null, rating: number | null, releaseYear: number | null, audioSeconds: number | null, ratingsCount: number, usersCount: number, cachedImage: unknown, cachedContributors: unknown }, language: { code2: string | null, language: string } | null, publisher: { id: number, name: string | null, slug: string } | null }> };

export type TrendingBookIdsQueryVariables = Exact<{
  duration?: TrendingDuration | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type TrendingBookIdsQuery = { books_trending: { ids: Array<number | null> | null, error: string | null } | null };

export type GetJournalForBookQueryVariables = Exact<{
  userId: number;
  bookId: number;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type GetJournalForBookQuery = { reading_journals: Array<{ id: number, event: string | null, entry: string | null, metadata: unknown, bookId: number | null, editionId: number | null, privacySettingId: number, actionAt: string, createdAt: string }> };

export type GetGoalsQueryVariables = Exact<{
  userId: number;
  includeArchived?: boolean | null | undefined;
}>;


export type GetGoalsQuery = { goals: Array<{ id: number, metric: string, goal: number, progress: number, description: string | null, conditions: unknown, archived: boolean, state: string, startDate: string, endDate: string, completedAt: string | null, privacySettingId: number | null }> };

export type GetGoalQueryVariables = Exact<{
  id: number;
}>;


export type GetGoalQuery = { goals_by_pk: { id: number, metric: string, goal: number, progress: number, description: string | null, conditions: unknown, archived: boolean, state: string, startDate: string, endDate: string, completedAt: string | null, privacySettingId: number | null } | null };

export type GetLibraryQueryVariables = Exact<{
  userId: number;
  statusIds?: Array<number> | number | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
  orderBy?: Array<User_Books_Order_By> | User_Books_Order_By | null | undefined;
}>;


export type GetLibraryQuery = { user_books: Array<{ id: number, rating: number | null, owned: boolean, bookId: number, editionId: number | null, userId: number, statusId: number, privacySettingId: number, hasReview: boolean, readCount: number, dateAdded: string, firstStartedReadingDate: string | null, lastReadDate: string | null, updatedAt: string | null, book: { id: number, slug: string | null, title: string | null, subtitle: string | null, pages: number | null, rating: number | null, releaseYear: number | null, audioSeconds: number | null, ratingsCount: number, usersCount: number, cachedImage: unknown, cachedContributors: unknown }, edition: { id: number, title: string | null, subtitle: string | null, asin: string | null, pages: number | null, bookId: number, isbn10: string | null, isbn13: string | null, audioSeconds: number | null, releaseDate: string | null, releaseYear: number | null, readingFormatId: number, editionFormat: string | null, cachedImage: unknown, language: { code2: string | null, language: string } | null, publisher: { id: number, name: string | null, slug: string } | null } | null, userBookReads: Array<{ id: number, progress: number | null, userBookId: number, editionId: number | null, startedAt: string | null, finishedAt: string | null, finishedAtPrecision: number | null, pausedAt: string | null, progressPages: number | null, progressSeconds: number | null, edition: { id: number, pages: number | null, audioSeconds: number | null, readingFormatId: number } | null }> }> };

export type CountLibraryQueryVariables = Exact<{
  userId: number;
  statusIds?: Array<number> | number | null | undefined;
}>;


export type CountLibraryQuery = { user_books_aggregate: { aggregate: { count: number } | null } };

export type GetUserBookForBookQueryVariables = Exact<{
  userId: number;
  bookId: number;
}>;


export type GetUserBookForBookQuery = { user_books: Array<{ id: number, rating: number | null, owned: boolean, reviewMarkdown: string | null, reviewHasSpoilers: boolean, reviewedAt: string | null, privateNotes: string | null, recommendedBy: string | null, recommendedFor: string | null, bookId: number, editionId: number | null, userId: number, statusId: number, privacySettingId: number, hasReview: boolean, readCount: number, dateAdded: string, firstStartedReadingDate: string | null, lastReadDate: string | null, updatedAt: string | null, edition: { id: number, title: string | null, subtitle: string | null, asin: string | null, pages: number | null, bookId: number, isbn10: string | null, isbn13: string | null, audioSeconds: number | null, releaseDate: string | null, releaseYear: number | null, readingFormatId: number, editionFormat: string | null, cachedImage: unknown, language: { code2: string | null, language: string } | null, publisher: { id: number, name: string | null, slug: string } | null } | null, userBookReads: Array<{ id: number, progress: number | null, userBookId: number, editionId: number | null, startedAt: string | null, finishedAt: string | null, finishedAtPrecision: number | null, pausedAt: string | null, progressPages: number | null, progressSeconds: number | null, edition: { id: number, pages: number | null, audioSeconds: number | null, readingFormatId: number } | null }> }> };

export type GetUserBookQueryVariables = Exact<{
  id: number;
}>;


export type GetUserBookQuery = { user_books_by_pk: { id: number, rating: number | null, owned: boolean, reviewMarkdown: string | null, reviewHasSpoilers: boolean, reviewedAt: string | null, privateNotes: string | null, recommendedBy: string | null, recommendedFor: string | null, bookId: number, editionId: number | null, userId: number, statusId: number, privacySettingId: number, hasReview: boolean, readCount: number, dateAdded: string, firstStartedReadingDate: string | null, lastReadDate: string | null, updatedAt: string | null, book: { id: number, slug: string | null, title: string | null, subtitle: string | null, pages: number | null, rating: number | null, releaseYear: number | null, audioSeconds: number | null, ratingsCount: number, usersCount: number, cachedImage: unknown, cachedContributors: unknown }, edition: { id: number, title: string | null, subtitle: string | null, asin: string | null, pages: number | null, bookId: number, isbn10: string | null, isbn13: string | null, audioSeconds: number | null, releaseDate: string | null, releaseYear: number | null, readingFormatId: number, editionFormat: string | null, cachedImage: unknown, language: { code2: string | null, language: string } | null, publisher: { id: number, name: string | null, slug: string } | null } | null, userBookReads: Array<{ id: number, progress: number | null, userBookId: number, editionId: number | null, startedAt: string | null, finishedAt: string | null, finishedAtPrecision: number | null, pausedAt: string | null, progressPages: number | null, progressSeconds: number | null, edition: { id: number, pages: number | null, audioSeconds: number | null, readingFormatId: number } | null }> } | null };

export type GetListsForUserQueryVariables = Exact<{
  userId: number;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type GetListsForUserQuery = { lists: Array<{ id: number, slug: string | null, name: string, description: string | null, ranked: boolean, privacySettingId: number, defaultView: string, booksCount: number, likesCount: number, userId: number, createdAt: string | null, updatedAt: string | null }> };

export type GetListQueryVariables = Exact<{
  id: number;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type GetListQuery = { lists_by_pk: { id: number, slug: string | null, name: string, description: string | null, ranked: boolean, privacySettingId: number, defaultView: string, booksCount: number, likesCount: number, userId: number, createdAt: string | null, updatedAt: string | null, listBooks: Array<{ id: number, position: number | null, reason: string | null, listId: number, bookId: number, editionId: number | null, dateAdded: string | null, book: { id: number, slug: string | null, title: string | null, subtitle: string | null, pages: number | null, rating: number | null, releaseYear: number | null, audioSeconds: number | null, ratingsCount: number, usersCount: number, cachedImage: unknown, cachedContributors: unknown } }> } | null };

export type FindListBookQueryVariables = Exact<{
  listId: number;
  bookId: number;
}>;


export type FindListBookQuery = { list_books: Array<{ id: number, position: number | null, reason: string | null, listId: number, bookId: number, editionId: number | null, dateAdded: string | null }> };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: Array<{ timezone: string | null, id: number, username: string | null, name: string | null, bio: string | null, flair: string | null, pro: boolean, defaultReadingFormatId: number | null, accountPrivacySettingId: number, cachedImage: unknown, booksCount: number, followersCount: number, followedUsersCount: number, createdAt: string }> };

export type SearchQueryVariables = Exact<{
  query: string;
  queryType?: string | null | undefined;
  page?: number | null | undefined;
  perPage?: number | null | undefined;
  fields?: string | null | undefined;
  weights?: string | null | undefined;
  typos?: string | null | undefined;
  sort?: string | null | undefined;
  filterBy?: string | null | undefined;
}>;


export type SearchQuery = { search: { ids: Array<number | null> | null, results: unknown, query: string | null, page: number | null, error: string | null, queryType: string | null, perPage: number | null } | null };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const BookSummaryFragmentDoc = new TypedDocumentString(`
    fragment BookSummary on books {
  id
  slug
  title
  subtitle
  releaseYear: release_year
  pages
  audioSeconds: audio_seconds
  rating
  ratingsCount: ratings_count
  usersCount: users_count
  cachedImage: cached_image
  cachedContributors: cached_contributors
}
    `, {"fragmentName":"BookSummary"}) as unknown as TypedDocumentString<BookSummaryFragment, unknown>;
export const AuthorSummaryFragmentDoc = new TypedDocumentString(`
    fragment AuthorSummary on authors {
  id
  slug
  name
  cachedImage: cached_image
  booksCount: books_count
}
    `, {"fragmentName":"AuthorSummary"}) as unknown as TypedDocumentString<AuthorSummaryFragment, unknown>;
export const SeriesSummaryFragmentDoc = new TypedDocumentString(`
    fragment SeriesSummary on series {
  id
  slug
  name
  booksCount: books_count
  primaryBooksCount: primary_books_count
  isCompleted: is_completed
}
    `, {"fragmentName":"SeriesSummary"}) as unknown as TypedDocumentString<SeriesSummaryFragment, unknown>;
export const BookDetailFragmentDoc = new TypedDocumentString(`
    fragment BookDetail on books {
  ...BookSummary
  headline
  description
  releaseDate: release_date
  editionsCount: editions_count
  cachedTags: cached_tags
  contributions {
    contribution
    author {
      ...AuthorSummary
    }
  }
  bookSeries: book_series(where: { series: { canonical_id: { _is_null: true } } }) {
    position
    series {
      ...SeriesSummary
    }
  }
}
    fragment BookSummary on books {
  id
  slug
  title
  subtitle
  releaseYear: release_year
  pages
  audioSeconds: audio_seconds
  rating
  ratingsCount: ratings_count
  usersCount: users_count
  cachedImage: cached_image
  cachedContributors: cached_contributors
}
fragment AuthorSummary on authors {
  id
  slug
  name
  cachedImage: cached_image
  booksCount: books_count
}
fragment SeriesSummary on series {
  id
  slug
  name
  booksCount: books_count
  primaryBooksCount: primary_books_count
  isCompleted: is_completed
}`, {"fragmentName":"BookDetail"}) as unknown as TypedDocumentString<BookDetailFragment, unknown>;
export const EditionSummaryFragmentDoc = new TypedDocumentString(`
    fragment EditionSummary on editions {
  id
  bookId: book_id
  title
  subtitle
  isbn10: isbn_10
  isbn13: isbn_13
  asin
  pages
  audioSeconds: audio_seconds
  releaseDate: release_date
  releaseYear: release_year
  readingFormatId: reading_format_id
  editionFormat: edition_format
  cachedImage: cached_image
  language {
    code2
    language
  }
  publisher {
    id
    name
    slug
  }
}
    `, {"fragmentName":"EditionSummary"}) as unknown as TypedDocumentString<EditionSummaryFragment, unknown>;
export const JournalEntryFragmentDoc = new TypedDocumentString(`
    fragment JournalEntry on reading_journals {
  id
  bookId: book_id
  editionId: edition_id
  event
  entry
  metadata
  privacySettingId: privacy_setting_id
  actionAt: action_at
  createdAt: created_at
}
    `, {"fragmentName":"JournalEntry"}) as unknown as TypedDocumentString<JournalEntryFragment, unknown>;
export const GoalFragmentDoc = new TypedDocumentString(`
    fragment Goal on goals {
  id
  metric
  goal
  progress
  description
  startDate: start_date
  endDate: end_date
  conditions
  archived
  completedAt: completed_at
  state
  privacySettingId: privacy_setting_id
}
    `, {"fragmentName":"Goal"}) as unknown as TypedDocumentString<GoalFragment, unknown>;
export const UserBookReadFragmentDoc = new TypedDocumentString(`
    fragment UserBookRead on user_book_reads {
  id
  userBookId: user_book_id
  editionId: edition_id
  startedAt: started_at
  finishedAt: finished_at
  finishedAtPrecision: finished_at_precision
  pausedAt: paused_at
  progress
  progressPages: progress_pages
  progressSeconds: progress_seconds
  edition {
    id
    pages
    audioSeconds: audio_seconds
    readingFormatId: reading_format_id
  }
}
    `, {"fragmentName":"UserBookRead"}) as unknown as TypedDocumentString<UserBookReadFragment, unknown>;
export const UserBookFragmentDoc = new TypedDocumentString(`
    fragment UserBook on user_books {
  id
  bookId: book_id
  editionId: edition_id
  userId: user_id
  statusId: status_id
  rating
  privacySettingId: privacy_setting_id
  hasReview: has_review
  owned
  readCount: read_count
  dateAdded: date_added
  firstStartedReadingDate: first_started_reading_date
  lastReadDate: last_read_date
  updatedAt: updated_at
  userBookReads: user_book_reads(order_by: { id: desc }) {
    ...UserBookRead
  }
}
    fragment UserBookRead on user_book_reads {
  id
  userBookId: user_book_id
  editionId: edition_id
  startedAt: started_at
  finishedAt: finished_at
  finishedAtPrecision: finished_at_precision
  pausedAt: paused_at
  progress
  progressPages: progress_pages
  progressSeconds: progress_seconds
  edition {
    id
    pages
    audioSeconds: audio_seconds
    readingFormatId: reading_format_id
  }
}`, {"fragmentName":"UserBook"}) as unknown as TypedDocumentString<UserBookFragment, unknown>;
export const UserBookFullFragmentDoc = new TypedDocumentString(`
    fragment UserBookFull on user_books {
  ...UserBook
  reviewMarkdown: review_markdown
  reviewHasSpoilers: review_has_spoilers
  reviewedAt: reviewed_at
  privateNotes: private_notes
  recommendedBy: recommended_by
  recommendedFor: recommended_for
}
    fragment UserBookRead on user_book_reads {
  id
  userBookId: user_book_id
  editionId: edition_id
  startedAt: started_at
  finishedAt: finished_at
  finishedAtPrecision: finished_at_precision
  pausedAt: paused_at
  progress
  progressPages: progress_pages
  progressSeconds: progress_seconds
  edition {
    id
    pages
    audioSeconds: audio_seconds
    readingFormatId: reading_format_id
  }
}
fragment UserBook on user_books {
  id
  bookId: book_id
  editionId: edition_id
  userId: user_id
  statusId: status_id
  rating
  privacySettingId: privacy_setting_id
  hasReview: has_review
  owned
  readCount: read_count
  dateAdded: date_added
  firstStartedReadingDate: first_started_reading_date
  lastReadDate: last_read_date
  updatedAt: updated_at
  userBookReads: user_book_reads(order_by: { id: desc }) {
    ...UserBookRead
  }
}`, {"fragmentName":"UserBookFull"}) as unknown as TypedDocumentString<UserBookFullFragment, unknown>;
export const ListSummaryFragmentDoc = new TypedDocumentString(`
    fragment ListSummary on lists {
  id
  slug
  name
  description
  privacySettingId: privacy_setting_id
  ranked
  defaultView: default_view
  booksCount: books_count
  likesCount: likes_count
  userId: user_id
  createdAt: created_at
  updatedAt: updated_at
}
    `, {"fragmentName":"ListSummary"}) as unknown as TypedDocumentString<ListSummaryFragment, unknown>;
export const ListBookFragmentDoc = new TypedDocumentString(`
    fragment ListBook on list_books {
  id
  listId: list_id
  bookId: book_id
  editionId: edition_id
  position
  reason
  dateAdded: date_added
}
    `, {"fragmentName":"ListBook"}) as unknown as TypedDocumentString<ListBookFragment, unknown>;
export const UserProfileFragmentDoc = new TypedDocumentString(`
    fragment UserProfile on users {
  id
  username
  name
  bio
  flair
  cachedImage: cached_image
  booksCount: books_count
  followersCount: followers_count
  followedUsersCount: followed_users_count
  pro
  createdAt: created_at
}
    `, {"fragmentName":"UserProfile"}) as unknown as TypedDocumentString<UserProfileFragment, unknown>;
export const MeFragmentDoc = new TypedDocumentString(`
    fragment Me on users {
  ...UserProfile
  timezone
  defaultReadingFormatId: default_reading_format_id
  accountPrivacySettingId: account_privacy_setting_id
}
    fragment UserProfile on users {
  id
  username
  name
  bio
  flair
  cachedImage: cached_image
  booksCount: books_count
  followersCount: followers_count
  followedUsersCount: followed_users_count
  pro
  createdAt: created_at
}`, {"fragmentName":"Me"}) as unknown as TypedDocumentString<MeFragment, unknown>;
export const CreateGoalDocument = new TypedDocumentString(`
    mutation CreateGoal($object: GoalInput!) {
  insert_goal(object: $object) {
    id
    errors
    goal {
      ...Goal
    }
  }
}
    fragment Goal on goals {
  id
  metric
  goal
  progress
  description
  startDate: start_date
  endDate: end_date
  conditions
  archived
  completedAt: completed_at
  state
  privacySettingId: privacy_setting_id
}`) as unknown as TypedDocumentString<CreateGoalMutation, CreateGoalMutationVariables>;
export const UpdateGoalDocument = new TypedDocumentString(`
    mutation UpdateGoal($id: Int!, $object: GoalInput!) {
  update_goal(id: $id, object: $object) {
    id
    errors
    goal {
      ...Goal
    }
  }
}
    fragment Goal on goals {
  id
  metric
  goal
  progress
  description
  startDate: start_date
  endDate: end_date
  conditions
  archived
  completedAt: completed_at
  state
  privacySettingId: privacy_setting_id
}`) as unknown as TypedDocumentString<UpdateGoalMutation, UpdateGoalMutationVariables>;
export const RefreshGoalProgressDocument = new TypedDocumentString(`
    mutation RefreshGoalProgress($id: Int!) {
  update_goal_progress(id: $id) {
    id
    errors
    goal {
      ...Goal
    }
  }
}
    fragment Goal on goals {
  id
  metric
  goal
  progress
  description
  startDate: start_date
  endDate: end_date
  conditions
  archived
  completedAt: completed_at
  state
  privacySettingId: privacy_setting_id
}`) as unknown as TypedDocumentString<RefreshGoalProgressMutation, RefreshGoalProgressMutationVariables>;
export const DeleteGoalDocument = new TypedDocumentString(`
    mutation DeleteGoal($id: Int!) {
  delete_goal(id: $id) {
    id
    errors
  }
}
    `) as unknown as TypedDocumentString<DeleteGoalMutation, DeleteGoalMutationVariables>;
export const AddJournalEntryDocument = new TypedDocumentString(`
    mutation AddJournalEntry($object: ReadingJournalCreateType!) {
  insert_reading_journal(object: $object) {
    id
    errors
    readingJournal: reading_journal {
      ...JournalEntry
    }
  }
}
    fragment JournalEntry on reading_journals {
  id
  bookId: book_id
  editionId: edition_id
  event
  entry
  metadata
  privacySettingId: privacy_setting_id
  actionAt: action_at
  createdAt: created_at
}`) as unknown as TypedDocumentString<AddJournalEntryMutation, AddJournalEntryMutationVariables>;
export const UpdateJournalEntryDocument = new TypedDocumentString(`
    mutation UpdateJournalEntry($id: Int!, $object: ReadingJournalUpdateType!) {
  update_reading_journal(id: $id, object: $object) {
    id
    errors
    readingJournal: reading_journal {
      ...JournalEntry
    }
  }
}
    fragment JournalEntry on reading_journals {
  id
  bookId: book_id
  editionId: edition_id
  event
  entry
  metadata
  privacySettingId: privacy_setting_id
  actionAt: action_at
  createdAt: created_at
}`) as unknown as TypedDocumentString<UpdateJournalEntryMutation, UpdateJournalEntryMutationVariables>;
export const DeleteJournalEntryDocument = new TypedDocumentString(`
    mutation DeleteJournalEntry($id: Int!) {
  delete_reading_journal(id: $id) {
    id
  }
}
    `) as unknown as TypedDocumentString<DeleteJournalEntryMutation, DeleteJournalEntryMutationVariables>;
export const ClearJournalForBookDocument = new TypedDocumentString(`
    mutation ClearJournalForBook($bookId: Int!) {
  delete_reading_journals_for_book(book_id: $bookId) {
    ids
  }
}
    `) as unknown as TypedDocumentString<ClearJournalForBookMutation, ClearJournalForBookMutationVariables>;
export const AddUserBookDocument = new TypedDocumentString(`
    mutation AddUserBook($object: UserBookCreateInput!) {
  insert_user_book(object: $object) {
    id
    error
    userBook: user_book {
      ...UserBookFull
    }
  }
}
    fragment UserBookRead on user_book_reads {
  id
  userBookId: user_book_id
  editionId: edition_id
  startedAt: started_at
  finishedAt: finished_at
  finishedAtPrecision: finished_at_precision
  pausedAt: paused_at
  progress
  progressPages: progress_pages
  progressSeconds: progress_seconds
  edition {
    id
    pages
    audioSeconds: audio_seconds
    readingFormatId: reading_format_id
  }
}
fragment UserBook on user_books {
  id
  bookId: book_id
  editionId: edition_id
  userId: user_id
  statusId: status_id
  rating
  privacySettingId: privacy_setting_id
  hasReview: has_review
  owned
  readCount: read_count
  dateAdded: date_added
  firstStartedReadingDate: first_started_reading_date
  lastReadDate: last_read_date
  updatedAt: updated_at
  userBookReads: user_book_reads(order_by: { id: desc }) {
    ...UserBookRead
  }
}
fragment UserBookFull on user_books {
  ...UserBook
  reviewMarkdown: review_markdown
  reviewHasSpoilers: review_has_spoilers
  reviewedAt: reviewed_at
  privateNotes: private_notes
  recommendedBy: recommended_by
  recommendedFor: recommended_for
}`) as unknown as TypedDocumentString<AddUserBookMutation, AddUserBookMutationVariables>;
export const UpdateUserBookDocument = new TypedDocumentString(`
    mutation UpdateUserBook($id: Int!, $object: UserBookUpdateInput!) {
  update_user_book(id: $id, object: $object) {
    id
    error
    userBook: user_book {
      ...UserBookFull
    }
  }
}
    fragment UserBookRead on user_book_reads {
  id
  userBookId: user_book_id
  editionId: edition_id
  startedAt: started_at
  finishedAt: finished_at
  finishedAtPrecision: finished_at_precision
  pausedAt: paused_at
  progress
  progressPages: progress_pages
  progressSeconds: progress_seconds
  edition {
    id
    pages
    audioSeconds: audio_seconds
    readingFormatId: reading_format_id
  }
}
fragment UserBook on user_books {
  id
  bookId: book_id
  editionId: edition_id
  userId: user_id
  statusId: status_id
  rating
  privacySettingId: privacy_setting_id
  hasReview: has_review
  owned
  readCount: read_count
  dateAdded: date_added
  firstStartedReadingDate: first_started_reading_date
  lastReadDate: last_read_date
  updatedAt: updated_at
  userBookReads: user_book_reads(order_by: { id: desc }) {
    ...UserBookRead
  }
}
fragment UserBookFull on user_books {
  ...UserBook
  reviewMarkdown: review_markdown
  reviewHasSpoilers: review_has_spoilers
  reviewedAt: reviewed_at
  privateNotes: private_notes
  recommendedBy: recommended_by
  recommendedFor: recommended_for
}`) as unknown as TypedDocumentString<UpdateUserBookMutation, UpdateUserBookMutationVariables>;
export const RemoveUserBookDocument = new TypedDocumentString(`
    mutation RemoveUserBook($id: Int!) {
  delete_user_book(id: $id) {
    id
    bookId: book_id
    userId: user_id
  }
}
    `) as unknown as TypedDocumentString<RemoveUserBookMutation, RemoveUserBookMutationVariables>;
export const AddUserBookReadDocument = new TypedDocumentString(`
    mutation AddUserBookRead($userBookId: Int!, $read: DatesReadInput!) {
  insert_user_book_read(user_book_id: $userBookId, user_book_read: $read) {
    id
    error
    userBookRead: user_book_read {
      ...UserBookRead
    }
  }
}
    fragment UserBookRead on user_book_reads {
  id
  userBookId: user_book_id
  editionId: edition_id
  startedAt: started_at
  finishedAt: finished_at
  finishedAtPrecision: finished_at_precision
  pausedAt: paused_at
  progress
  progressPages: progress_pages
  progressSeconds: progress_seconds
  edition {
    id
    pages
    audioSeconds: audio_seconds
    readingFormatId: reading_format_id
  }
}`) as unknown as TypedDocumentString<AddUserBookReadMutation, AddUserBookReadMutationVariables>;
export const UpdateUserBookReadDocument = new TypedDocumentString(`
    mutation UpdateUserBookRead($id: Int!, $read: DatesReadInput!) {
  update_user_book_read(id: $id, object: $read) {
    id
    error
    userBookRead: user_book_read {
      ...UserBookRead
    }
  }
}
    fragment UserBookRead on user_book_reads {
  id
  userBookId: user_book_id
  editionId: edition_id
  startedAt: started_at
  finishedAt: finished_at
  finishedAtPrecision: finished_at_precision
  pausedAt: paused_at
  progress
  progressPages: progress_pages
  progressSeconds: progress_seconds
  edition {
    id
    pages
    audioSeconds: audio_seconds
    readingFormatId: reading_format_id
  }
}`) as unknown as TypedDocumentString<UpdateUserBookReadMutation, UpdateUserBookReadMutationVariables>;
export const RemoveUserBookReadDocument = new TypedDocumentString(`
    mutation RemoveUserBookRead($id: Int!) {
  delete_user_book_read(id: $id) {
    id
    error
  }
}
    `) as unknown as TypedDocumentString<RemoveUserBookReadMutation, RemoveUserBookReadMutationVariables>;
export const CreateListDocument = new TypedDocumentString(`
    mutation CreateList($object: ListInput!) {
  insert_list(object: $object) {
    id
    errors
    list {
      ...ListSummary
    }
  }
}
    fragment ListSummary on lists {
  id
  slug
  name
  description
  privacySettingId: privacy_setting_id
  ranked
  defaultView: default_view
  booksCount: books_count
  likesCount: likes_count
  userId: user_id
  createdAt: created_at
  updatedAt: updated_at
}`) as unknown as TypedDocumentString<CreateListMutation, CreateListMutationVariables>;
export const UpdateListDocument = new TypedDocumentString(`
    mutation UpdateList($id: Int!, $object: ListInput!) {
  update_list(id: $id, object: $object) {
    id
    errors
    list {
      ...ListSummary
    }
  }
}
    fragment ListSummary on lists {
  id
  slug
  name
  description
  privacySettingId: privacy_setting_id
  ranked
  defaultView: default_view
  booksCount: books_count
  likesCount: likes_count
  userId: user_id
  createdAt: created_at
  updatedAt: updated_at
}`) as unknown as TypedDocumentString<UpdateListMutation, UpdateListMutationVariables>;
export const DeleteListDocument = new TypedDocumentString(`
    mutation DeleteList($id: Int!) {
  delete_list(id: $id) {
    success
  }
}
    `) as unknown as TypedDocumentString<DeleteListMutation, DeleteListMutationVariables>;
export const AddBookToListDocument = new TypedDocumentString(`
    mutation AddBookToList($object: ListBookInput!) {
  insert_list_book(object: $object) {
    id
    listBook: list_book {
      ...ListBook
    }
  }
}
    fragment ListBook on list_books {
  id
  listId: list_id
  bookId: book_id
  editionId: edition_id
  position
  reason
  dateAdded: date_added
}`) as unknown as TypedDocumentString<AddBookToListMutation, AddBookToListMutationVariables>;
export const RemoveListBookDocument = new TypedDocumentString(`
    mutation RemoveListBook($id: Int!) {
  delete_list_book(id: $id) {
    id
    listId: list_id
  }
}
    `) as unknown as TypedDocumentString<RemoveListBookMutation, RemoveListBookMutationVariables>;
export const GetBookDocument = new TypedDocumentString(`
    query GetBook($id: Int!) {
  books_by_pk(id: $id) {
    ...BookDetail
  }
}
    fragment BookSummary on books {
  id
  slug
  title
  subtitle
  releaseYear: release_year
  pages
  audioSeconds: audio_seconds
  rating
  ratingsCount: ratings_count
  usersCount: users_count
  cachedImage: cached_image
  cachedContributors: cached_contributors
}
fragment BookDetail on books {
  ...BookSummary
  headline
  description
  releaseDate: release_date
  editionsCount: editions_count
  cachedTags: cached_tags
  contributions {
    contribution
    author {
      ...AuthorSummary
    }
  }
  bookSeries: book_series(where: { series: { canonical_id: { _is_null: true } } }) {
    position
    series {
      ...SeriesSummary
    }
  }
}
fragment AuthorSummary on authors {
  id
  slug
  name
  cachedImage: cached_image
  booksCount: books_count
}
fragment SeriesSummary on series {
  id
  slug
  name
  booksCount: books_count
  primaryBooksCount: primary_books_count
  isCompleted: is_completed
}`) as unknown as TypedDocumentString<GetBookQuery, GetBookQueryVariables>;
export const GetBookBySlugDocument = new TypedDocumentString(`
    query GetBookBySlug($slug: String!) {
  books(where: { slug: { _eq: $slug } }, limit: 1) {
    ...BookDetail
  }
}
    fragment BookSummary on books {
  id
  slug
  title
  subtitle
  releaseYear: release_year
  pages
  audioSeconds: audio_seconds
  rating
  ratingsCount: ratings_count
  usersCount: users_count
  cachedImage: cached_image
  cachedContributors: cached_contributors
}
fragment BookDetail on books {
  ...BookSummary
  headline
  description
  releaseDate: release_date
  editionsCount: editions_count
  cachedTags: cached_tags
  contributions {
    contribution
    author {
      ...AuthorSummary
    }
  }
  bookSeries: book_series(where: { series: { canonical_id: { _is_null: true } } }) {
    position
    series {
      ...SeriesSummary
    }
  }
}
fragment AuthorSummary on authors {
  id
  slug
  name
  cachedImage: cached_image
  booksCount: books_count
}
fragment SeriesSummary on series {
  id
  slug
  name
  booksCount: books_count
  primaryBooksCount: primary_books_count
  isCompleted: is_completed
}`) as unknown as TypedDocumentString<GetBookBySlugQuery, GetBookBySlugQueryVariables>;
export const GetBooksDocument = new TypedDocumentString(`
    query GetBooks($ids: [Int!]!) {
  books(where: { id: { _in: $ids } }) {
    ...BookSummary
  }
}
    fragment BookSummary on books {
  id
  slug
  title
  subtitle
  releaseYear: release_year
  pages
  audioSeconds: audio_seconds
  rating
  ratingsCount: ratings_count
  usersCount: users_count
  cachedImage: cached_image
  cachedContributors: cached_contributors
}`) as unknown as TypedDocumentString<GetBooksQuery, GetBooksQueryVariables>;
export const GetEditionsForBookDocument = new TypedDocumentString(`
    query GetEditionsForBook($bookId: Int!, $limit: Int = 25, $offset: Int = 0) {
  editions(
    where: { book_id: { _eq: $bookId } }
    order_by: { users_count: desc }
    limit: $limit
    offset: $offset
  ) {
    ...EditionSummary
  }
}
    fragment EditionSummary on editions {
  id
  bookId: book_id
  title
  subtitle
  isbn10: isbn_10
  isbn13: isbn_13
  asin
  pages
  audioSeconds: audio_seconds
  releaseDate: release_date
  releaseYear: release_year
  readingFormatId: reading_format_id
  editionFormat: edition_format
  cachedImage: cached_image
  language {
    code2
    language
  }
  publisher {
    id
    name
    slug
  }
}`) as unknown as TypedDocumentString<GetEditionsForBookQuery, GetEditionsForBookQueryVariables>;
export const FindEditionsByIsbnDocument = new TypedDocumentString(`
    query FindEditionsByIsbn($isbns: [String!]!) {
  editions(
    where: { _or: [{ isbn_13: { _in: $isbns } }, { isbn_10: { _in: $isbns } }] }
    order_by: { users_count: desc }
  ) {
    ...EditionSummary
    book {
      ...BookSummary
    }
  }
}
    fragment BookSummary on books {
  id
  slug
  title
  subtitle
  releaseYear: release_year
  pages
  audioSeconds: audio_seconds
  rating
  ratingsCount: ratings_count
  usersCount: users_count
  cachedImage: cached_image
  cachedContributors: cached_contributors
}
fragment EditionSummary on editions {
  id
  bookId: book_id
  title
  subtitle
  isbn10: isbn_10
  isbn13: isbn_13
  asin
  pages
  audioSeconds: audio_seconds
  releaseDate: release_date
  releaseYear: release_year
  readingFormatId: reading_format_id
  editionFormat: edition_format
  cachedImage: cached_image
  language {
    code2
    language
  }
  publisher {
    id
    name
    slug
  }
}`) as unknown as TypedDocumentString<FindEditionsByIsbnQuery, FindEditionsByIsbnQueryVariables>;
export const TrendingBookIdsDocument = new TypedDocumentString(`
    query TrendingBookIds($duration: TrendingDuration = month, $limit: Int = 25, $offset: Int = 0) {
  books_trending(duration: $duration, limit: $limit, offset: $offset) {
    ids
    error
  }
}
    `) as unknown as TypedDocumentString<TrendingBookIdsQuery, TrendingBookIdsQueryVariables>;
export const GetJournalForBookDocument = new TypedDocumentString(`
    query GetJournalForBook($userId: Int!, $bookId: Int!, $limit: Int = 25, $offset: Int = 0) {
  reading_journals(
    where: { user_id: { _eq: $userId }, book_id: { _eq: $bookId } }
    order_by: { action_at: desc }
    limit: $limit
    offset: $offset
  ) {
    ...JournalEntry
  }
}
    fragment JournalEntry on reading_journals {
  id
  bookId: book_id
  editionId: edition_id
  event
  entry
  metadata
  privacySettingId: privacy_setting_id
  actionAt: action_at
  createdAt: created_at
}`) as unknown as TypedDocumentString<GetJournalForBookQuery, GetJournalForBookQueryVariables>;
export const GetGoalsDocument = new TypedDocumentString(`
    query GetGoals($userId: Int!, $includeArchived: Boolean = false) {
  goals(
    where: {
      user_id: { _eq: $userId }
      _or: [{ archived: { _eq: false } }, { archived: { _eq: $includeArchived } }]
    }
    order_by: { end_date: desc }
  ) {
    ...Goal
  }
}
    fragment Goal on goals {
  id
  metric
  goal
  progress
  description
  startDate: start_date
  endDate: end_date
  conditions
  archived
  completedAt: completed_at
  state
  privacySettingId: privacy_setting_id
}`) as unknown as TypedDocumentString<GetGoalsQuery, GetGoalsQueryVariables>;
export const GetGoalDocument = new TypedDocumentString(`
    query GetGoal($id: Int!) {
  goals_by_pk(id: $id) {
    ...Goal
  }
}
    fragment Goal on goals {
  id
  metric
  goal
  progress
  description
  startDate: start_date
  endDate: end_date
  conditions
  archived
  completedAt: completed_at
  state
  privacySettingId: privacy_setting_id
}`) as unknown as TypedDocumentString<GetGoalQuery, GetGoalQueryVariables>;
export const GetLibraryDocument = new TypedDocumentString(`
    query GetLibrary($userId: Int!, $statusIds: [Int!] = [1, 2, 3, 4, 5, 6], $limit: Int = 25, $offset: Int = 0, $orderBy: [user_books_order_by!] = [{ updated_at: desc_nulls_last }]) {
  user_books(
    where: { user_id: { _eq: $userId }, status_id: { _in: $statusIds } }
    order_by: $orderBy
    limit: $limit
    offset: $offset
  ) {
    ...UserBook
    book {
      ...BookSummary
    }
    edition {
      ...EditionSummary
    }
  }
}
    fragment BookSummary on books {
  id
  slug
  title
  subtitle
  releaseYear: release_year
  pages
  audioSeconds: audio_seconds
  rating
  ratingsCount: ratings_count
  usersCount: users_count
  cachedImage: cached_image
  cachedContributors: cached_contributors
}
fragment EditionSummary on editions {
  id
  bookId: book_id
  title
  subtitle
  isbn10: isbn_10
  isbn13: isbn_13
  asin
  pages
  audioSeconds: audio_seconds
  releaseDate: release_date
  releaseYear: release_year
  readingFormatId: reading_format_id
  editionFormat: edition_format
  cachedImage: cached_image
  language {
    code2
    language
  }
  publisher {
    id
    name
    slug
  }
}
fragment UserBookRead on user_book_reads {
  id
  userBookId: user_book_id
  editionId: edition_id
  startedAt: started_at
  finishedAt: finished_at
  finishedAtPrecision: finished_at_precision
  pausedAt: paused_at
  progress
  progressPages: progress_pages
  progressSeconds: progress_seconds
  edition {
    id
    pages
    audioSeconds: audio_seconds
    readingFormatId: reading_format_id
  }
}
fragment UserBook on user_books {
  id
  bookId: book_id
  editionId: edition_id
  userId: user_id
  statusId: status_id
  rating
  privacySettingId: privacy_setting_id
  hasReview: has_review
  owned
  readCount: read_count
  dateAdded: date_added
  firstStartedReadingDate: first_started_reading_date
  lastReadDate: last_read_date
  updatedAt: updated_at
  userBookReads: user_book_reads(order_by: { id: desc }) {
    ...UserBookRead
  }
}`) as unknown as TypedDocumentString<GetLibraryQuery, GetLibraryQueryVariables>;
export const CountLibraryDocument = new TypedDocumentString(`
    query CountLibrary($userId: Int!, $statusIds: [Int!] = [1, 2, 3, 4, 5, 6]) {
  user_books_aggregate(
    where: { user_id: { _eq: $userId }, status_id: { _in: $statusIds } }
  ) {
    aggregate {
      count
    }
  }
}
    `) as unknown as TypedDocumentString<CountLibraryQuery, CountLibraryQueryVariables>;
export const GetUserBookForBookDocument = new TypedDocumentString(`
    query GetUserBookForBook($userId: Int!, $bookId: Int!) {
  user_books(
    where: { user_id: { _eq: $userId }, book_id: { _eq: $bookId } }
    limit: 1
  ) {
    ...UserBookFull
    edition {
      ...EditionSummary
    }
  }
}
    fragment EditionSummary on editions {
  id
  bookId: book_id
  title
  subtitle
  isbn10: isbn_10
  isbn13: isbn_13
  asin
  pages
  audioSeconds: audio_seconds
  releaseDate: release_date
  releaseYear: release_year
  readingFormatId: reading_format_id
  editionFormat: edition_format
  cachedImage: cached_image
  language {
    code2
    language
  }
  publisher {
    id
    name
    slug
  }
}
fragment UserBookRead on user_book_reads {
  id
  userBookId: user_book_id
  editionId: edition_id
  startedAt: started_at
  finishedAt: finished_at
  finishedAtPrecision: finished_at_precision
  pausedAt: paused_at
  progress
  progressPages: progress_pages
  progressSeconds: progress_seconds
  edition {
    id
    pages
    audioSeconds: audio_seconds
    readingFormatId: reading_format_id
  }
}
fragment UserBook on user_books {
  id
  bookId: book_id
  editionId: edition_id
  userId: user_id
  statusId: status_id
  rating
  privacySettingId: privacy_setting_id
  hasReview: has_review
  owned
  readCount: read_count
  dateAdded: date_added
  firstStartedReadingDate: first_started_reading_date
  lastReadDate: last_read_date
  updatedAt: updated_at
  userBookReads: user_book_reads(order_by: { id: desc }) {
    ...UserBookRead
  }
}
fragment UserBookFull on user_books {
  ...UserBook
  reviewMarkdown: review_markdown
  reviewHasSpoilers: review_has_spoilers
  reviewedAt: reviewed_at
  privateNotes: private_notes
  recommendedBy: recommended_by
  recommendedFor: recommended_for
}`) as unknown as TypedDocumentString<GetUserBookForBookQuery, GetUserBookForBookQueryVariables>;
export const GetUserBookDocument = new TypedDocumentString(`
    query GetUserBook($id: Int!) {
  user_books_by_pk(id: $id) {
    ...UserBookFull
    book {
      ...BookSummary
    }
    edition {
      ...EditionSummary
    }
  }
}
    fragment BookSummary on books {
  id
  slug
  title
  subtitle
  releaseYear: release_year
  pages
  audioSeconds: audio_seconds
  rating
  ratingsCount: ratings_count
  usersCount: users_count
  cachedImage: cached_image
  cachedContributors: cached_contributors
}
fragment EditionSummary on editions {
  id
  bookId: book_id
  title
  subtitle
  isbn10: isbn_10
  isbn13: isbn_13
  asin
  pages
  audioSeconds: audio_seconds
  releaseDate: release_date
  releaseYear: release_year
  readingFormatId: reading_format_id
  editionFormat: edition_format
  cachedImage: cached_image
  language {
    code2
    language
  }
  publisher {
    id
    name
    slug
  }
}
fragment UserBookRead on user_book_reads {
  id
  userBookId: user_book_id
  editionId: edition_id
  startedAt: started_at
  finishedAt: finished_at
  finishedAtPrecision: finished_at_precision
  pausedAt: paused_at
  progress
  progressPages: progress_pages
  progressSeconds: progress_seconds
  edition {
    id
    pages
    audioSeconds: audio_seconds
    readingFormatId: reading_format_id
  }
}
fragment UserBook on user_books {
  id
  bookId: book_id
  editionId: edition_id
  userId: user_id
  statusId: status_id
  rating
  privacySettingId: privacy_setting_id
  hasReview: has_review
  owned
  readCount: read_count
  dateAdded: date_added
  firstStartedReadingDate: first_started_reading_date
  lastReadDate: last_read_date
  updatedAt: updated_at
  userBookReads: user_book_reads(order_by: { id: desc }) {
    ...UserBookRead
  }
}
fragment UserBookFull on user_books {
  ...UserBook
  reviewMarkdown: review_markdown
  reviewHasSpoilers: review_has_spoilers
  reviewedAt: reviewed_at
  privateNotes: private_notes
  recommendedBy: recommended_by
  recommendedFor: recommended_for
}`) as unknown as TypedDocumentString<GetUserBookQuery, GetUserBookQueryVariables>;
export const GetListsForUserDocument = new TypedDocumentString(`
    query GetListsForUser($userId: Int!, $limit: Int = 25, $offset: Int = 0) {
  lists(
    where: { user_id: { _eq: $userId } }
    order_by: { updated_at: desc_nulls_last }
    limit: $limit
    offset: $offset
  ) {
    ...ListSummary
  }
}
    fragment ListSummary on lists {
  id
  slug
  name
  description
  privacySettingId: privacy_setting_id
  ranked
  defaultView: default_view
  booksCount: books_count
  likesCount: likes_count
  userId: user_id
  createdAt: created_at
  updatedAt: updated_at
}`) as unknown as TypedDocumentString<GetListsForUserQuery, GetListsForUserQueryVariables>;
export const GetListDocument = new TypedDocumentString(`
    query GetList($id: Int!, $limit: Int = 50, $offset: Int = 0) {
  lists_by_pk(id: $id) {
    ...ListSummary
    listBooks: list_books(
      order_by: { position: asc }
      limit: $limit
      offset: $offset
    ) {
      ...ListBook
      book {
        ...BookSummary
      }
    }
  }
}
    fragment BookSummary on books {
  id
  slug
  title
  subtitle
  releaseYear: release_year
  pages
  audioSeconds: audio_seconds
  rating
  ratingsCount: ratings_count
  usersCount: users_count
  cachedImage: cached_image
  cachedContributors: cached_contributors
}
fragment ListSummary on lists {
  id
  slug
  name
  description
  privacySettingId: privacy_setting_id
  ranked
  defaultView: default_view
  booksCount: books_count
  likesCount: likes_count
  userId: user_id
  createdAt: created_at
  updatedAt: updated_at
}
fragment ListBook on list_books {
  id
  listId: list_id
  bookId: book_id
  editionId: edition_id
  position
  reason
  dateAdded: date_added
}`) as unknown as TypedDocumentString<GetListQuery, GetListQueryVariables>;
export const FindListBookDocument = new TypedDocumentString(`
    query FindListBook($listId: Int!, $bookId: Int!) {
  list_books(
    where: { list_id: { _eq: $listId }, book_id: { _eq: $bookId } }
    limit: 1
  ) {
    ...ListBook
  }
}
    fragment ListBook on list_books {
  id
  listId: list_id
  bookId: book_id
  editionId: edition_id
  position
  reason
  dateAdded: date_added
}`) as unknown as TypedDocumentString<FindListBookQuery, FindListBookQueryVariables>;
export const MeDocument = new TypedDocumentString(`
    query Me {
  me {
    ...Me
  }
}
    fragment UserProfile on users {
  id
  username
  name
  bio
  flair
  cachedImage: cached_image
  booksCount: books_count
  followersCount: followers_count
  followedUsersCount: followed_users_count
  pro
  createdAt: created_at
}
fragment Me on users {
  ...UserProfile
  timezone
  defaultReadingFormatId: default_reading_format_id
  accountPrivacySettingId: account_privacy_setting_id
}`) as unknown as TypedDocumentString<MeQuery, MeQueryVariables>;
export const SearchDocument = new TypedDocumentString(`
    query Search($query: String!, $queryType: String = "book", $page: Int = 1, $perPage: Int = 25, $fields: String, $weights: String, $typos: String, $sort: String, $filterBy: String) {
  search(
    query: $query
    query_type: $queryType
    page: $page
    per_page: $perPage
    fields: $fields
    weights: $weights
    typos: $typos
    sort: $sort
    filter_by: $filterBy
  ) {
    ids
    results
    query
    queryType: query_type
    page
    perPage: per_page
    error
  }
}
    `) as unknown as TypedDocumentString<SearchQuery, SearchQueryVariables>;