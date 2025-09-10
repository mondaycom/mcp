import { gql } from 'graphql-request';

export const createFolderTool = gql`
  mutation createFolder(
    $workspaceId: ID!
    $name: String!
    $color: FolderColor
    $fontWeight: FolderFontWeight
    $customIcon: FolderCustomIcon
    $parentFolderId: ID
  ) {
    create_folder(
      workspace_id: $workspaceId
      name: $name
      color: $color
      font_weight: $fontWeight
      custom_icon: $customIcon
      parent_folder_id: $parentFolderId
    ) {
      id
    }
  }
`;
