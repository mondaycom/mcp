import { zodToJsonSchema } from 'zod-to-json-schema';
import { getDeploymentStatusSchema } from './code-schemas';

describe('getDeploymentStatusSchema', () => {
  it('accepts a positive integer app version ID', () => {
    expect(getDeploymentStatusSchema.safeParse({ appVersionId: 12345 }).success).toBe(true);
  });

  it.each([0, -1, 1.5])('rejects %p as an app version ID', (appVersionId) => {
    expect(getDeploymentStatusSchema.safeParse({ appVersionId }).success).toBe(false);
  });

  it('emits a Copilot-compatible app version ID schema', () => {
    const schema = zodToJsonSchema(getDeploymentStatusSchema);

    expect(schema).toMatchObject({
      properties: {
        appVersionId: {
          type: 'integer',
          minimum: 1,
        },
      },
    });
    expect(JSON.stringify(schema)).not.toContain('exclusiveMinimum');
  });
});
