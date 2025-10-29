import { gql } from 'graphql-request';

export const getBoards = gql`
  query GetBoards($page: Int!, $limit: Int!, $workspace_ids: [ID]) {
    boards(page:$page, limit:$limit, workspace_ids: $workspace_ids) {
      id
      name
      url
    }
  }
`;

// export const getBoardsByName = gql`
//   query GetBoardsByName($page: Int!, $limit: Int!, $search_term: String!, $workspace_ids: [ID]) {
//     boards_by_name(page:$page, limit:$limit, term: $search_term, workspace_ids: $workspace_ids) {
//       id
//       name
//       url
//     }
//   }
// `;

export const getDocs = gql`
  query GetDocs($page: Int!, $limit: Int!, $workspace_ids: [ID]) {
    docs(page:$page, limit:$limit, workspace_ids: $workspace_ids) {
      id
      name
      url
    }
  }
`;

export const getFolders = gql`
  query GetFolders($page: Int!, $limit: Int!, $workspace_ids: [ID]) {
    folders(page:$page, limit:$limit, workspace_ids: $workspace_ids) {
      id
      name
    }
  }
`;