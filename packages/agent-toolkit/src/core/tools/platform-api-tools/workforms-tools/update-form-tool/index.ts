// GraphQL imports are now handled by UpdateFormToolHelpers
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { FormActions, updateFormToolSchema } from './schema';
import { UpdateFormToolHelpers } from '../utils/update-form-tool-helpers';
export class UpdateFormTool extends BaseMondayApiTool<typeof updateFormToolSchema, never> {
  name = 'update_form';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Form',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Update a monday.com form. Use the action field to specify the operation.';
  }

  getInputSchema(): typeof updateFormToolSchema {
    return updateFormToolSchema;
  }

  // Build the action handlers lazily, per execution, so the ApiClient is resolved from the
  // provider at call time (supports lazy/refreshed tokens) instead of being captured once at
  // construction.
  private buildActionHandlers(
    helpers: UpdateFormToolHelpers,
  ): Map<FormActions, (input: ToolInputType<typeof updateFormToolSchema>) => Promise<ToolOutputType<never>>> {
    return new Map([
      [FormActions.setFormPassword, helpers.setFormPassword.bind(helpers)],
      [FormActions.shortenFormUrl, helpers.shortenFormUrl.bind(helpers)],
      [FormActions.deactivate, helpers.deactivateForm.bind(helpers)],
      [FormActions.activate, helpers.activateForm.bind(helpers)],
      [FormActions.createTag, helpers.createTag.bind(helpers)],
      [FormActions.deleteTag, helpers.deleteTag.bind(helpers)],
      [FormActions.updateAppearance, helpers.updateAppearance.bind(helpers)],
      [FormActions.updateAccessibility, helpers.updateAccessibility.bind(helpers)],
      [FormActions.updateFeatures, helpers.updateFeatures.bind(helpers)],
      [FormActions.updateQuestionOrder, helpers.updateQuestionOrder.bind(helpers)],
      [FormActions.updateFormHeader, helpers.updateFormHeader.bind(helpers)],
    ]);
  }

  protected async executeInternal(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    const helpers = new UpdateFormToolHelpers(this.mondayApi);
    const handler = this.buildActionHandlers(helpers).get(input.action);

    if (!handler) {
      return {
        content: 'Received an invalid action for the update form tool.',
      };
    }

    return await handler(input);
  }
}
