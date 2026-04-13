import axios from 'axios';
import {
  CreateFormSubmissionMutation,
  CreateFormSubmissionMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';
import { createSubmissionMutationDev } from './create-submission-tool.graphql.dev';
import { createSubmissionToolSchema } from './schema';

export class CreateSubmissionTool extends BaseMondayApiTool<typeof createSubmissionToolSchema, never> {
  name = 'create_form_submission';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create WorkForm Submission',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return (
      'Submit a response to a monday.com WorkForm. Accepts a bare form token, a full WorkForm URL ' +
      '(e.g. https://forms.monday.com/forms/{form_token}?r=use1), or a shortened wkf.ms URL ' +
      '(e.g. https://wkf.ms/4tqP28t) — shortened URLs are automatically resolved by following the redirect. ' +
      'Use get_form to retrieve the WorkForm and its question IDs before submitting. Returns the submission ID.'
    );
  }

  getInputSchema(): typeof createSubmissionToolSchema {
    return createSubmissionToolSchema;
  }

  private extractTokenFromUrl(url: string): string | null {
    const match = url.match(/\/forms\/([^/?]+)/);
    return match ? match[1] : null;
  }

  private async resolveFormToken(formTokenOrUrl: string): Promise<string | null> {
    // Shortened wkf.ms URL — follow the redirect to get the full URL
    if (formTokenOrUrl.includes('wkf.ms')) {
      const response = await axios.head(formTokenOrUrl, { maxRedirects: 0, validateStatus: (s) => s < 400 });
      const location = response.headers['location'];
      if (!location) {
        return null;
      }
      return this.extractTokenFromUrl(location);
    }
    // Full URL with /forms/<token>
    if (formTokenOrUrl.startsWith('http://') || formTokenOrUrl.startsWith('https://')) {
      return this.extractTokenFromUrl(formTokenOrUrl);
    }
    // Bare token
    return formTokenOrUrl;
  }

  protected async executeInternal(input: ToolInputType<typeof createSubmissionToolSchema>): Promise<ToolOutputType<never>> {
    const formToken = await this.resolveFormToken(input.form_token);

    if (!formToken) {
      return {
        content:
          `Could not resolve a WorkForm token from "${input.form_token}". ` +
          `Please provide a valid WorkForm token or full WorkForm URL (e.g. https://forms.monday.com/forms/abc123).`,
      };
    }

    const variables: CreateFormSubmissionMutationVariables = {
      form_token: formToken,
      answers: input.answers,
      form_timezone_offset: input.form_timezone_offset,
      password: input.password,
      group_id: input.group_id,
      tags: input.tags,
    };

    try {
      const res = await this.mondayApi.request<CreateFormSubmissionMutation>(
        createSubmissionMutationDev,
        variables,
        { versionOverride: 'dev' },
      );

      if (!res.create_form_submission) {
        return {
          content:
            `WorkForm with token ${formToken} was not found or is not accepting submissions. ` +
            `Verify the WorkForm token is correct, the WorkForm is active, and any required password was provided.`,
        };
      }

      if (!res.create_form_submission.id) {
        return {
          content: 'WorkForm submission was recorded but no submission ID was returned. Contact support if this persists.',
        };
      }

      return {
        content: {
          message: 'WorkForm submitted successfully',
          submission_id: res.create_form_submission.id,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'submit form');
    }
  }
}
