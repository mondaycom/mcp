import { gql } from 'graphql-request';

export const getBoards = gql`
  query GetBoards($page: Int!, $limit: Int!, $workspace_ids: [ID]) {
    boards(page: $page, limit: $limit, workspace_ids: $workspace_ids) {
      id
      name
      url
    }
  }
`;


export const getDocs = gql`
  query GetDocs($page: Int!, $limit: Int!, $workspace_ids: [ID]) {
    docs(page: $page, limit: $limit, workspace_ids: $workspace_ids) {
      id
      name
      url
    }
  }
`;

export const getFolders = gql`
  query GetFolders($page: Int!, $limit: Int!, $workspace_ids: [ID]) {
    folders(page: $page, limit: $limit, workspace_ids: $workspace_ids) {
      id
      name
    }
  }
`;