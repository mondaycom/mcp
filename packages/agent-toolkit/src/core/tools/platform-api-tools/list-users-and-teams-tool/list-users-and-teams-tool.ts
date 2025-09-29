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
      `Specific user IDs to fetch (max ${MAX_USER_IDS}). Most efficient parameter when user IDs are available.`,
    ),
  teamIds: z
    .array(z.string())
    .max(MAX_TEAM_IDS)
    .optional()
    .describe(`Specific team IDs to fetch (max ${MAX_TEAM_IDS}). Use with teamsOnly: true for teams-only queries.`),
  name: z
    .string()
    .optional()
    .describe(`Name-based user search. Cannot be combined with other parameters. Performs fuzzy matching.`),
  getMe: z
    .boolean()
    .optional()
    .describe(`Current authenticated user lookup. Cannot be combined with other parameters. Returns basic profile.`),
  includeTeams: z
    .boolean()
    .optional()
    .describe(`Include teams data alongside users. Use sparingly as it adds query overhead.`),
  teamsOnly: z.boolean().optional().describe(`Fetch only teams, no users returned. More efficient than includeTeams.`),
  includeTeamMembers: z
    .boolean()
    .optional()
    .describe(`Include detailed team member data. Set to true only when member analysis is needed.`),
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
    return `Retrieve users and teams from monday.com. Prioritize specific IDs over broad searches for best performance.

      Parameter priority (use specific IDs when available):
      1. getMe: true (current user only - standalone)
      2. name (user search by name - standalone)
      3. userIds (specific user IDs)
      4. teamIds (specific team IDs) 
      5. No parameters (all users - use as last resort)

      Key rules:
      • getMe and name cannot combine with other parameters
      • Use teamsOnly: true for team-only queries
      • Use includeTeamMembers: true for detailed team member data
      • Avoid broad queries when specific IDs are available`;
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
