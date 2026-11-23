import { gql } from 'graphql-request';

export const readDocs = gql`
  query readDocs(
    $ids: [ID!]
    $object_ids: [ID!]
    $limit: Int
    $order_by: DocsOrderBy
    $page: Int
    $workspace_ids: [ID]
    $includeBlocks: Boolean = false
    $blocksLimit: Int
    $blocksPage: Int
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
      blocks(limit: $blocksLimit, page: $blocksPage) @include(if: $includeBlocks) {
        id
        type
        parent_block_id
        position
        content
      }
    }
  }
`;

export const getDocVersionHistory = gql`
  query GetDocVersionHistory($docId: ID!, $since: String, $until: String) {
    doc_version_history(doc_id: $docId, since: $since, until: $until) {
      doc_id
      restoring_points {
        date
        user_ids
        type
        agent_attributions {
          agent_id
          entity_type
          agent_name
        }
      }
    }
  }
`;

// No `limit` on boards(): with ids plus limit <= 1 the resolver takes the exposed_to_user/high_level_objects
// path, which drops docs attached to an item (doc column / item docs) and returns boards: [], so their
// comments came back empty. One id without a limit is authorized per board and returns those docs too.
export const getDocComments = gql`
  query GetDocComments($boardId: ID!, $itemsLimit: Int, $updatesLimit: Int) {
    boards(ids: [$boardId]) {
      items_page(limit: $itemsLimit) {
        items {
          id
          name
          updates(limit: $updatesLimit) {
            id
            text_body
            body
            created_at
            creator {
              id
              name
            }
            replies {
              id
              text_body
              body
              created_at
              creator {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`;

export const getDocVersionDiff = gql`
  query GetDocVersionDiff($docId: ID!, $date: String!, $prevDate: String!) {
    doc_version_diff(doc_id: $docId, date: $date, prev_date: $prevDate) {
      doc_id
      blocks {
        id
        type
        summary
        changes {
          added
          deleted
          changed
        }
      }
    }
  }
`;
