import { gql } from 'graphql-request';

export const updateDocName = gql`
  mutation updateDocName($docId: ID!, $name: String!) {
    update_doc_name(docId: $docId, name: $name)
  }
`;

export const addContentToDocFromMarkdown = gql`
  mutation addContentToDocFromMarkdown($docId: ID!, $markdown: String!, $afterBlockId: String) {
    add_content_to_doc_from_markdown(docId: $docId, markdown: $markdown, afterBlockId: $afterBlockId) {
      success
      block_ids
      error
    }
  }
`;

export const getDocByObjectId = gql`
  query getDocByObjectId($objectId: [ID!]) {
    docs(object_ids: $objectId) {
      id
    }
  }
`;

// Update an existing block's content
export const updateDocBlock = gql`
  mutation updateDocBlock($blockId: String!, $content: JSON!) {
    update_doc_block(block_id: $blockId, content: $content) {
      id
      type
      created_at
    }
  }
`;

// Delete an existing block by ID
export const deleteDocBlock = gql`
  mutation deleteDocBlock($blockId: String!) {
    delete_doc_block(block_id: $blockId) {
      id
    }
  }
`;

// Get object_id (board ID) from a doc's internal ID
export const getDocObjectIdByDocId = gql`
  query getDocObjectIdByDocId($docId: [ID!]) {
    docs(ids: $docId) {
      id
      object_id
    }
  }
`;

// Get the single item from a doc's backing board (object_id = board ID)
export const getDocBoardItem = gql`
  query getDocBoardItem($boardId: ID!) {
    boards(ids: [$boardId]) {
      items_page(limit: 1) {
        items {
          id
        }
      }
    }
  }
`;

// Create an update (comment/reply) on a doc's backing item
export const createDocComment = gql`
  mutation createDocComment($itemId: ID!, $body: String!, $parentId: ID, $mentionsList: [UpdateMention]) {
    create_update(body: $body, item_id: $itemId, parent_id: $parentId, mentions_list: $mentionsList) {
      id
      body
      created_at
    }
  }
`;

// Create one or more blocks in a document
export const createDocBlocks = gql`
  mutation createDocBlocks($docId: ID!, $afterBlockId: String, $blocksInput: [CreateBlockInput!]!) {
    create_doc_blocks(docId: $docId, afterBlockId: $afterBlockId, blocksInput: $blocksInput) {
      id
      type
      parent_block_id
      created_at
      content {
        ... on TextBlockContent {
          delta_format {
            insert {
              text
            }
            attributes {
              bold
              italic
            }
          }
          alignment
          direction
        }
        ... on ListBlockContent {
          delta_format {
            insert {
              text
            }
            attributes {
              bold
              italic
            }
          }
          alignment
          direction
          indentation
        }
        ... on ImageContent {
          width
          alignment
        }
        ... on VideoContent {
          url
          width
          alignment
        }
        ... on TableContent {
          cells {
            row_cells {
              block_id
            }
          }
        }
        ... on LayoutContent {
          cells {
            block_id
          }
        }
        ... on NoticeBoxContent {
          theme
          alignment
          direction
        }
        ... on DividerContent {
          alignment
          direction
        }
      }
    }
  }
`;
