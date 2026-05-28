import { createMockApiClient } from './test-utils/mock-api-client';
import { UseTemplateTool, useTemplateToolSchema } from './use-template-tool';
import { BoardKind } from '../../../monday-graphql/generated/graphql/graphql';
import { z } from 'zod';

describe('UseTemplateTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('passes templateId and optional fields to the mutation', async () => {
    mocks.setResponse({ use_template: { process_id: 'pid-1' } });
    const tool = new UseTemplateTool(mocks.mockApiClient);

    const out = await tool.execute({
      templateId: 123,
      destinationWorkspaceId: 456,
      destinationName: 'My Project',
      boardKind: BoardKind.Public,
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('mutation useTemplate'),
      expect.objectContaining({
        templateId: 123,
        destinationWorkspaceId: 456,
        destinationName: 'My Project',
        boardKind: BoardKind.Public,
      }),
    );
    expect(out.content).toContain('pid-1');
  });

  it('returns failure message when process_id is absent', async () => {
    mocks.setResponse({ use_template: null });
    const tool = new UseTemplateTool(mocks.mockApiClient);

    const out = await tool.execute({ templateId: 123 });
    expect(out.content).toMatch(/Failed to start template/i);
  });

  it('schema rejects non-numeric templateId so the MCP layer never calls the tool with bad input', () => {
    const schema = z.object(useTemplateToolSchema);
    expect(schema.safeParse({ templateId: 'abc' }).success).toBe(false);
    expect(schema.safeParse({ templateId: '' }).success).toBe(false);
    expect(schema.safeParse({ templateId: 0 }).success).toBe(false);
    expect(schema.safeParse({ templateId: 123 }).success).toBe(true);
  });

  it('does not send boardKind when omitted, letting the API use its default', async () => {
    mocks.setResponse({ use_template: { process_id: 'pid-2' } });
    const tool = new UseTemplateTool(mocks.mockApiClient);

    await tool.execute({ templateId: 99 });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('mutation useTemplate'),
      expect.objectContaining({ templateId: 99, boardKind: undefined }),
    );
  });
});
