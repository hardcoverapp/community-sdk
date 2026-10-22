// The type that ties a generated document to its result and variables. It's
// the same shape as DocumentTypeDecoration in @graphql-typed-document-node/core,
// declared here so the published package has no dependencies (that package
// pulls in `graphql` as a peer). Structurally identical, so generated
// documents still work with other typed GraphQL clients.
export interface DocumentTypeDecoration<TResult, TVariables> {
  /** Never set at runtime; it only carries the result and variables types. */
  __apiType?: (variables: TVariables) => TResult;
}
