import { z } from 'zod';
import { fallbackToStringifiedVersionIfNull } from '../microsoft-copilot.utils';

describe('fallbackToStringifiedVersionIfNull', () => {
  // Define test schemas
  const simpleSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  const complexSchema = z.object({
    user: z.object({
      id: z.number(),
      email: z.string().email(),
    }),
    tags: z.array(z.string()),
  });

  describe('Early return scenarios', () => {
    it('should return early when jsonKey already has a value', () => {
      const input = {
        data: { name: 'John', age: 30 },
        dataStringified: '{"name":"Jane","age":25}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);

      // Should not override existing value
      expect(input.data).toEqual({ name: 'John', age: 30 });
    });

    it('should return early when stringifiedJsonKey is null', () => {
      const input = {
        data: null,
        dataStringified: null,
      };

      fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);

      // Should remain null since no stringified version exists
      expect(input.data).toBeNull();
    });

    it('should return early when stringifiedJsonKey is empty string', () => {
      const input = {
        data: null,
        dataStringified: '',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);

      // Should remain null since empty string is falsy
      expect(input.data).toBeNull();
    });

  });

  describe('Error scenarios', () => {
    it('should throw error when stringifiedJsonKey contains invalid JSON', () => {
      const input = {
        data: null,
        dataStringified: 'not a valid json',
      };

      expect(() => {
        fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);
      }).toThrow('dataStringified is not a valid JSON');
    });

    it('should throw error when parsed data does not match schema (missing field)', () => {
      const input = {
        data: null,
        dataStringified: '{"name":"John"}',
      };

      expect(() => {
        fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);
      }).toThrow('JSON string defined as dataStringified does not match the specified schema');
    });

    it('should throw error when parsed data has wrong type', () => {
      const input = {
        data: null,
        dataStringified: '{"name":"John","age":"thirty"}',
      };

      expect(() => {
        fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);
      }).toThrow('JSON string defined as dataStringified does not match the specified schema');
    });

    it('should throw error when stringified JSON is a plain string instead of object', () => {
      const input = {
        data: null,
        dataStringified: '"just a string"',
      };

      expect(() => {
        fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);
      }).toThrow('JSON string defined as dataStringified does not match the specified schema');
    });

    it('should throw error when stringified JSON is a number instead of object', () => {
      const input = {
        data: null,
        dataStringified: '42',
      };

      expect(() => {
        fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);
      }).toThrow('JSON string defined as dataStringified does not match the specified schema');
    });

    it('should throw error when stringified JSON is an array instead of object', () => {
      const input = {
        data: null,
        dataStringified: '["item1","item2","item3"]',
      };

      expect(() => {
        fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);
      }).toThrow('JSON string defined as dataStringified does not match the specified schema');
    });

    it('should throw error when stringified JSON is a boolean instead of object', () => {
      const input = {
        data: null,
        dataStringified: 'true',
      };

      expect(() => {
        fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);
      }).toThrow('JSON string defined as dataStringified does not match the specified schema');
    });

    it('should throw error when stringified JSON is null', () => {
      const input = {
        data: null,
        dataStringified: 'null',
      };

      expect(() => {
        fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);
      }).toThrow('JSON string defined as dataStringified does not match the specified schema');
    });
    
  });

  describe('Success scenarios - Direct object (unwrapped)', () => {
    it('should parse and assign direct object successfully', () => {
      const input = {
        data: null,
        dataStringified: '{"name":"John","age":30}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);

      expect(input.data).toEqual({ name: 'John', age: 30 });
    });

    it('should parse and assign complex nested object successfully', () => {
      const input = {
        data: null,
        dataStringified: '{"user":{"id":123,"email":"test@example.com"},"tags":["tag1","tag2","tag3"]}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', complexSchema);

      expect(input.data).toEqual({
        user: { id: 123, email: 'test@example.com' },
        tags: ['tag1', 'tag2', 'tag3'],
      });
    });

    it('should handle direct object with null values', () => {
      const schemaWithOptional = z.object({
        name: z.string(),
        age: z.number().nullable(),
      });

      const input = {
        data: null,
        dataStringified: '{"name":"John","age":null}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', schemaWithOptional);

      expect(input.data).toEqual({ name: 'John', age: null });
    });

    it('should handle direct object with array values', () => {
      const arraySchema = z.object({
        items: z.array(z.number()),
      });

      const input = {
        data: null,
        dataStringified: '{"items":[1,2,3,4,5]}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', arraySchema);

      expect(input.data).toEqual({ items: [1, 2, 3, 4, 5] });
    });

    it('should handle direct object with boolean values', () => {
      const booleanSchema = z.object({
        isActive: z.boolean(),
        isVerified: z.boolean(),
      });

      const input = {
        data: null,
        dataStringified: '{"isActive":true,"isVerified":false}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', booleanSchema);

      expect(input.data).toEqual({ isActive: true, isVerified: false });
    });

    it('should handle record type with unknown values', () => {
      const recordSchema = z.object({
        settings: z.record(z.unknown()).optional(),
      });

      const input = {
        data: null,
        dataStringified: '{"settings":{"color":"blue","fontSize":14,"enabled":true,"nested":{"key":"value"}}}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', recordSchema);

      expect(input.data).toEqual({
        settings: {
          color: 'blue',
          fontSize: 14,
          enabled: true,
          nested: { key: 'value' },
        },
      });
    });

    it('should handle record type with string values', () => {
      const recordSchema = z.object({
        metadata: z.record(z.string()),
      });

      const input = {
        data: null,
        dataStringified: '{"metadata":{"author":"John Doe","version":"1.0.0","status":"active"}}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', recordSchema);

      expect(input.data).toEqual({
        metadata: {
          author: 'John Doe',
          version: '1.0.0',
          status: 'active',
        },
      });
    });

    it('should handle record type with empty object', () => {
      const recordSchema = z.object({
        settings: z.record(z.unknown()).optional(),
      });

      const input = {
        data: null,
        dataStringified: '{"settings":{}}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', recordSchema);

      expect(input.data).toEqual({ settings: {} });
    });
  });

  describe('Success scenarios - Wrapped object (Copilot format)', () => {
    it('should unwrap and assign Copilot-wrapped object successfully', () => {
      const input = {
        data: null,
        dataStringified: '{"data":{"name":"Jane","age":25}}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);

      expect(input.data).toEqual({ name: 'Jane', age: 25 });
    });

    it('should detect wrapped object with single key matching jsonKey', () => {
      const input = {
        userData: null,
        userDataStringified: '{"userData":{"name":"Alice","age":35}}',
      };

      fallbackToStringifiedVersionIfNull(input, 'userData', simpleSchema);

      expect(input.userData).toEqual({ name: 'Alice', age: 35 });
    });

    it('should unwrap complex nested object from Copilot format', () => {
      const input = {
        data: null,
        dataStringified: '{"data":{"user":{"id":456,"email":"copilot@example.com"},"tags":["ai","assistant"]}}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', complexSchema);

      expect(input.data).toEqual({
        user: { id: 456, email: 'copilot@example.com' },
        tags: ['ai', 'assistant'],
      });
    });

    it('should not unwrap object with multiple keys', () => {
      const multiKeySchema = z.object({
        name: z.string(),
        age: z.number(),
        city: z.string().optional(),
      });

      const input = {
        data: null,
        dataStringified: '{"name":"Bob","age":40}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', multiKeySchema);

      // Should assign directly without unwrapping
      expect(input.data).toEqual({ name: 'Bob', age: 40 });
    });

    it('should not unwrap when wrapped object has additional keys', () => {
      const input = {
        data: null,
        dataStringified: '{"data":{"name":"Charlie","age":28},"extra":"field"}',
      };

      // This should fail validation because the outer object doesn't match the schema
      expect(() => {
        fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);
      }).toThrow('JSON string defined as dataStringified does not match the specified schema');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty object', () => {
      const emptySchema = z.object({});

      const input = {
        data: null,
        dataStringified: '{}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', emptySchema);

      expect(input.data).toEqual({});
    });

    it('should handle wrapped empty object', () => {
      const emptySchema = z.object({});

      const input = {
        data: null,
        dataStringified: '{"data":{}}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', emptySchema);

      expect(input.data).toEqual({});
    });

    it('should handle object with special characters in values', () => {
      const input = {
        data: null,
        dataStringified: '{"name":"O\'Neill","age":30}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);

      expect(input.data).toEqual({ name: "O'Neill", age: 30 });
    });

    it('should handle object with unicode characters', () => {
      const input = {
        data: null,
        dataStringified: '{"name":"José García","age":30}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);

      expect(input.data).toEqual({ name: 'José García', age: 30 });
    });

    it('should handle deeply nested objects', () => {
      const deepSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              value: z.string(),
            }),
          }),
        }),
      });

      const input = {
        data: null,
        dataStringified: '{"level1":{"level2":{"level3":{"value":"deep"}}}}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', deepSchema);

      expect(input.data).toEqual({
        level1: { level2: { level3: { value: 'deep' } } },
      });
    });

    it('should handle schema with default values', () => {
      const schemaWithDefaults = z.object({
        name: z.string(),
        age: z.number(),
        status: z.string().default('active'),
      });

      const input = {
        data: null,
        dataStringified: '{"name":"John","age":30}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', schemaWithDefaults);

      expect(input.data).toEqual({ name: 'John', age: 30, status: 'active' });
    });

    it('should handle schema with transformed values', () => {
      const transformSchema = z.object({
        name: z.string().transform((val) => val.toUpperCase()),
        age: z.number(),
      });

      const input = {
        data: null,
        dataStringified: '{"name":"john","age":30}',
      };

      fallbackToStringifiedVersionIfNull(input, 'data', transformSchema);

      expect(input.data).toEqual({ name: 'JOHN', age: 30 });
    });

    it('should parse stringified version when jsonKey has falsy value (0, false)', () => {
      // 0 and false are falsy, so the function treats them as "no value" and parses the stringified version
      const input1 = {
        data: 0,
        dataStringified: '{"name":"John","age":30}',
      };

      fallbackToStringifiedVersionIfNull(input1, 'data', simpleSchema);
      expect(input1.data).toEqual({ name: 'John', age: 30 }); // Should parse stringified version

      const input2 = {
        data: false,
        dataStringified: '{"name":"Jane","age":25}',
      };

      fallbackToStringifiedVersionIfNull(input2, 'data', simpleSchema);
      expect(input2.data).toEqual({ name: 'Jane', age: 25 }); // Should parse stringified version
    });
  });

  describe('Type safety and different input types', () => {
    it('should work with different key names', () => {
      const input = {
        formData: null,
        formDataStringified: '{"name":"Test","age":25}',
      };

      fallbackToStringifiedVersionIfNull(input, 'formData', simpleSchema);

      expect(input.formData).toEqual({ name: 'Test', age: 25 });
    });

    it('should work with symbol-like key names', () => {
      const input = {
        'config_data': null,
        'config_dataStringified': '{"name":"Config","age":50}',
      };

      fallbackToStringifiedVersionIfNull(
        input,
        'config_data',
        simpleSchema
      );

      expect(input.config_data).toEqual({ name: 'Config', age: 50 });
    });

    it('should handle mixed types in input object', () => {
      const input = {
        data: null,
        dataStringified: '{"name":"Mixed","age":30}',
        otherField: 'should remain unchanged',
        numericField: 42,
      };

      fallbackToStringifiedVersionIfNull(input, 'data', simpleSchema);

      expect(input.data).toEqual({ name: 'Mixed', age: 30 });
      expect(input.otherField).toBe('should remain unchanged');
      expect(input.numericField).toBe(42);
    });
  });
});

