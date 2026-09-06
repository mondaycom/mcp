import { GetFormQuery, GetFormQueryVariables } from '../../../../../monday-graphql/generated/graphql/graphql';
import { getForm } from '../workforms.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { resolveFormToken } from '../utils/form-token';
import { getFormToolSchema } from './schema';

export class GetFormTool extends BaseMondayApiTool<typeof getFormToolSchema, never> {
  name = 'get_form';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Form',
    readOnlyHint: true,
    destructiveHint: false,
  });

  getDescription(): string {
    return (
      'Get a monday.com form by its form token, including its pages, questions, question ids, settings, and conditional showIfRules. ' +
      '[REQUIRED PRECONDITION]: If you do not already have the form token, call get_board_info with boardId set to the board that holds the form and filters.views set to {"type": "FormBoardView", "only": true}, then read view_specific_data.token from the form view you want. No view id is needed. That is the only way to obtain a form token. Never pass a board id, view id, or item id as the formToken, and never invent one. ' +
      "A form token is a 32-character hexadecimal string, which also appears in the form's url right after /forms/ and before the ?. " +
      'Given https://forms.monday.com/forms/aaaaaaaa000000000000000000000123?r=use1, the formToken is aaaaaaaa000000000000000000000123. ' +
      'You can also pass the full url or a shortened wkf.ms link and the token will be extracted for you. ' +
      'Call this FIRST before any tool that acts on an existing form: create_form_submission (to know the questions and their constraints), form_questions_editor (to resolve question ids and current structure), and update_form (to see the current settings before changing them).'
    );
  }

  getInputSchema(): typeof getFormToolSchema {
    return getFormToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getFormToolSchema>): Promise<ToolOutputType<never>> {
    const resolution = await resolveFormToken(input.formToken);

    if (!resolution.ok) {
      return {
        content: resolution.message,
      };
    }

    const variables: GetFormQueryVariables = {
      formToken: resolution.token,
    };

    const res = await this.mondayApi.request<GetFormQuery>(getForm, variables);

    if (!res.form) {
      return {
        content: `Form with token ${resolution.token} not found or you don't have access to it.`,
      };
    }

    return {
      content: { message: 'Form retrieved', form_token: resolution.token, data: res.form },
    };
  }
}
