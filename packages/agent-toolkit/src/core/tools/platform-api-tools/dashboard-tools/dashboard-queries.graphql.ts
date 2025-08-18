import { gql } from 'graphql-request';

/**
 * GraphQL queries and mutations for dashboard operations
 */

export const createDashboard = gql`
  mutation CreateDashboard(
    $name: String!
    $workspace_id: Int!
    $board_ids: [String!]!
    $kind: DashboardKind
    $board_folder_id: Int
  ) {
    create_dashboard(
      name: $name
      workspace_id: $workspace_id
      board_ids: $board_ids
      kind: $kind
      board_folder_id: $board_folder_id
    ) {
      id
      name
      workspace_id
      kind
      board_folder_id
    }
  }
`;

export const getAllWidgetsSchema = gql`
  query GetAllWidgetsSchema {
    all_widgets_schema {
      widget_type
      schema
    }
  }
`;

export const createWidget = gql`
  mutation CreateWidget($parent: WidgetParentInput!, $kind: ExternalWidget!, $name: String!, $settings: JSON!) {
    create_widget(parent: $parent, kind: $kind, name: $name, settings: $settings) {
      id
      name
      kind
      parent {
        kind
        id
      }
    }
  }
`;
