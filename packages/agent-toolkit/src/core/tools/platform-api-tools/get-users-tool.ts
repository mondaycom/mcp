import { z } from 'zod';
import { GetUsersByNameQuery, GetUsersByNameQueryVariables } from '../../../monday-graphql/generated/graphql';
import { getUsersByName } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const getUsersToolSchema = {
  name: z.string().optional().describe('The name or partial name of the user to get'),
};

export class GetUsersTool extends BaseMondayApiTool<typeof getUsersToolSchema> {
  name = 'get_users_by_name';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Users',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Get users, can be filtered by name or partial name';
  }

  getInputSchema(): typeof getUsersToolSchema {
    return getUsersToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getUsersToolSchema>): Promise<ToolOutputType<never>> {
    const variables: GetUsersByNameQueryVariables = {
      name: input.name,
    };

    const res = await this.mondayApi.request<GetUsersByNameQuery>(getUsersByName, variables);
    return {
      content: `Relevant users:\n ${res.users?.map((user) => ` id: ${user?.id}, name: ${user?.name}, title: ${user?.title}`).join('\n')}`,
    };
  }
}
