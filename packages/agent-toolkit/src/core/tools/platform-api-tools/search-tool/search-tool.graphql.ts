import { gql } from 'graphql-request';

export const getFolders = gql`
  query GetFolders($page: Int!, $limit: Int!, $workspace_ids: [ID]) {
    folders(page: $page, limit: $limit, workspace_ids: $workspace_ids) {
      id
      name
    }
  }
`;

export const searchItems = gql`
  query SearchItems(
    $query: String!
    $limit: Int
    $workspaceIds: [ID!]
    $boardIds: [ID!]
    $dateRange: CrossEntityDateRangeInput
  ) {
    search {
      items(query: $query, limit: $limit, workspace_ids: $workspaceIds, board_ids: $boardIds, date_range: $dateRange) {
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

export const searchBoards = gql`
  query SearchBoards(
    $query: String!
    $limit: Int
    $workspaceIds: [ID!]
    $boardIds: [ID!]
    $dateRange: CrossEntityDateRangeInput
  ) {
    search {
      boards(query: $query, limit: $limit, workspace_ids: $workspaceIds, board_ids: $boardIds, date_range: $dateRange) {
        results {
          id
          indexed_data {
            id
            name
            url
            workspace_id
            description
            creator_id
          }
        }
      }
    }
  }
`;

export const searchDocs = gql`
  query SearchDocs($query: String!, $limit: Int, $workspaceIds: [ID!], $dateRange: CrossEntityDateRangeInput) {
    search {
      docs(query: $query, limit: $limit, workspace_ids: $workspaceIds, date_range: $dateRange) {
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

export const searchWorkspaces = gql`
  query SearchWorkspaces(
    $query: String!
    $limit: Int
    $workspaceIds: [ID!]
    $kind: String
    $dateRange: CrossEntityDateRangeInput
  ) {
    search {
      workspaces(query: $query, limit: $limit, workspace_ids: $workspaceIds, kind: $kind, date_range: $dateRange) {
        results {
          id
          indexed_data {
            id
            name
            description
            kind
            state
          }
        }
      }
    }
  }
`;

export const searchUpdates = gql`
  query SearchUpdates(
    $query: String!
    $limit: Int
    $boardIds: [ID!]
    $creatorIds: [ID!]
    $dateRange: CrossEntityDateRangeInput
  ) {
    search {
      updates(query: $query, limit: $limit, board_ids: $boardIds, creator_ids: $creatorIds, date_range: $dateRange) {
        results {
          id
          indexed_data {
            id
            body
            creator_id
            item_id
            board_id
            created_at
            updated_at
          }
        }
      }
    }
  }
`;

export const searchTimelineItems = gql`
  query SearchTimelineItems(
    $query: String!
    $limit: Int
    $boardIds: [ID!]
    $workspaceIds: [ID!]
    $itemIds: [ID!]
    $type: TimelineItemKind
    $productKind: TimelineItemProductKind
    $dateRange: CrossEntityDateRangeInput
  ) {
    search {
      timeline_items(
        query: $query
        limit: $limit
        board_ids: $boardIds
        workspace_ids: $workspaceIds
        item_ids: $itemIds
        type: $type
        product_kind: $productKind
        date_range: $dateRange
      ) {
        results {
          id
          indexed_data {
            id
            title
            summary
            content
            item_id
            board_id
            type
            product_kind
            created_at
            updated_at
          }
        }
      }
    }
  }
`;
