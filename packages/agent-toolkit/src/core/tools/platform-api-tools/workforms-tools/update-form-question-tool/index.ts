import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { updateFormQuestionToolSchema } from './schema';
import {
  UpdateFormQuestionMutation,
  UpdateFormQuestionMutationVariables,
  UpdateQuestionInput,
} from '../../../../../monday-graphql/generated/graphql/graphql';
import { updateFormQuestion } from '../workforms.graphql';

export class UpdateFormQuestionTool extends BaseMondayApiTool<typeof updateFormQuestionToolSchema, never> {
  name = 'update_form_question';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Form Question',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return "Update an existing question in a monday.com form. The question object acts as a patch — only the fields you provide will be updated. Use this to change a question's title, description, visibility, required status, type, or type-specific settings.";
  }

  getInputSchema(): typeof updateFormQuestionToolSchema {
    return updateFormQuestionToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof updateFormQuestionToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: UpdateFormQuestionMutationVariables = {
      formToken: input.formToken,
      questionId: input.questionId,
      question: input.question as UpdateQuestionInput,
    };

    await this.mondayApi.request<UpdateFormQuestionMutation>(updateFormQuestion, variables);

    return {
      content: { message: 'Question updated', question_id: input.questionId, action_name: 'update' },
    };
  }
}
