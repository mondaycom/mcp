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

  getDescription(): string {
    return 'Create, update, or delete a question in a monday.com form';
  }

  getInputSchema(): typeof formQuestionsEditorToolSchema {
    return formQuestionsEditorToolSchema;
  }

  // Build the action handlers lazily, per execution, so the ApiClient is resolved from the
  // provider at call time (supports lazy/refreshed tokens) instead of being captured once at
  // construction.
  private buildActionHandlers(
    helpers: FormQuestionsEditorToolHelpers,
  ): Map<FormQuestionActions, (input: ToolInputType<typeof formQuestionsEditorToolSchema>) => Promise<ToolOutputType<never>>> {
    return new Map([
      [FormQuestionActions.Delete, helpers.deleteQuestion.bind(helpers)],
      [FormQuestionActions.Update, helpers.updateQuestion.bind(helpers)],
      [FormQuestionActions.Create, helpers.createQuestion.bind(helpers)],
    ]);
  }

  protected async executeInternal(
    input: ToolInputType<typeof formQuestionsEditorToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const helpers = new FormQuestionsEditorToolHelpers(this.mondayApi);
    const handler = this.buildActionHandlers(helpers).get(input.action);

    if (!handler) {
      return {
        content: `Unknown action: ${input.action}`,
      };
    }

    return await handler(input);
  }
}
