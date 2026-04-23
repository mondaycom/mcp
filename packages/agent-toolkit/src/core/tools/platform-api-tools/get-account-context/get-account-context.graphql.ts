import { gql } from 'graphql-request';

export const getAccountContextQuery = gql`
  query GetAccountContext {
    me {
      account {
        id
        name
        slug
        tier
        country_code
        created_at
        first_day_of_the_week
        active_members_count
        is_during_trial
        is_trial_expired
        logo
        show_timeline_weekends
        sign_up_product_kind
        plan {
          tier
          period
          max_users
          version
        }
        products {
          id
          kind
          tier
          default_workspace_id
        }
      }
    }
  }
`;
