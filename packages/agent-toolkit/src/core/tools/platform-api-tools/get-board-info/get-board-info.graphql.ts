import { gql } from 'graphql-request';

export const getBoardInfo = gql`
  query GetBoardInfo(
    $boardId: ID!
    $columnIds: [String]
    $viewIds: [ID!]
    $includeColumns: Boolean!
    $includeViews: Boolean!
  ) {
    boards(ids: [$boardId]) {
      # Basic Board Metadata
      id
      name
      description
      state
      board_kind
      permissions
      url

      # Timestamps
      updated_at

      # Board Configuration
      hierarchy_type
      item_terminology
      items_count
      items_limit

      # Creator Information
      creator {
        id
        name
        email
      }

      # Workspace Information
      workspace {
        id
        name
        kind
        description
      }

      board_folder_id

      # Columns (optionally filtered by id; omitted entirely when includeColumns is false)
      columns(ids: $columnIds) @include(if: $includeColumns) {
        id
        title
        description
        type
        settings
        revision
      }

      # All Groups with Metadata
      groups {
        id
        title
      }

      # Board Owners (Individual Users)
      owners {
        id
        name
      }

      # Team Owners
      team_owners {
        id
        name
        picture_url
      }

      # Board Tags
      tags {
        id
        name
      }

      # Top Group (default group)
      top_group {
        id
      }

      # Views (optionally filtered by id; omitted entirely when includeViews is false)
      views(ids: $viewIds) @include(if: $includeViews) {
        id
        name
        type
        settings
        filter
        sort
      }
    }
  }
`;

/** Lean view index — id/name only, no settings/filter/sort (avoids multi-MB payloads on large boards). */
export const getBoardInfoViewIndex = gql`
  query GetBoardInfoViewIndex($boardId: ID!) {
    boards(ids: [$boardId]) {
      id
      views {
        id
        name
      }
    }
  }
`;

export const getBoardInfoJustColumns = gql`
  query GetBoardInfoJustColumns($boardId: ID!) {
    boards(ids: [$boardId]) {
      columns {
        id
        title
        description
        type
        settings
        revision
      }
    }
  }
`;
