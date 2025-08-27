import { z } from 'zod';
import { GetFormQuery, GetFormQueryVariables } from '../../../monday-graphql/generated/graphql';
import { getForm } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';
import { GraphQLDescriptions, Form } from '@mondaydotcomorg/workforms-contracts';

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
    return 'Get a monday.com form by its form token';
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
