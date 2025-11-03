import { gql } from 'graphql-request';

export const deleteItem = gql`
  mutation DeleteItem($id: ID!) {
    delete_item(item_id: $id) {
      id
    }
  }
`;

export const createItem = gql`
  mutation createItem($boardId: ID!, $itemName: String!, $groupId: String, $columnValues: JSON) {
    create_item(board_id: $boardId, item_name: $itemName, group_id: $groupId, column_values: $columnValues) {
      id
      name
    }
  }
`;

export const createUpdate = gql`
  mutation createUpdate($itemId: ID!, $body: String!, $mentionsList: [UpdateMention]) {
    create_update(item_id: $itemId, body: $body, mentions_list: $mentionsList) {
      id
    }
  }
`;

export const getBoardSchema = gql`
  query getBoardSchema($boardId: ID!) {
    boards(ids: [$boardId]) {
      groups {
        id
        title
      }
      columns {
        id
        type
        title
      }
    }
  }
`;

export const changeItemColumnValues = gql`
  mutation changeItemColumnValues($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
    change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
      id
    }
  }
`;

export const moveItemToGroup = gql`
  mutation moveItemToGroup($itemId: ID!, $groupId: String!) {
    move_item_to_group(item_id: $itemId, group_id: $groupId) {
      id
    }
  }
`;

export const createBoard = gql`
  mutation createBoard($boardKind: BoardKind!, $boardName: String!, $boardDescription: String, $workspaceId: ID) {
    create_board(
      board_kind: $boardKind
      board_name: $boardName
      description: $boardDescription
      workspace_id: $workspaceId
      empty: true
    ) {
      id
    }
  }
`;

export const createColumn = gql`
  mutation createColumn(
    $boardId: ID!
    $columnType: ColumnType!
    $columnTitle: String!
    $columnDescription: String
    $columnSettings: JSON
  ) {
    create_column(
      board_id: $boardId
      column_type: $columnType
      title: $columnTitle
      description: $columnDescription
      defaults: $columnSettings
    ) {
      id
    }
  }
`;

export const deleteColumn = gql`
  mutation deleteColumn($boardId: ID!, $columnId: String!) {
    delete_column(board_id: $boardId, column_id: $columnId) {
      id
    }
  }
`;

export const getGraphQLSchema = gql`
  query getGraphQLSchema {
    __schema {
      queryType {
        name
      }
      mutationType {
        name
      }
      types {
        name
        kind
      }
    }
    queryType: __type(name: "Query") {
      name
      fields {
        name
        description
        type {
          name
          kind
          ofType {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
    mutationType: __type(name: "Mutation") {
      name
      fields {
        name
        description
        type {
          name
          kind
          ofType {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  }
`;

export const introspectionQuery = gql`
  query IntrospectionQuery {
    __schema {
      queryType {
        name
      }
      mutationType {
        name
      }
      subscriptionType {
        name
      }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args(includeDeprecated: true) {
          ...InputValue
        }
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args(includeDeprecated: true) {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields(includeDeprecated: true) {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }

  fragment InputValue on __InputValue {
    name
    description
    type {
      ...TypeRef
    }
    defaultValue
    isDeprecated
    deprecationReason
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

// it cant be a variable due to a bug in the API so must be generated string.
export const generateTypeDetailsQuery = (typeName: string) => gql`
  query getTypeDetails {
    __type(name: "${typeName}") {
      name
      description
      kind
      fields {
        name
        description
        type {
          name
          kind
          ofType {
            name
            kind
            ofType {
              name
              kind
              ofType {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
            }
          }
        }
        args {
          name
          description
          type {
            name
            kind
            ofType {
              name
              kind
              ofType {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
            }
          }
          defaultValue
        }
      }
      inputFields {
        name
        description
        type {
          name
          kind
          ofType {
            name
            kind
            ofType {
              name
              kind
              ofType {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
            }
          }
        }
        defaultValue
      }
      interfaces {
        name
      }
      enumValues {
        name
        description
      }
      possibleTypes {
        name
      }
    }
  }
`;

export const createCustomActivity = gql`
  mutation createCustomActivity($color: CustomActivityColor!, $icon_id: CustomActivityIcon!, $name: String!) {
    create_custom_activity(color: $color, icon_id: $icon_id, name: $name) {
      color
      icon_id
      name
    }
  }
`;

export const createTimelineItem = gql`
  mutation createTimelineItem(
    $item_id: ID!
    $custom_activity_id: String!
    $title: String!
    $summary: String
    $content: String
    $timestamp: ISO8601DateTime!
    $time_range: TimelineItemTimeRange
    $location: String
    $phone: String
    $url: String
  ) {
    create_timeline_item(
      item_id: $item_id
      custom_activity_id: $custom_activity_id
      title: $title
      summary: $summary
      content: $content
      timestamp: $timestamp
      time_range: $time_range
      location: $location
      phone: $phone
      url: $url
    ) {
      id
      title
      content
      created_at
      custom_activity_id
      type
    }
  }
`;

export const fetchCustomActivity = gql`
  query fetchCustomActivity {
    custom_activity {
      color
      icon_id
      id
      name
      type
    }
  }
`;

// -----------------------------
// Documents (Docs) Operations
// -----------------------------

export const readDocs = gql`
  query readDocs(
    $ids: [ID!]
    $object_ids: [ID!]
    $limit: Int
    $order_by: DocsOrderBy
    $page: Int
    $workspace_ids: [ID]
  ) {
    docs(
      ids: $ids
      object_ids: $object_ids
      limit: $limit
      order_by: $order_by
      page: $page
      workspace_ids: $workspace_ids
    ) {
      id
      object_id
      name
      doc_kind
      created_at
      created_by {
        id
        name
      }
      settings
      url
      relative_url
      workspace {
        id
        name
      }
      workspace_id
      doc_folder_id
    }
  }
`;

export const exportMarkdownFromDoc = gql`
  query exportMarkdownFromDoc($docId: ID!, $blockIds: [String!]) {
    export_markdown_from_doc(docId: $docId, blockIds: $blockIds) {
      success
      markdown
      error
    }
  }
`;

export const getWorkspaceInfo = gql`
  query getWorkspaceInfo($workspace_id: ID!) {
    workspaces(ids: [$workspace_id]) {
      id
      name
      description
      kind
      created_at
      state
      is_default_workspace
      owners_subscribers {
        id
        name
        email
      }
    }
    boards(workspace_ids: [$workspace_id], limit: 100, order_by: used_at, state: active) {
      id
      name
      board_folder_id
    }
    docs(workspace_ids: [$workspace_id], limit: 100, order_by: used_at) {
      id
      name
      doc_folder_id
    }
    folders(workspace_ids: [$workspace_id], limit: 100) {
      id
      name
    }
  }
`;
