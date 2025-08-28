import { z } from 'zod';
import { GetFormQuery, GetFormQueryVariables } from '../../../../monday-graphql/generated/graphql';
import { getForm } from './workforms.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { GraphQLDescriptions } from './workforms.consts';

export const getFormToolSchema = {
  formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
};

export class GetFormTool extends BaseMondayApiTool<typeof getFormToolSchema, never> {
  name = 'get_form';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Form',
    readOnlyHint: true,
    destructiveHint: false,
  });

  getDescription(): string {
    return 'Get a monday.com form by its form token. Form tokens can be extracted from the form’s url. Given a form url, such as https://forms.monday.com/forms/abc123def456ghi789?r=use1, the token is the alphanumeric string that appears right after /forms/ and before the ?. In the example, the token is abc123def456ghi789.';
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
      content: `The form with the token ${input.formToken} is: ${JSON.stringify(res.form, null, 2)}`,
    };
  }
}
