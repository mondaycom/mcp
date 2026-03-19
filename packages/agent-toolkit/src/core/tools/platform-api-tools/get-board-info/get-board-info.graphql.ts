import { gql } from 'graphql-request';

export const getBoardInfo = gql`
  query GetBoardInfo($boardId: ID!, $includeViews: Boolean!) {
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

      # All Columns with Full Metadata
      columns {
        id
        title
        description
        type
        settings
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

      # Board Views (filters, sorts, and display configurations)
      views @include(if: $includeViews) {
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

export const getBoardInfoJustColumns = gql`
  query GetBoardInfoJustColumns($boardId: ID!) {
    boards(ids: [$boardId]) {
      columns {
        id
        title
        description
        type
        settings
      }
    }
  }
`;
