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

export const listUsersAndTeamsToolSchema = {
  userIds: z.array(z.string()).optional().describe('A list of user IDs to filter on. When specified, returns detailed user information including team memberships'),
  teamIds: z.array(z.string()).optional().describe('A list of team IDs to filter on. When specified, returns detailed team information including team members'),
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
    return 'Get all users and teams in the account with their details. Can filter on user or team IDs. Filtering on specific user ID returns additional details like team memberships. Filtering on specific team ID returns additional details like team members.';
  }

  getInputSchema(): typeof listUsersAndTeamsToolSchema {
    return listUsersAndTeamsToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof listUsersAndTeamsToolSchema>): Promise<ToolOutputType<never>> {
    const hasUserIds = input.userIds && input.userIds.length > 0;
    const hasTeamIds = input.teamIds && input.teamIds.length > 0;

    let res: ListUsersAndTeamsQuery | ListUsersWithTeamsQuery | ListTeamsWithMembersQuery;

    if (hasUserIds && !hasTeamIds) {
      // Only user IDs provided - fetch users with their teams
      const variables: ListUsersWithTeamsQueryVariables = {
        userIds: input.userIds,
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
      };
      res = await this.mondayApi.request<ListUsersAndTeamsQuery>(listUsersAndTeams, variables);
    }

    const content = formatUsersAndTeams(res);

    return {
      content,
    };
  }
}