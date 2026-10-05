import { gql } from 'graphql-request';

// search.items exists in the stable schema, but its creator_ids arg is only available from the
// dev version — hence a separate dev-only operation used solely when creatorIds is supplied, so
// unfiltered ITEMS searches stay on the stable API version. Fold this back into searchItems in
// search-tool.graphql.ts and drop the versionOverride once creator_ids reaches a dated version.
export const searchItemsByCreatorDev = gql`
  query SearchItemsByCreatorDev(
    $query: String!
    $limit: Int
    $workspaceIds: [ID!]
    $boardIds: [ID!]
    $creatorIds: [ID!]
  ) {
    search {
      items(
        query: $query
        limit: $limit
        workspace_ids: $workspaceIds
        board_ids: $boardIds
        creator_ids: $creatorIds
      ) {
        results {
          id
          indexed_data {
            id
            name
            url
            board_id
            workspace_id
          }
        }
      }
    }
  }
`;

// search.overviews is only available in the dev schema; move this query into search-tool.graphql.ts
// and drop the versionOverride once the field is promoted to a stable API version.
export const searchOverviewsDev = gql`
  query SearchOverviewsDev($query: String!, $limit: Int, $workspaceIds: [ID!], $creatorIds: [ID!]) {
    search {
      overviews(query: $query, limit: $limit, workspace_ids: $workspaceIds, creator_ids: $creatorIds) {
        results {
          id
          indexed_data {
            id
            name
            workspace_id
          }
        }
      }
    }
  }
`;
