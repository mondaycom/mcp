/**
 * Constants for list_users_and_teams tool limits and configuration
 */

// Enterprise safety limits
export const MAX_USER_LIMIT = 1000; // Maximum users that can be fetched in a single query
export const MAX_USER_IDS = 500; // Maximum user IDs allowed in a single query
export const MAX_TEAM_IDS = 500; // Maximum team IDs allowed in a single query

// Default limits when no specific limit is provided
export const DEFAULT_USER_LIMIT = 1000; // Default limit when no IDs provided
