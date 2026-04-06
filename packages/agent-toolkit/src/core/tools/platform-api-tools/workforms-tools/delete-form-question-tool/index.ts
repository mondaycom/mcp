import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { deleteFormQuestionToolSchema } from './schema';
import {
  DeleteFormQuestionMutation,
  DeleteFormQuestionMutationVariables,
} from '../../../../../monday-graphql/generated/graphql/graphql';
import { deleteFormQuestion } from '../workforms.graphql';

export class DeleteFormQuestionTool extends BaseMondayApiTool<typeof deleteFormQuestionToolSchema, never> {
  name = 'delete_form_question';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Delete Form Question',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Delete a question from a monday.com form.';
  }

  getInputSchema(): typeof deleteFormQuestionToolSchema {
    return deleteFormQuestionToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof deleteFormQuestionToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: DeleteFormQuestionMutationVariables = {
      formToken: input.formToken,
      questionId: input.questionId,
    };

    await this.mondayApi.request<DeleteFormQuestionMutation>(deleteFormQuestion, variables);

    return {
      content: { message: 'Question deleted', question_id: input.questionId, action_name: 'delete' },
    };
  }
}
