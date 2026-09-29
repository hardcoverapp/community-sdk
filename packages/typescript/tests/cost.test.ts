// The gateway charges one unit per top-level field (app/api/app/services/
// graphql_query_limit.rb). The client counts the same way to pace itself.
import { describe, expect, it } from "vitest";
import { requestCost } from "../src/core/cost.ts";
import { operations } from "../src/index.ts";

describe("requestCost", () => {
  it("counts one for a single-root operation, however deep", () => {
    expect(requestCost(String(operations.GetLibrary))).toBe(1);
    expect(requestCost(String(operations.GetBook))).toBe(1);
  });

  it("counts each aliased root in a batch", () => {
    expect(requestCost("mutation M($b0: ListBookInput!, $b1: ListBookInput!) { b0: insert_list_book(object: $b0) { id } b1: insert_list_book(object: $b1) { id } }")).toBe(2);
  });

  it("counts unaliased roots with arguments and nested selections", () => {
    expect(requestCost(`query D($u: Int!) {
      books(limit: 1, where: { slug: { _is_null: false } }) { id editions(limit: 1) { id } }
      lists(limit: 1, where: { user_id: { _eq: $u } }) { id }
      user_books(limit: 1) { id }
    }`)).toBe(3);
  });

  it("ignores braces and field-like words inside strings and comments", () => {
    expect(requestCost('query { # a { b } c\n search(query: "x { y } z", per_page: 1) { ids } }')).toBe(1);
  });

  it("free fields don't add to the count, but every request costs at least 1", () => {
    // The gateway: [total_fields, 1].max (api/app/controllers/api/application_controller.rb).
    expect(requestCost("query { __schema { types { name } } }")).toBe(1);
    expect(requestCost("mutation { insert_reading_journal(object: {}) { id } }")).toBe(1);
    expect(requestCost("mutation { a: insert_reading_journal(object: {}) { id } b: insert_reading_journal(object: {}) { id } }")).toBe(1);
    expect(requestCost("mutation { insert_reading_journal(object: {}) { id } other: delete_list(id: 1) { success } }")).toBe(1);
    expect(requestCost("mutation { x: delete_list(id: 1) { success } y: delete_list(id: 2) { success } }")).toBe(2);
  });
});
