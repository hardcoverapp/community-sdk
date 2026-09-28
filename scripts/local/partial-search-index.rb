# Local-only partial Typesense index for SDK search tests.
#
# A restored staging dump has no search index, so every `search` call returns
# "Not found." This queues the app's own bulk index jobs (Sidekiq "throttled"
# queue) over a small, popular slice: about 10k documents across all eight
# search types, done in a couple of minutes.
#
#   docker cp scripts/local/partial-search-index.rb hardcover-rails:/tmp/
#   docker exec hardcover-rails bin/rails runner /tmp/partial-search-index.rb
#
# Set SDK_TEST_USERNAME to also index that user and their lists.
test_user = User.find_by(username: ENV.fetch("SDK_TEST_USERNAME", "Revelry"))
books = Book.active.where(users_count: 1_000..)
scopes = {
  "books" => [books, SearchIndex::BookBulkJob],
  "authors" => [Author.active.where(id: Contribution.where(contributable_type: "Book", contributable_id: books.select(:id)).select(:author_id)), SearchIndex::AuthorBulkJob],
  "series" => [Series.active.where(id: BookSeries.where(book_id: books.select(:id)).select(:series_id)), SearchIndex::SeriesBulkJob],
  "characters" => [Character.active.where(id: BookCharacter.where(book_id: books.select(:id)).select(:character_id)), SearchIndex::CharacterBulkJob],
  "publishers" => [Publisher.where(editions_count: 500..), SearchIndex::PublisherBulkJob],
  "lists" => [List.where(likes_count: 20..).or(List.where(user_id: test_user&.id)), SearchIndex::ListBulkJob],
  "prompts" => [Prompt.all, SearchIndex::PromptBulkJob],
  "users" => [User.active.where(followers_count: 50..).or(User.where(id: test_user&.id)), SearchIndex::UserBulkJob],
}
scopes.each do |name, (scope, job)|
  count = scope.count
  Search::Indexer.bulk_index(scope, job, batch_size: 500)
  puts "queued #{name}: #{count}"
end
