import { gql } from 'graphql-request';

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
          }
        }
      }
    }
  }
`;
