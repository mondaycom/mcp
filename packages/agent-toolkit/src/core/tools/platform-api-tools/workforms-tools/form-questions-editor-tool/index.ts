import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { FormQuestionActions } from '../workforms.types';
import { formQuestionsEditorToolSchema } from './schema';
import { FormQuestionsEditorToolHelpers } from '../utils/form-questions-editor-tool-helpers';

export class FormQuestionsEditorTool extends BaseMondayApiTool<typeof formQuestionsEditorToolSchema, never> {
  name = 'form_questions_editor';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Form Questions Editor',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  private helpers = new FormQuestionsEditorToolHelpers(this.mondayApi);

  private readonly actionHandlers = new Map<
    FormQuestionActions,
    (input: ToolInputType<typeof formQuestionsEditorToolSchema>) => Promise<ToolOutputType<never>>
  >([
    [FormQuestionActions.Delete, this.helpers.deleteQuestion.bind(this.helpers)],
    [FormQuestionActions.Update, this.helpers.updateQuestion.bind(this.helpers)],
    [FormQuestionActions.Create, this.helpers.createQuestion.bind(this.helpers)],
  ]);

  getDescription(): string {
    return 'Create, update, or delete a question in a monday.com form';
  }

  getInputSchema(): typeof formQuestionsEditorToolSchema {
    return formQuestionsEditorToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof formQuestionsEditorToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const handler = this.actionHandlers.get(input.action);

    if (!handler) {
      return {
        content: `Unknown action: ${input.action}`,
      };
    }

    return await handler(input);
  }
}
