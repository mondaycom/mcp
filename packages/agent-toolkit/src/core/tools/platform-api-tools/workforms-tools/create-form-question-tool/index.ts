import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { createFormQuestionToolSchema } from './schema';
import {
  CreateFormQuestionMutation,
  CreateFormQuestionMutationVariables,
} from '../../../../../monday-graphql/generated/graphql/graphql';
import { createFormQuestion } from '../workforms.graphql';

export class CreateFormQuestionTool extends BaseMondayApiTool<typeof createFormQuestionToolSchema, never> {
  name = 'create_form_question';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Form Question',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Create a new question in a monday.com form. Supports all question types: ShortText, LongText, Email, Phone, Number, Date, Rating, Boolean, SingleSelect, MultiSelect, Location, Link, File, Signature, Name, Country. For SingleSelect and MultiSelect questions, provide options as an array of {label} objects. Use the settings object for type-specific configuration (e.g., includeTime for Date, checkedByDefault for Boolean, display mode for Select types).';
  }

  getInputSchema(): typeof createFormQuestionToolSchema {
    return createFormQuestionToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createFormQuestionToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (!input.question.title) {
      return {
        content: 'Must provide a title for the question when creating a question.',
      };
    }

    const variables: CreateFormQuestionMutationVariables = {
      formToken: input.formToken,
      question: {
        ...input.question,
        title: input.question.title,
      },
    };

    const result = await this.mondayApi.request<CreateFormQuestionMutation>(createFormQuestion, variables);

    return {
      content: { message: 'Question created', question_id: result.create_form_question?.id, action_name: 'create' },
    };
  }
}
