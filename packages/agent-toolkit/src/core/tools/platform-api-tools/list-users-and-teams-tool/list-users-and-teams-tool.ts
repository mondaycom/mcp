import { z } from 'zod';
import { 
  ListUsersAndTeamsQuery, 
  ListUsersAndTeamsQueryVariables,
  ListUsersWithTeamsQuery,
  ListUsersWithTeamsQueryVariables,
  ListTeamsWithMembersQuery,
  ListTeamsWithMembersQueryVariables
} from '../../../../monday-graphql/generated/graphql';
import { listUsersAndTeams, listUsersWithTeams, listTeamsWithMembers } from './list-users-and-teams.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { formatUsersAndTeams } from './helpers';

// Constants for safe query limits
const MAX_FETCH_LIMIT = 500;
const MAX_USER_IDS = 500; // Maximum user IDs allowed in a single query
const MAX_TEAM_IDS = 500; // Maximum team IDs allowed in a single query
const DEFAULT_USER_LIMIT = 500; // Default limit when no IDs provided
const DEFAULT_TEAM_LIMIT = 200; // Default limit when no IDs provided

export const listUsersAndTeamsToolSchema = {
  userIds: z
    .array(z.string())
    .max(MAX_USER_IDS)
    .optional()
    .describe(
      `A list of user IDs to filter on (max ${MAX_USER_IDS}). 
      When specified, returns detailed user information for those user ids including team memberships and various other details defined for the user. 
      Use this to get more information such as name, contact informtion, etc. for any user by id.
      Always prefer to fetch users by id if you know the specific ids. 
      Data on the current user will be returned as part of any call`,
    ),
  teamIds: z
    .array(z.string())
    .max(MAX_TEAM_IDS)
    .optional()
    .describe(
      `A list of team IDs to filter on (max ${MAX_TEAM_IDS}). 
      When specified, returns detailed team information including team members`,
    ),
  userLimit: z
    .number()
    .min(1)
    .max(MAX_FETCH_LIMIT)
    .optional()
    .describe(`Maximum number of users to return (max ${MAX_FETCH_LIMIT}). Only applies when no userIds are specified`),
  teamLimit: z
    .number()
    .min(1)
    .max(MAX_FETCH_LIMIT)
    .optional()
    .describe(`Maximum number of teams to return (max ${MAX_FETCH_LIMIT}). Only applies when no teamIds are specified`),
  includeTeams: z
    .boolean()
    .optional()
    .describe('Include teams in the response along with users. Default is false (users only)'),
  teamsOnly: z.boolean().optional().describe('Fetch only teams (no users). When true, only teams will be returned'),
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
    return `Get users with enterprise-safe limits. By default returns only users. Use includeTeams=true to also fetch teams, or teamsOnly=true to fetch only teams. Supports filtering by user/team IDs with automatic query optimization. Max limits: ${MAX_USER_IDS} user IDs, ${MAX_TEAM_IDS} team IDs, ${MAX_FETCH_LIMIT} users, ${MAX_FETCH_LIMIT} teams. When filtering by specific IDs, returns detailed information including memberships.`;
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

    // Validate conflicting flags
    if (teamsOnly && includeTeams) {
      return {
        content: 'Error: Cannot specify both teamsOnly and includeTeams flags. Choose one.',
      };
    }

    // Calculate safe limits
    const userLimit = input.userLimit || DEFAULT_USER_LIMIT;
    const teamLimit = input.teamLimit || DEFAULT_TEAM_LIMIT;

    // Validate limits don't exceed maximums
    const safeUserLimit = Math.min(userLimit, MAX_FETCH_LIMIT);
    const safeTeamLimit = Math.min(teamLimit, MAX_FETCH_LIMIT);

    // Early validation for enterprise safety
    if (hasUserIds && input.userIds!.length > MAX_USER_IDS) {
      return {
        content: `Error: Too many user IDs provided. Maximum allowed: ${MAX_USER_IDS}, provided: ${input.userIds!.length}. Please reduce the number of user IDs or use pagination.`,
      };
    }

    if (hasTeamIds && input.teamIds!.length > MAX_TEAM_IDS) {
      return {
        content: `Error: Too many team IDs provided. Maximum allowed: ${MAX_TEAM_IDS}, provided: ${input.teamIds!.length}. Please reduce the number of team IDs or use pagination.`,
      };
    }

    let res: ListUsersAndTeamsQuery | ListUsersWithTeamsQuery | ListTeamsWithMembersQuery;

    // Determine what to fetch based on flags and IDs
    if (teamsOnly || (!hasUserIds && hasTeamIds && !includeTeams)) {
      // Fetch only teams
      const variables: ListTeamsWithMembersQueryVariables = {
        teamIds: input.teamIds,
      };
      res = await this.mondayApi.request<ListTeamsWithMembersQuery>(listTeamsWithMembers, variables);
    } else if (hasUserIds && !hasTeamIds && !includeTeams) {
      // Fetch specific users only (with their team memberships)
      const variables: ListUsersWithTeamsQueryVariables = {
        userIds: input.userIds,
        limit: safeUserLimit,
      };
      res = await this.mondayApi.request<ListUsersWithTeamsQuery>(listUsersWithTeams, variables);
    } else if (!hasUserIds && !hasTeamIds && !includeTeams && !teamsOnly) {
      // Default: fetch users only
      const variables: ListUsersWithTeamsQueryVariables = {
        userIds: undefined,
        limit: safeUserLimit,
      };
      res = await this.mondayApi.request<ListUsersWithTeamsQuery>(listUsersWithTeams, variables);
    } else {
      // Fetch both users and teams (includeTeams=true or both IDs provided)
      const variables: ListUsersAndTeamsQueryVariables = {
        userIds: input.userIds,
        teamIds: input.teamIds,
        userLimit: safeUserLimit,
      };
      res = await this.mondayApi.request<ListUsersAndTeamsQuery>(listUsersAndTeams, variables);
    }

    const content = formatUsersAndTeams(res);

    return {
      content,
    };
  }
}