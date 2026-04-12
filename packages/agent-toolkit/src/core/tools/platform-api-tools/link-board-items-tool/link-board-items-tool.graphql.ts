import { gql } from 'graphql-request';

export const getLinkCandidateItems = gql`
  query GetLinkCandidateItems(
    $boardId: ID!
    $limit: Int
    $cursor: String
    $columnIds: [String!]
    $queryParams: ItemsQuery
  ) {
    boards(ids: [$boardId]) {
      id
      name
      items_page(limit: $limit, cursor: $cursor, query_params: $queryParams) {
        items {
          id
          name
          column_values(ids: $columnIds) {
            id
            type
            text
            value

            ... on BoardRelationValue {
              linked_item_ids
            }
          }
        }
        cursor
      }
    }
  }
`;
