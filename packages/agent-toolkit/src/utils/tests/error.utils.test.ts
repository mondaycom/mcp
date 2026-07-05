import { GraphQLErrorResponse } from '../graphql-error.types';
import {
  ToolValidationError,
  buildToolErrorStructuredContent,
  formatToolError,
  isRateLimitError,
  rethrowWithContext,
} from '../error.utils';

const toToolkitError = (contentText: string): Error => {
  const message = contentText.startsWith('Error: ') ? contentText.slice('Error: '.length) : contentText;
  return new Error(message);
};

describe('error.utils', () => {
  describe('rethrowWithContext', () => {
  describe('GraphQL errors', () => {
    it('should extract and format single GraphQL error', () => {
      const error = {
        response: {
          errors: [{ message: 'Item not found' }],
        },
      };

      expect(() => rethrowWithContext(error, 'create item')).toThrow('Failed to create item: Item not found');
    });

    it('should include allowlisted extension keys in error message', () => {
      const error = {
        response: {
          errors: [
            {
              message: 'Workflow has validation issues',
              extensions: {
                code: 'WORKFLOW_VALIDATION_FAILED',
                error_data: { issues: [{ stepId: 2, type: 'missing-mandatory-inputs' }] },
                internalTrace: 'should-be-omitted',
              },
            },
          ],
        },
      };

      expect(() => rethrowWithContext(error, 'publish workflow')).toThrow(
        'Failed to publish workflow: Workflow has validation issues (details: {"code":"WORKFLOW_VALIDATION_FAILED","error_data":{"issues":[{"stepId":2,"type":"missing-mandatory-inputs"}]}})',
      );
    });

    it('should not append details when no allowlisted keys are present', () => {
      const error = {
        response: {
          errors: [{ message: 'Some error', extensions: { internalTrace: 'abc' } }],
        },
      };

      expect(() => rethrowWithContext(error, 'create item')).toThrow('Failed to create item: Some error');
    });

    it('should extract and join multiple GraphQL errors', () => {
      const error = {
        response: {
          errors: [{ message: 'Invalid item ID' }, { message: 'Insufficient permissions' }],
        },
      };

      expect(() => rethrowWithContext(error, 'update board')).toThrow(
        'Failed to update board: Invalid item ID, Insufficient permissions',
      );
    });

    it('should handle empty errors array', () => {
      const error = {
        response: {
          errors: [],
        },
      };

      expect(() => rethrowWithContext(error, 'delete column')).toThrow('Failed to delete column: Unknown error');
    });

    it('should handle GraphQL error response with undefined errors', () => {
      const error = {
        response: {
          errors: undefined,
        },
      };

      expect(() => rethrowWithContext(error, 'create group')).toThrow('Failed to create group: Unknown error');
    });
  });

  describe('Standard Error instances', () => {
    it('should handle Error instance', () => {
      const error = new Error('Network timeout');

      expect(() => rethrowWithContext(error, 'fetch data')).toThrow('Failed to fetch data: Network timeout');
    });

    it('should handle TypeError instance', () => {
      const error = new TypeError('Cannot read property of undefined');

      expect(() => rethrowWithContext(error, 'process item')).toThrow(
        'Failed to process item: Cannot read property of undefined',
      );
    });

    it('should handle custom Error subclass', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error occurred');

      expect(() => rethrowWithContext(error, 'validate input')).toThrow(
        'Failed to validate input: Custom error occurred',
      );
    });
  });

  describe('Non-standard error types', () => {
    it('should handle string error', () => {
      const error = 'Something went wrong';

      expect(() => rethrowWithContext(error, 'parse data')).toThrow('Failed to parse data: Unknown error');
    });

    it('should handle number error', () => {
      const error = 404;

      expect(() => rethrowWithContext(error, 'find resource')).toThrow('Failed to find resource: Unknown error');
    });

    it('should handle null error', () => {
      const error = null;

      expect(() => rethrowWithContext(error, 'execute query')).toThrow('Failed to execute query: Unknown error');
    });

    it('should handle undefined error', () => {
      const error = undefined;

      expect(() => rethrowWithContext(error, 'run script')).toThrow('Failed to run script: Unknown error');
    });

    it('should handle plain object error', () => {
      const error = { foo: 'bar' };

      expect(() => rethrowWithContext(error, 'load config')).toThrow('Failed to load config: Unknown error');
    });
  });

  describe('Edge cases', () => {
    it('should handle Error with GraphQL-like structure', () => {
      const error = new Error('Original error message');
      (error as any).response = {
        errors: [{ message: 'GraphQL error from Error instance' }],
      };

      expect(() => rethrowWithContext(error, 'complex operation')).toThrow(
        'Failed to complex operation: GraphQL error from Error instance',
      );
    });

    it('should prioritize GraphQL errors over Error message', () => {
      const error = new Error('This should be ignored');
      (error as any).response = {
        errors: [{ message: 'This should be used' }],
      };

      expect(() => rethrowWithContext(error, 'mixed error')).toThrow('Failed to mixed error: This should be used');
    });

    it('should preserve response on the thrown error for structuredContent', () => {
      const error = {
        response: {
          errors: [{ message: 'Not found', extensions: { code: 'NOT_FOUND' } }],
          status: 404,
        },
      };

      try {
        rethrowWithContext(error, 'fetch board');
      } catch (e) {
        expect((e as GraphQLErrorResponse).response).toBe(error.response);
        expect(buildToolErrorStructuredContent(e)).toMatchObject({
          status: 404,
          errors: [{ code: 'NOT_FOUND' }],
        });
        return;
      }

      throw new Error('expected rethrowWithContext to throw');
    });

    it('should handle empty operation string', () => {
      const error = new Error('Test error');

      expect(() => rethrowWithContext(error, '')).toThrow('Failed to : Test error');
    });

    it('should handle operation with special characters', () => {
      const error = new Error('Test error');

      expect(() => rethrowWithContext(error, 'create "special" item')).toThrow(
        'Failed to create "special" item: Test error',
      );
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new Error(longMessage);

      expect(() => rethrowWithContext(error, 'test')).toThrow(`Failed to test: ${longMessage}`);
    });

    it('should handle errors with circular references', () => {
      const error: any = new Error('Circular error');
      error.circular = error;

      expect(() => rethrowWithContext(error, 'circular test')).toThrow('Failed to circular test: Circular error');
    });
  });

  describe('Return type', () => {
    it('should always throw and never return', () => {
      const error = new Error('Test');

      // TypeScript type checking ensures this function never returns
      // This test verifies runtime behavior
      expect(() => {
        rethrowWithContext(error, 'test');
        // This line should never be reached
        throw new Error('Function returned instead of throwing');
      }).toThrow('Failed to test: Test');
    });
  });
  });

  describe('formatToolError', () => {
  it('should return structured content for plain errors', () => {
    const result = formatToolError(new Error('Test error'));

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({
      message: 'Test error',
    });
    expect(result.content).toEqual([{ type: 'text', text: 'Error: Test error' }]);
  });

  it('should return raw message for API errors without preserved response', () => {
    const message =
      'Minute rate limit exceeded: {"response":{"errors":[{"message":"Minute rate limit exceeded","extensions":{"code":"MINUTE_RATE_LIMIT_EXCEEDED","retry_in_seconds":60}}],"extensions":{"request_id":"req-1"},"status":429,"headers":{}},"request":{"query":"..."}}';
    const error = new Error(message);

    const result = formatToolError(error);

    expect(result.structuredContent).toEqual({ message });
    expect(result.content?.[0]?.text).toBe(`Error: ${message}`);
  });

  it('should return all graphql errors in the errors array', () => {
    const error = new Error('GraphQL Error');
    (error as any).response = {
      errors: [
        {
          message: 'Rate limit exceeded for board-columns',
          path: ['boards', 0, 'columns'],
          extensions: {
            code: 'tooManyRequests',
            status_code: 400,
            service: 'data-structure',
          },
        },
        {
          message: 'Secondary failure',
          extensions: { code: 'OTHER_CODE' },
        },
      ],
      extensions: { request_id: 'req-2' },
      status: 200,
    };

    const result = formatToolError(error, { toolName: 'get_board_info' });

    expect(result.structuredContent).toEqual({
      message: 'GraphQL Error',
      tool: 'get_board_info',
      request_id: 'req-2',
      status: 200,
      errors: [
        {
          message: 'Rate limit exceeded for board-columns',
          path: ['boards', 0, 'columns'],
          code: 'tooManyRequests',
          status_code: 400,
          service: 'data-structure',
        },
        {
          message: 'Secondary failure',
          code: 'OTHER_CODE',
        },
      ],
    });
    expect(result.content?.[0]?.text).toBe('Error: GraphQL Error');
  });

  it('should structure rethrowWithContext errors via preserved response', () => {
    const error = new Error(
      'Failed to execute GraphQL operation: The board does not exist (details: {"code":"InvalidBoardIdException","error_data":{"board_id":123}})',
    );
    (error as any).response = {
      errors: [
        {
          message: 'The board does not exist',
          extensions: { code: 'InvalidBoardIdException', error_data: { board_id: 123 } },
        },
      ],
    };

    const structured = buildToolErrorStructuredContent(error);

    expect(structured).toMatchObject({
      message:
        'Failed to execute GraphQL operation: The board does not exist (details: {"code":"InvalidBoardIdException","error_data":{"board_id":123}})',
      errors: [
        {
          message: 'The board does not exist',
          code: 'InvalidBoardIdException',
          error_data: { board_id: 123 },
        },
      ],
    });
  });

  it('should include tool name in structured content', () => {
    const result = formatToolError(new Error('Test error'), { toolName: 'get_board_info' });

    expect(result.structuredContent).toEqual({
      message: 'Test error',
      tool: 'get_board_info',
    });
    expect(result.content?.[0]?.text).toBe('Error: Test error');
  });

  it('should use custom errorPrefix without changing structuredContent.message', () => {
    const result = formatToolError(new Error('Invalid arguments'), {
      toolName: 'search',
      errorPrefix: 'Failed to execute tool search: ',
    });

    expect(result.structuredContent).toEqual({
      message: 'Invalid arguments',
      tool: 'search',
    });
    expect(result.content?.[0]?.text).toBe('Failed to execute tool search: Invalid arguments');
  });

  it('should keep structuredContent.message as raw message while content adds prefix only', () => {
    const message = 'Network error: Connection timeout';
    const result = formatToolError(new Error(message), {
      errorPrefix: 'Failed to execute tool form_questions_editor: ',
    });

    expect(result.structuredContent).toEqual({ message });
    expect(result.content?.[0]?.text).toBe(`Failed to execute tool form_questions_editor: ${message}`);
  });

  describe('buildToolErrorStructuredContent', () => {
    it('should expose rate-limit fields on errors when response is on the error', () => {
      const rawMessage = 'Minute rate limit exceeded';
      const error = new Error(rawMessage);
      (error as any).response = {
        errors: [
          {
            message: 'Minute rate limit exceeded',
            extensions: { code: 'MINUTE_RATE_LIMIT_EXCEEDED', retry_in_seconds: 58 },
          },
        ],
        extensions: { request_id: 'req-rate' },
        status: 429,
        headers: {},
      };

      expect(buildToolErrorStructuredContent(error, { toolName: 'get_board_info' })).toEqual({
        message: rawMessage,
        tool: 'get_board_info',
        request_id: 'req-rate',
        status: 429,
        errors: [
          {
            message: 'Minute rate limit exceeded',
            code: 'MINUTE_RATE_LIMIT_EXCEEDED',
            retry_in_seconds: 58,
          },
        ],
      });
    });

    it('should set partial_success when response includes data', () => {
      const error = new Error('Rate limit already blocked');
      (error as any).response = {
        data: { boards: [{ id: '1', columns: null }] },
        errors: [
          {
            message: 'Rate limit already blocked',
            path: ['boards', 0, 'columns'],
            extensions: { code: 'tooManyRequests', service: 'data-structure' },
          },
        ],
        extensions: { request_id: 'req-partial' },
        status: 200,
      };

      const structured = buildToolErrorStructuredContent(error);

      expect(structured.partial_success).toBe(true);
      expect(structured).not.toHaveProperty('data');
      expect(structured.request_id).toBe('req-partial');
    });

    it('should omit headers when response headers are empty', () => {
      const error = new Error('GraphQL Error');
      (error as any).response = {
        errors: [{ message: 'Something failed', extensions: { code: 'ERR' } }],
        headers: {},
        status: 500,
      };

      expect(buildToolErrorStructuredContent(error).headers).toBeUndefined();
    });
  });

  describe('ToolValidationError', () => {
    it('emits errors[] with the code for classification in observability', () => {
      const structured = buildToolErrorStructuredContent(
        new ToolValidationError('Invalid JSON in columnValues', 'INVALID_COLUMN_VALUES_JSON'),
        { toolName: 'create_item' },
      );

      expect(structured).toEqual({
        message: 'Invalid JSON in columnValues',
        tool: 'create_item',
        errors: [{ code: 'INVALID_COLUMN_VALUES_JSON' }],
      });
    });

    it('formatToolError surfaces the code in structuredContent.errors', () => {
      const result = formatToolError(
        new ToolValidationError(
          'Cannot specify both parentItemId and duplicateFromItemId. Please provide only one of these parameters.',
          'INVALID_ARGUMENTS_COMBINATION',
        ),
        { toolName: 'create_item' },
      );

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toEqual({
        message:
          'Cannot specify both parentItemId and duplicateFromItemId. Please provide only one of these parameters.',
        tool: 'create_item',
        errors: [{ code: 'INVALID_ARGUMENTS_COMBINATION' }],
      });
    });

    it('preserves the code and message', () => {
      const err = new ToolValidationError('boom', 'EMPTY_API_RESPONSE');
      expect(err.code).toBe('EMPTY_API_RESPONSE');
      expect(err.message).toBe('boom');
      expect(err.name).toBe('ToolValidationError');
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('fixtures from platform-mcp-gateway + observability docs', () => {
    describe('rate-limit-error-handling-improvements.md — Today\'s responses', () => {
      it('minute rate limit', () => {
        const contentText =
          'Error: Minute rate limit exceeded: {"response":{"errors":[{"message":"Minute rate limit exceeded","extensions":{"code":"MINUTE_RATE_LIMIT_EXCEEDED","retry_in_seconds":58}}],"extensions":{"request_id":"dee15865-84cd-4c33-a452-e63711aca5a2"},"status":429,"headers":{}},"request":{"query":"query GetBoardInfoJustColumns($boardId: ID!) { boards(ids: [$boardId]) { columns { id title description type settings revision } } }","variables":{"boardId":5000606717}}}';

        const result = formatToolError(toToolkitError(contentText));

        expect(result.structuredContent).toEqual({ message: contentText.slice('Error: '.length) });
        expect(result.content?.[0]?.text).toBe(contentText);
      });

      it('concurrency limit', () => {
        const contentText =
          'Error: Too many concurrent requests: {"response":{"errors":[{"message":"Too many concurrent requests","extensions":{"code":"MAX_CONCURRENCY_EXCEEDED","retry_in_seconds":15}}],"extensions":{"request_id":"4b706982-1004-4ea3-88fa-9b01cf46ef6f"},"status":429,"headers":{}},"request":{"query":"query GetBoardInfo($boardId: ID!) { boards(ids: [$boardId]) { id name } }","variables":{"boardId":"151321135"}}}';

        const result = formatToolError(toToolkitError(contentText));

        expect(result.structuredContent).toEqual({ message: contentText.slice('Error: '.length) });
        expect(result.content?.[0]?.text).toBe(contentText);
      });

      it('daily consumption quota', () => {
        const contentText =
          'Error: Daily limit exceeded: {"response":{"errors":[{"message":"Daily limit exceeded","extensions":{"code":"DAILY_LIMIT_EXCEEDED","retry_in_seconds":3599}}],"extensions":{"request_id":"092b4d0f-5a62-4509-9629-35529744560a"},"status":429,"headers":{}},"request":{"query":"<same query as above>","variables":{"boardId":"151321135"}}}';

        const result = formatToolError(toToolkitError(contentText));

        expect(result.structuredContent).toEqual({ message: contentText.slice('Error: '.length) });
        expect(result.content?.[0]?.text).toBe(contentText);
      });

      it('query complexity budget', () => {
        const contentText =
          'Error: Complexity budget exhausted: {"response":{"errors":[{"message":"Complexity budget exhausted","extensions":{"code":"COMPLEXITY_BUDGET_EXHAUSTED","retry_in_seconds":22}}],"extensions":{"request_id":"0eb719eb-d1dc-40b4-bb52-8448cee4a938"},"status":429,"headers":{}},"request":{"query":"<same query as above>","variables":{"boardId":"151321135"}}}';

        const result = formatToolError(toToolkitError(contentText));

        expect(result.structuredContent).toEqual({ message: contentText.slice('Error: '.length) });
        expect(result.content?.[0]?.text).toBe(contentText);
      });

      it('subgraph partial-success rate limit (data-structure)', () => {
        const contentText =
          'Error: Rate limit already blocked for board-columns-errors: {"response":{"data":{"boards":[{"id":"151321135","name":"Stam","columns":null}]},"errors":[{"message":"Rate limit already blocked for board-columns-errors","path":["boards",0,"columns"],"extensions":{"code":"tooManyRequests","status_code":400,"service":"data-structure"}}],"extensions":{"request_id":"772de14b-6340-4b95-9af2-6ced38a7e899"},"status":200,"headers":{}},"request":{"query":"<same query as above>","variables":{"boardId":"151321135"}}}';

        const result = formatToolError(toToolkitError(contentText));

        expect(result.structuredContent).toEqual({ message: contentText.slice('Error: '.length) });
        expect(result.content?.[0]?.text).toBe(contentText);
      });
    });

    describe('observability-fixtures.md — Shape C local validation', () => {
      it('Zod invalid_tool_args', () => {
        const contentText =
          'Error: Invalid arguments: [\n  {\n    "code": "invalid_type",\n    "expected": "number",\n    "received": "string",\n    "path": ["boardId"],\n    "message": "Expected number, received string"\n  }\n]';

        const result = formatToolError(toToolkitError(contentText));

        expect(result.structuredContent).toEqual({
          message: 'Invalid arguments: [\n  {\n    "code": "invalid_type",\n    "expected": "number",\n    "received": "string",\n    "path": ["boardId"],\n    "message": "Expected number, received string"\n  }\n]',
        });
        expect(result.content?.[0]?.text).toBe(contentText);
      });

      it('local GraphQL validation', () => {
        const contentText =
          'Error: Unknown argument "board_ids" on field "Mutation.create_item". Did you mean "board_id"?, Field "create_item" argument "board_id" of type "ID!" is required, but it was not provided.';

        const result = formatToolError(toToolkitError(contentText));

        expect(result.structuredContent).toEqual({
          message:
            'Unknown argument "board_ids" on field "Mutation.create_item". Did you mean "board_id"?, Field "create_item" argument "board_id" of type "ID!" is required, but it was not provided.',
        });
        expect(result.content?.[0]?.text).toBe(contentText);
      });

      it('unknown GraphQL field', () => {
        const contentText = 'Error: Cannot query field "thisFieldDoesNotExist" on type "Query".';

        const result = formatToolError(toToolkitError(contentText));

        expect(result.structuredContent).toEqual({
          message: 'Cannot query field "thisFieldDoesNotExist" on type "Query".',
        });
        expect(result.content?.[0]?.text).toBe(contentText);
      });

      it('local columnValues JSON parse', () => {
        const contentText =
          'Error: Invalid columnValues JSON: Unexpected token \'o\', "not-valid-json" is not valid JSON';

        const result = formatToolError(toToolkitError(contentText));

        expect(result.structuredContent).toEqual({
          message: 'Invalid columnValues JSON: Unexpected token \'o\', "not-valid-json" is not valid JSON',
        });
        expect(result.content?.[0]?.text).toBe(contentText);
      });
    });

    describe('observability-fixtures.md — Shape B rethrowWithContext', () => {
      it('API business error InvalidBoardIdException via preserved response', () => {
        const error = toToolkitError(
          'Failed to execute GraphQL operation: The board does not exist. Please check your board ID and try again (details: {"code":"InvalidBoardIdException","error_data":{"board_id":123}})',
        );
        (error as any).response = {
          errors: [
            {
              message: 'The board does not exist. Please check your board ID and try again',
              extensions: { code: 'InvalidBoardIdException', error_data: { board_id: 123 } },
            },
          ],
        };

        const result = formatToolError(error);

        expect(result.structuredContent).toMatchObject({
          message:
            'Failed to execute GraphQL operation: The board does not exist. Please check your board ID and try again (details: {"code":"InvalidBoardIdException","error_data":{"board_id":123}})',
          errors: [
            {
              message: 'The board does not exist. Please check your board ID and try again',
              code: 'InvalidBoardIdException',
              error_data: { board_id: 123 },
            },
          ],
        });
        expect(result.content?.[0]?.text).toBe(
          'Error: Failed to execute GraphQL operation: The board does not exist. Please check your board ID and try again (details: {"code":"InvalidBoardIdException","error_data":{"board_id":123}})',
        );
      });
    });

    describe('observability-fixtures.md — unit-test error payloads', () => {
      it('gateway minute rate limit full blob', () => {
        const contentText =
          'Error: Minute rate limit exceeded: {"response":{"errors":[{"message":"Minute rate limit exceeded","extensions":{"code":"MINUTE_RATE_LIMIT_EXCEEDED","retry_in_seconds":60}}],"extensions":{"request_id":"req-1"},"status":429,"headers":{}},"request":{}}';

        const structured = buildToolErrorStructuredContent(toToolkitError(contentText));

        expect(structured).toEqual({ message: contentText.slice('Error: '.length) });
      });

      it('subgraph rate limit full blob', () => {
        const contentText =
          'Error: Rate limit exceeded for board-columns: {"response":{"errors":[{"message":"Rate limit exceeded for board-columns","extensions":{"code":"tooManyRequests","status_code":400,"service":"data-structure"}}],"extensions":{"request_id":"req-2"},"status":200,"headers":{}},"request":{}}';

        const structured = buildToolErrorStructuredContent(toToolkitError(contentText));

        expect(structured).toEqual({ message: contentText.slice('Error: '.length) });
      });

      it('multiple graphql errors in one response', () => {
        const error = new Error('GraphQL Error');
        (error as any).response = {
          errors: [
            { message: 'Invalid item ID', extensions: { code: 'InvalidItemId' } },
            { message: 'Insufficient permissions', extensions: { code: 'InsufficientPermissions' } },
          ],
          extensions: { request_id: 'req-multi' },
          status: 200,
        };

        const result = formatToolError(error);

        expect(result.structuredContent).toMatchObject({
          message: 'GraphQL Error',
          request_id: 'req-multi',
          status: 200,
          errors: [
            { message: 'Invalid item ID', code: 'InvalidItemId' },
            { message: 'Insufficient permissions', code: 'InsufficientPermissions' },
          ],
        });
        expect(result.content?.[0]?.text).toBe('Error: GraphQL Error');
      });

      it('API variable validation extensions.problems (B6)', () => {
        const contentText =
          'Error: Variable $columnValues of type JSON! was provided invalid value: {"response":{"errors":[{"message":"Variable $columnValues of type JSON! was provided invalid value","extensions":{"value":"not-valid-json","problems":[{"path":[],"explanation":"Syntax error in JSON input"}],"service":"monolith"}}],"extensions":{"request_id":"req-3"},"status":200,"headers":{}},"request":{}}';

        const structured = buildToolErrorStructuredContent(toToolkitError(contentText));

        expect(structured).toEqual({ message: contentText.slice('Error: '.length) });
      });

      it('timeout integration payload (no graphql message)', () => {
        const contentText =
          'Error: Request processing timeout exceeded: {"response":{"errors":[{"extensions":{"code":"TIMEOUT_EXCEEDED"}}],"status":503},"request":{}}';

        const structured = buildToolErrorStructuredContent(toToolkitError(contentText));

        expect(structured).toEqual({ message: contentText.slice('Error: '.length) });
      });

      it('request timeout staging payload (fixture §7 — with graphql message)', () => {
        const contentText =
          'Error: Request processing timeout exceeded: {"response":{"errors":[{"message":"Request processing timeout exceeded","extensions":{"code":"TIMEOUT_EXCEEDED"}}],"status":503,"headers":{}},"request":{}}';

        const result = formatToolError(toToolkitError(contentText));

        expect(result.structuredContent).toEqual({ message: contentText.slice('Error: '.length) });
        expect(result.content?.[0]?.text).toBe(contentText);
      });

      it('invalid columnValues via API problems', () => {
        const contentText =
          'Error: Variable $columnValues of type JSON! was provided invalid value: {"response":{"errors":[{"extensions":{"problems":[{"explanation":"Syntax error in JSON input"}],"service":"monolith"}}],"extensions":{"request_id":"x"},"status":200},"request":{}}';

        const structured = buildToolErrorStructuredContent(toToolkitError(contentText));

        expect(structured).toEqual({ message: contentText.slice('Error: '.length) });
      });
    });
  });

  describe('isRateLimitError', () => {
    const withResponse = (response: unknown) => {
      const err = new Error('boom');
      (err as any).response = response;
      return err;
    };

    it('returns true for HTTP status 429', () => {
      const err = withResponse({ status: 429, errors: [{ message: 'rl' }] });
      expect(isRateLimitError(err)).toBe(true);
    });

    it('returns false for status 200 regardless of error code', () => {
      const err = withResponse({
        status: 200,
        errors: [{ extensions: { code: 'MINUTE_RATE_LIMIT_EXCEEDED' } }],
      });
      expect(isRateLimitError(err)).toBe(false);
    });

    it('returns false for errors without a response', () => {
      expect(isRateLimitError(new Error('plain'))).toBe(false);
      expect(isRateLimitError('string')).toBe(false);
      expect(isRateLimitError(undefined)).toBe(false);
    });
  });
  });
});
