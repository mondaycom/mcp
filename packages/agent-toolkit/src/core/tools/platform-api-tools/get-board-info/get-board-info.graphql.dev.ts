import { gql } from 'graphql-request';

export const getBoardKnowledge = gql`
  query GetBoardKnowledge($boardId: ID!) {
    entity_knowledge(entity_type: BOARD, entity_id: $boardId) {
      summary
      status
      age_seconds
      sections {
        key
        title
        kind
        confidence
        body_markdown
        data: data_json
      }
    }
  }
`;

// v2: subitem_columns (dev schema, API 2027-04) replaces the second round trip to the subitems board.
export const getBoardInfoV2 = gql`
  query GetBoardInfoV2(
    $boardId: ID!
    $columnIds: [String]
    $viewIds: [ID!]
    $includeColumns: Boolean!
    $includeViews: Boolean!
    $includeSubscribers: Boolean!
  ) {
    boards(ids: [$boardId], limit: 1) {
      id
      name
      description
      state
      board_kind
      permissions
      url
      updated_at
      hierarchy_type
      item_terminology
      items_count
      items_limit
      creator {
        id
        name
        email
      }
      workspace {
        id
        name
        kind
        description
      }
      board_folder_id
      columns(ids: $columnIds) @include(if: $includeColumns) {
        id
        title
        description
        type
        settings
        revision
      }
      subitem_columns @include(if: $includeColumns) {
        id
        title
        description
        type
        settings
        revision
      }
      groups {
        id
        title
      }
      owners {
        id
        name
      }
      team_owners {
        id
        name
        picture_url
      }
      subscribers @include(if: $includeSubscribers) {
        id
        name
      }
      team_subscribers @include(if: $includeSubscribers) {
        id
        name
      }
      tags {
        id
        name
      }
      top_group {
        id
      }
      views(ids: $viewIds) @include(if: $includeViews) {
        id
        name
        type
        settings
        filter
        sort
        view_specific_data_str
      }
    }
  }
`;
