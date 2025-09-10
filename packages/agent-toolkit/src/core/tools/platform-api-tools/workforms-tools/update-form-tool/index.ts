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

  private helpers = new UpdateFormToolHelpers(this.mondayApi);

  getDescription(): string {
    return `Update a monday.com form. Handles the following form update actions that can only be done one at a time using the correct "action" input: 
    - update form's feature settings,
    - update form's appearance settings
    - update form's accessibility settings
    - update form's title
    - update form's description
    - update form's question order
    - update form's list of form tags
    - set or update the form's password with the action "setFormPassword"
    - shorten form's url with the action "shortenFormUrl"
    - deactivate form with the action "deactivateForm"
    - reactivate form with the action "activateForm"`;
  }

  getInputSchema(): typeof updateFormToolSchema {
    return updateFormToolSchema;
  }


  private readonly actionHandlers = new Map<
    FormActions,
    (input: ToolInputType<typeof updateFormToolSchema>) => Promise<ToolOutputType<never>>
  >([
    [FormActions.setFormPassword, this.helpers.setFormPassword.bind(this.helpers)],
    [FormActions.shortenFormUrl, this.helpers.shortenFormUrl.bind(this.helpers)],
    [FormActions.deactivate, this.helpers.deactivateForm.bind(this.helpers)],
    [FormActions.activate, this.helpers.activateForm.bind(this.helpers)],
    [FormActions.createTag, this.helpers.createTag.bind(this.helpers)],
    [FormActions.deleteTag, this.helpers.deleteTag.bind(this.helpers)],
    [FormActions.updateTag, this.helpers.updateTag.bind(this.helpers)],
    [FormActions.updateAppearance, this.helpers.updateAppearance.bind(this.helpers)],
    [FormActions.updateAccessibility, this.helpers.updateAccessibility.bind(this.helpers)],
    [FormActions.updateFeatures, this.helpers.updateFeatures.bind(this.helpers)],
    [FormActions.updateQuestionOrder, this.helpers.updateQuestionOrder.bind(this.helpers)],
    [FormActions.updateFormHeader, this.helpers.updateFormHeader.bind(this.helpers)],
  ]);

  protected async executeInternal(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    const handler = this.actionHandlers.get(input.action);

    if (!handler) {
      return {
        content: 'Received an invalid action for the update form tool.',
      };
    }

    return await handler(input);
  }
}
