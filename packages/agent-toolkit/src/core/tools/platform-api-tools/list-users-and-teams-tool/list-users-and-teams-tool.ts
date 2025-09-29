import { z } from 'zod';
import {
  GetUserByNameQuery,
  GetUserByNameQueryVariables,
  GetCurrentUserQuery,
  ListUsersAndTeamsQuery,
  ListUsersAndTeamsQueryVariables,
  ListUsersWithTeamsQuery,
  ListUsersWithTeamsQueryVariables,
  ListTeamsWithMembersQuery,
  ListTeamsWithMembersQueryVariables,
  ListUsersOnlyQuery,
  ListUsersOnlyQueryVariables,
  ListTeamsOnlyQuery,
  ListTeamsOnlyQueryVariables,
} from '../../../../monday-graphql/generated/graphql';
import {
  listUsersAndTeams,
  listUsersWithTeams,
  listTeamsWithMembers,
  listTeamsOnly,
  listUsersOnly,
  getUserByName,
  getCurrentUser,
} from './list-users-and-teams.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { formatUsersAndTeams } from './helpers';
import { FormattedResponse } from './types';
import { MAX_USER_IDS, MAX_TEAM_IDS, DEFAULT_USER_LIMIT } from './constants';

export const listUsersAndTeamsToolSchema = {
  userIds: z
    .array(z.string())
    .max(MAX_USER_IDS)
    .optional()
    .describe(
      'Specific user IDs to fetch.[IMPORTANT] ALWAYS use when you have user IDs in context. PREFER over general search. RETURNS: user profiles including team memberships',
    ),
  teamIds: z
    .array(z.string())
    .max(MAX_TEAM_IDS)
    .optional()
    .describe(
      `Specific team IDs to fetch.[IMPORTANT] ALWAYS use when you have team IDs in context, NEVER fetch all teams if specific IDs are available.
      RETURNS: Team details with owners and optional member data.`,
    ),
  name: z
    .string()
    .optional()
    .describe(
      `Name-based user search. STANDALONE parameter - cannot be combined with others. PREFERRED method for finding users when you know names. Performs fuzzy matching.
      This parameter CONFLICTS with all others.`,
    ),
  getMe: z
    .boolean()
    .optional()
    .describe(
      `[TOP PRIORITY] Use ALWAYS when requesting current user information. Examples of when it should be used: ["get my user" or "get my teams"].
      This parameter CONFLICTS with all others. `,
    ),
  includeTeams: z
    .boolean()
    .optional()
    .describe(
      `[AVOID] This fetches all teams in the account. To fetch a specific user's teams just fetch that user by id and you will get their team memberships.`,
    ),
  teamsOnly: z
    .boolean()
    .optional()
    .describe('Fetch only teams, no users returned. Combine with includeTeamMembers for member details.'),
  includeTeamMembers: z
    .boolean()
    .optional()
    .describe('Set to true only when you need additional member details for teams other than names and ids.'),
};

export class ListUsersAndTeamsTool extends BaseMondayApiTool<typeof listUsersAndTeamsToolSchema> {
  name = 'list_users_and_teams';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'List Users and Teams',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Tool to fetch users and/or teams data. 

      MANDATORY BEST PRACTICES:
      1. ALWAYS use specific IDs or names when available
      2. If no ids available, use name search if possible
      3. Use 'getMe: true' to get current user information
      4. AVOID broad queries (no parameters) - use only as last resort

      REQUIRED PARAMETER PRIORITY (use in this order):
      1. getMe - STANDALONE
      2. userIds
      3. name - STANDALONE  
      4. teamIds + teamsOnly
      5. No parameters - LAST RESORT

      CRITICAL USAGE RULES:
      • userIds + teamIds requires explicit includeTeams: true flag
      • includeTeams: true fetches both users and teams, do not use this to fetch a specific user's teams rather fetch that user by id and you will get their team memberships.`;
  }

  getInputSchema(): typeof listUsersAndTeamsToolSchema {
    return listUsersAndTeamsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof listUsersAndTeamsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const hasUserIds = input.userIds && input.userIds.length > 0;
    const hasTeamIds = input.teamIds && input.teamIds.length > 0;
    const includeTeams = input.includeTeams || false;
    const teamsOnly = input.teamsOnly || false;
    const includeTeamMembers = input.includeTeamMembers || false;
    const hasName = !!input.name;
    const getMe = input.getMe || false;

    // Handle getMe parameter (standalone operation)
    if (getMe) {
      if (hasUserIds || hasTeamIds || includeTeams || teamsOnly || includeTeamMembers || hasName) {
        return {
          content:
            'PARAMETER_CONFLICT: getMe is STANDALONE only. Remove all other parameters when using getMe: true for current user lookup.',
        };
      }

      const res = await this.mondayApi.request<GetCurrentUserQuery>(getCurrentUser);

      if (!res.me) {
        return {
          content: 'AUTHENTICATION_ERROR: Current user fetch failed. Verify API token and user permissions.',
        };
      }

      // Convert single user response to our FormattedResponse format
      const formattedRes: FormattedResponse = {
        users: [res.me as any], // Cast needed because the fragments match but types might differ slightly
      };

      const content = formatUsersAndTeams(formattedRes);
      return { content };
    }

    // Handle name parameter (standalone search operation)
    if (hasName) {
      if (hasUserIds || hasTeamIds || includeTeams || teamsOnly || includeTeamMembers) {
        return {
          content:
            'PARAMETER_CONFLICT: name is STANDALONE only. Remove userIds, teamIds, includeTeams, teamsOnly, and includeTeamMembers when using name search.',
        };
      }

      const variables: GetUserByNameQueryVariables = {
        name: input.name,
      };

      const res = await this.mondayApi.request<GetUserByNameQuery>(getUserByName, variables);

      if (!res.users || res.users.length === 0) {
        return {
          content: `NAME_SEARCH_EMPTY: No users found matching "${input.name}". Try broader search terms or verify user exists in account.`,
        };
      }

      // Convert basic user search response to simplified format
      const userList = res.users
        .filter((user) => user !== null)
        .map((user) => `• **${user!.name}** (ID: ${user!.id})${user!.title ? ` - ${user!.title}` : ''}`)
        .join('\n');

      const content = `Found ${res.users.length} user(s) matching "${input.name}":\n\n${userList}`;
      return { content };
    }

    // Validate conflicting flags for regular operations
    if (teamsOnly && includeTeams) {
      return {
        content:
          'PARAMETER_CONFLICT: Cannot use teamsOnly: true with includeTeams: true. Use teamsOnly for teams-only queries or includeTeams for combined data.',
      };
    }

    // Early validation
    if (hasUserIds && input.userIds && input.userIds.length > MAX_USER_IDS) {
      return {
        content: `LIMIT_EXCEEDED: userIds array too large (${input.userIds.length}/${MAX_USER_IDS}). Split into batches of max ${MAX_USER_IDS} IDs and make multiple calls.`,
      };
    }

    if (hasTeamIds && input.teamIds && input.teamIds.length > MAX_TEAM_IDS) {
      return {
        content: `LIMIT_EXCEEDED: teamIds array too large (${input.teamIds.length}/${MAX_TEAM_IDS}). Split into batches of max ${MAX_TEAM_IDS} IDs and make multiple calls.`,
      };
    }

    let res: FormattedResponse;

    // Determine what to fetch based on flags and IDs
    if (teamsOnly || (!hasUserIds && hasTeamIds && !includeTeams)) {
      // Fetch only teams - use efficient query unless detailed member info is requested
      if (includeTeamMembers) {
        // Fetch teams with detailed member information
        const variables: ListTeamsWithMembersQueryVariables = {
          teamIds: input.teamIds,
        };
        res = await this.mondayApi.request<ListTeamsWithMembersQuery>(listTeamsWithMembers, variables);
      } else {
        // Fetch teams only (efficient - no detailed member data)
        const variables: ListTeamsOnlyQueryVariables = {
          teamIds: input.teamIds,
        };
        res = await this.mondayApi.request<ListTeamsOnlyQuery>(listTeamsOnly, variables);
      }
    } else if (!includeTeams) {
      // Fetch users only (default behavior) - no separate teams section in response
      if (hasUserIds) {
        // Specific users with their team memberships (but no separate teams section)
        const variables: ListUsersWithTeamsQueryVariables = {
          userIds: input.userIds,
          limit: DEFAULT_USER_LIMIT,
        };
        res = await this.mondayApi.request<ListUsersWithTeamsQuery>(listUsersWithTeams, variables);
      } else {
        // All users (but no separate teams section)
        const variables: ListUsersOnlyQueryVariables = {
          userIds: undefined,
          limit: DEFAULT_USER_LIMIT,
        };
        res = await this.mondayApi.request<ListUsersOnlyQuery>(listUsersOnly, variables);
      }
    } else {
      // includeTeams=true: Fetch both users and teams sections
      const variables: ListUsersAndTeamsQueryVariables = {
        userIds: input.userIds,
        teamIds: input.teamIds,
        limit: DEFAULT_USER_LIMIT,
      };
      res = await this.mondayApi.request<ListUsersAndTeamsQuery>(listUsersAndTeams, variables);
    }

    const content = formatUsersAndTeams(res);

    return {
      content,
    };
  }
}
