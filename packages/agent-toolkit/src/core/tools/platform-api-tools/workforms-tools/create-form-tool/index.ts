import {
  CreateFormMutation,
  CreateFormMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { createForm } from '../workforms.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { createFormToolSchema } from './schema';
import { WORKFORMS_GRAPHQL_VERSION } from '../workforms.consts';

export class CreateFormTool extends BaseMondayApiTool<typeof createFormToolSchema, never> {
  name = 'create_form';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Form',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Create a monday.com form. This will create a new form as well as a new board for which the form’s responses will be stored. The returned board_id is the ID of the board that was created while the returned formToken can be used for all future queries and mutations to continue editing the form.';
  }

  getInputSchema(): typeof createFormToolSchema {
    return createFormToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof createFormToolSchema>): Promise<ToolOutputType<never>> {
    const variables: CreateFormMutationVariables = {
      destination_workspace_id: input.destination_workspace_id,
      destination_folder_id: input.destination_folder_id,
      destination_folder_name: input.destination_folder_name,
      board_kind: input.board_kind,
      destination_name: input.destination_name,
      board_owner_ids: input.board_owner_ids,
      board_owner_team_ids: input.board_owner_team_ids,
      board_subscriber_ids: input.board_subscriber_ids,
      board_subscriber_teams_ids: input.board_subscriber_teams_ids,
    };

    const res = await this.mondayApi.request<CreateFormMutation>(createForm, variables, {
      versionOverride: WORKFORMS_GRAPHQL_VERSION,
    });

    return {
      content: {
        message: 'Form created successfully',
        board_id: res.create_form?.boardId,
        form_token: res.create_form?.token,
      },
    };
  }
}
