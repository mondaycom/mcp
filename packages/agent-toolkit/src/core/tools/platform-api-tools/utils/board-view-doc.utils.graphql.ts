import { gql } from 'graphql-request';

// Selects the same fields as the readDocs query so a board-view doc can be handed to the same
// formatting path. The docs() query cannot be used as a second hop here: it filters out objects
// that are nested inside another object, which is exactly what a doc living on a board is.
export const boardViewDocs = gql`
  query boardViewDocs(
    $boardId: ID!
    $viewId: ID
    $includeBlocks: Boolean = false
    $blocksLimit: Int
    $blocksPage: Int
  ) {
    board_view_docs(board_id: $boardId, view_id: $viewId) {
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
