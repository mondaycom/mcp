import { gql } from 'graphql-request';

export const updateFolder = gql`
  mutation updateFolder(
    $folderId: ID!
    $name: String
    $color: FolderColor
    $fontWeight: FolderFontWeight
    $customIcon: FolderCustomIcon
    $parentFolderId: ID
    $workspaceId: ID
    $accountProductId: ID
    $position: DynamicPosition
  ) {
    update_folder(
      folder_id: $folderId
      name: $name
      color: $color
      font_weight: $fontWeight
      custom_icon: $customIcon
      parent_folder_id: $parentFolderId
      workspace_id: $workspaceId
      account_product_id: $accountProductId
      position: $position
    ) {
      id
    }
  }
`;
