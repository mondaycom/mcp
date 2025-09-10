import { gql } from 'graphql-request';

export const updateOverviewHierarchy = gql`
  mutation updateOverviewHierarchy($overviewId: ID!, $attributes: UpdateOverviewHierarchyAttributesInput!) {
    update_overview_hierarchy(overview_id: $overviewId, attributes: $attributes) {
      success
      message
      overview {
        id
      }
    }
  }
`;
