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
const MAX_USERS_LIMIT = 500;
const MAX_TEAMS_LIMIT = 100; // Teams typically have fewer entities
const MAX_USER_IDS = 100; // Maximum user IDs allowed in a single query
const MAX_TEAM_IDS = 50; // Maximum team IDs allowed in a single query
const DEFAULT_USER_LIMIT = 100; // Default limit when no IDs provided
const DEFAULT_TEAM_LIMIT = 50; // Default limit when no IDs provided

export const listUsersAndTeamsToolSchema = {
  userIds: z.array(z.string()).max(MAX_USER_IDS).optional().describe(`A list of user IDs to filter on (max ${MAX_USER_IDS}). When specified, returns detailed user information including team memberships`),
  teamIds: z.array(z.string()).max(MAX_TEAM_IDS).optional().describe(`A list of team IDs to filter on (max ${MAX_TEAM_IDS}). When specified, returns detailed team information including team members`),
  userLimit: z.number().min(1).max(MAX_USERS_LIMIT).optional().describe(`Maximum number of users to return (max ${MAX_USERS_LIMIT}). Only applies when no userIds are specified`),
  teamLimit: z.number().min(1).max(MAX_TEAMS_LIMIT).optional().describe(`Maximum number of teams to return (max ${MAX_TEAMS_LIMIT}). Only applies when no teamIds are specified`),
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
    return `Get users and teams with enterprise-safe limits. Supports filtering by user/team IDs with automatic query optimization. Max limits: ${MAX_USER_IDS} user IDs, ${MAX_TEAM_IDS} team IDs, ${MAX_USERS_LIMIT} users, ${MAX_TEAMS_LIMIT} teams. When filtering by specific IDs, returns detailed information including memberships.`;
  }

  getInputSchema(): typeof listUsersAndTeamsToolSchema {
    return listUsersAndTeamsToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof listUsersAndTeamsToolSchema>): Promise<ToolOutputType<never>> {
    const hasUserIds = input.userIds && input.userIds.length > 0;
    const hasTeamIds = input.teamIds && input.teamIds.length > 0;

    // Calculate safe limits
    const userLimit = input.userLimit || DEFAULT_USER_LIMIT;
    const teamLimit = input.teamLimit || DEFAULT_TEAM_LIMIT;

    // Validate limits don't exceed maximums
    const safeUserLimit = Math.min(userLimit, MAX_USERS_LIMIT);
    const safeTeamLimit = Math.min(teamLimit, MAX_TEAMS_LIMIT);

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

    // Warn about potentially large queries
    const totalExpectedResults = (hasUserIds ? input.userIds!.length : safeUserLimit) + 
                                (hasTeamIds ? input.teamIds!.length : safeTeamLimit);
    
    if (totalExpectedResults > 200) {
      console.warn(`Large query detected: Expected ~${totalExpectedResults} results. Consider using smaller batches for better performance.`);
    }

    let res: ListUsersAndTeamsQuery | ListUsersWithTeamsQuery | ListTeamsWithMembersQuery;

    if (hasUserIds && !hasTeamIds) {
      // Only user IDs provided - fetch users with their teams
      const variables: ListUsersWithTeamsQueryVariables = {
        userIds: input.userIds,
        limit: safeUserLimit,
      };
      res = await this.mondayApi.request<ListUsersWithTeamsQuery>(listUsersWithTeams, variables);
    } else if (!hasUserIds && hasTeamIds) {
      // Only team IDs provided - fetch teams with their members
      const variables: ListTeamsWithMembersQueryVariables = {
        teamIds: input.teamIds,
      };
      res = await this.mondayApi.request<ListTeamsWithMembersQuery>(listTeamsWithMembers, variables);
    } else {
      // Both provided or neither provided - use the combined query
      const variables: ListUsersAndTeamsQueryVariables = {
        userIds: input.userIds,
        teamIds: input.teamIds,
        userLimit: safeUserLimit,
        teamLimit: safeTeamLimit,
      };
      res = await this.mondayApi.request<ListUsersAndTeamsQuery>(listUsersAndTeams, variables);
    }

    const content = formatUsersAndTeams(res);

    return {
      content,
    };
  }
}