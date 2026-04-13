import axios from 'axios';
import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { createSubmissionToolSchema } from './schema';
import { z, ZodTypeAny } from 'zod';

jest.mock('axios');

type inputType = z.objectInputType<typeof createSubmissionToolSchema, ZodTypeAny>;

const BASE_ARGS: inputType = {
  form_token: 'test_form_token',
  answers: [{ question_id: 'q1', short_text: 'Hello' }],
  form_timezone_offset: 0,
};

const mockAxiosHead = axios.head as jest.Mock;

describe('CreateSubmissionTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Token parsing', () => {
    it('should pass a bare token through unchanged', async () => {
      mocks.setResponse({ create_form_submission: { id: 'sub_1' } });

      await callToolByNameRawAsync('create_form_submission', BASE_ARGS);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1]).toMatchObject({ form_token: 'test_form_token' });
    });

    it('should extract the token from a full form URL', async () => {
      mocks.setResponse({ create_form_submission: { id: 'sub_1' } });

      const args: inputType = {
        ...BASE_ARGS,
        form_token: 'https://forms.monday.com/forms/test_form_token?r=use1&foo=bar',
      };

      await callToolByNameRawAsync('create_form_submission', args);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1]).toMatchObject({ form_token: 'test_form_token' });
    });

    it('should resolve a wkf.ms shortened URL and extract the token', async () => {
      mockAxiosHead.mockResolvedValue({
        headers: { location: 'https://forms.monday.com/forms/test_form_token?r=use1' },
      });
      mocks.setResponse({ create_form_submission: { id: 'sub_1' } });

      const args: inputType = {
        ...BASE_ARGS,
        form_token: 'https://wkf.ms/4tqP28t',
      };

      await callToolByNameRawAsync('create_form_submission', args);

      expect(mockAxiosHead).toHaveBeenCalledWith('https://wkf.ms/4tqP28t', expect.objectContaining({ maxRedirects: 0 }));
      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1]).toMatchObject({ form_token: 'test_form_token' });
    });

    it('should return an error when wkf.ms redirect does not resolve to a form URL', async () => {
      mockAxiosHead.mockResolvedValue({ headers: {} });

      const args: inputType = {
        ...BASE_ARGS,
        form_token: 'https://wkf.ms/4tqP28t',
      };

      const result = await callToolByNameRawAsync('create_form_submission', args);

      expect(result.content[0].text).toContain('Could not resolve a form token');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should return an error for an unrecognized URL without /forms/ path', async () => {
      const args: inputType = {
        ...BASE_ARGS,
        form_token: 'https://bit.ly/somelink',
      };

      const result = await callToolByNameRawAsync('create_form_submission', args);

      expect(result.content[0].text).toContain('Could not resolve a form token');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });
  });

  describe('Success cases', () => {
    it('should return the submission ID on success', async () => {
      mocks.setResponse({ create_form_submission: { id: 'sub_42' } });

      const result = await callToolByNameRawAsync('create_form_submission', BASE_ARGS);
      const parsed = parseToolResult(result);

      expect(parsed.message).toBe('Form submitted successfully');
      expect(parsed.submission_id).toBe('sub_42');
    });

    it('should pass optional password and group_id to the API', async () => {
      mocks.setResponse({ create_form_submission: { id: 'sub_1' } });

      const args: inputType = {
        ...BASE_ARGS,
        password: 'secret',
        group_id: 'group_99',
      };

      await callToolByNameRawAsync('create_form_submission', args);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1]).toMatchObject({ password: 'secret', group_id: 'group_99' });
    });
  });

  describe('Error cases', () => {
    it('should return a not-found message when create_form_submission is null', async () => {
      mocks.setResponse({ create_form_submission: null });

      const result = await callToolByNameRawAsync('create_form_submission', BASE_ARGS);

      expect(result.content[0].text).toContain('not found or is not accepting submissions');
    });

    it('should surface API errors via rethrowWithContext', async () => {
      const errorMessage = 'Network error: Connection timeout';
      mocks.setError(errorMessage);

      const result = await callToolByNameRawAsync('create_form_submission', BASE_ARGS);

      expect(result.content[0].text).toContain('Failed to execute tool create_form_submission');
      expect(result.content[0].text).toContain(errorMessage);
    });
  });
});
