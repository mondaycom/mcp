import { gql } from 'graphql-request';

// Kept out of `*.graphql.ts` codegen until `notetaker.settings` is in the fetched schema snapshots: the field ships
// from API version 2027-01 (DaPulse/monday-meetings#740). Move it into `user-context.graphql.ts` and use the generated
// type once the schema is refetched.
export const getNotetakerStatusQuery = gql`
  query getNotetakerStatus {
    notetaker {
      settings {
        status
        has_access
        reason
        calendar_connected
        auto_join {
          self_hosted
          invited
          locked {
            self_hosted
            invited
          }
        }
      }
    }
  }
`;

export const NOTETAKER_STATUS_API_VERSION = '2027-01';

// The block is optional context: a slow Notetaker must not hold up the rest of get_user_context.
export const NOTETAKER_STATUS_TIMEOUT_MS = 1500;

export interface NotetakerStatus {
  status: string;
  has_access: boolean;
  reason: string | null;
  calendar_connected: boolean | null;
  auto_join: {
    self_hosted: string;
    invited: string;
    locked: { self_hosted: boolean; invited: boolean };
  };
}

export interface GetNotetakerStatusQuery {
  notetaker?: { settings?: NotetakerStatus | null } | null;
}
