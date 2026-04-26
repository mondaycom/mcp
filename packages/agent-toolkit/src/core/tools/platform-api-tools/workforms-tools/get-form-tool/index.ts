import { z } from 'zod';
import { GetFormQuery, GetFormQueryVariables } from '../../../../../monday-graphql/generated/graphql/graphql';
import { getForm } from '../workforms.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
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
    return 'Get a monday.com form by formToken. Returns the full form structure including questions, settings, and appearance. formToken is the unique identifier for a form, found in the form URL after /forms/.';
  }

  getInputSchema(): typeof getFormToolSchema {
    return getFormToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getFormToolSchema>): Promise<ToolOutputType<never>> {
    const variables: GetFormQueryVariables = {
      formToken: input.formToken,
    };

    const res = await this.mondayApi.request<GetFormQuery>(getForm, variables);

    if (!res.form) {
      return {
        content: `Form with token ${input.formToken} not found or you don't have access to it.`,
      };
    }

    return {
      content: { message: 'Form retrieved', form_token: input.formToken, data: res.form },
    };
  }
}
