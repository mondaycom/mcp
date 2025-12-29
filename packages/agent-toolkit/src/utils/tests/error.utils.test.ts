import { rethrowWithContext } from '../error.utils';

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
