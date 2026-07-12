import { createMockApiClient } from '../test-utils/mock-api-client';
import { GetMondayKnowledgeTool } from './get-monday-knowledge';

describe('GetMondayKnowledgeTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  describe('kind=general', () => {
    it('returns a normalized answer with sources', async () => {
      mocks.setResponse({
        knowledge_base_search: {
          answer: 'You can create an automation from the Automation Center.',
          raw_snippets: [
            {
              id: '1',
              title: 'Automation Center',
              text: 'Go to automations to get started.',
              url: 'https://support.monday.com/automations',
              distance: 0.1,
              parent_id: null,
            },
            {
              id: '2',
              title: 'Automation triggers',
              text: 'Learn about triggers.',
              url: 'https://support.monday.com/triggers',
              distance: 0.2,
              parent_id: null,
            },
          ],
        },
      });

      const tool = new GetMondayKnowledgeTool(mocks.mockApiClient);
      const result = await tool.execute({ query: 'How do I create an automation?', kind: 'general' });

      expect(result.content).toEqual({
        answer: 'You can create an automation from the Automation Center.',
        sources: [
          {
            title: 'Automation Center',
            url: 'https://support.monday.com/automations',
            snippet: 'Go to automations to get started.',
          },
          {
            title: 'Automation triggers',
            url: 'https://support.monday.com/triggers',
            snippet: 'Learn about triggers.',
          },
        ],
        kind: 'general',
      });
    });

    it('filters out snippets missing url or title', async () => {
      mocks.setResponse({
        knowledge_base_search: {
          answer: 'Some answer.',
          raw_snippets: [
            { id: '1', title: 'Has both', url: 'https://example.com', text: 'text', distance: 0.1, parent_id: null },
            { id: '2', title: null, url: 'https://example.com/no-title', text: 'text', distance: 0.2, parent_id: null },
            { id: '3', title: 'No URL', url: null, text: 'text', distance: 0.3, parent_id: null },
          ],
        },
      });

      const tool = new GetMondayKnowledgeTool(mocks.mockApiClient);
      const result = await tool.execute({ query: 'test', kind: 'general' });

      expect((result.content as any).sources).toHaveLength(1);
      expect((result.content as any).sources[0].title).toBe('Has both');
    });

    it('throws when answer is null', async () => {
      mocks.setResponse({ knowledge_base_search: { answer: null, raw_snippets: [] } });

      const tool = new GetMondayKnowledgeTool(mocks.mockApiClient);
      await expect(tool.execute({ query: 'test', kind: 'general' })).rejects.toThrow(
        'No answer found in the knowledge base',
      );
    });

    it('throws when knowledge_base_search is null', async () => {
      mocks.setResponse({ knowledge_base_search: null });

      const tool = new GetMondayKnowledgeTool(mocks.mockApiClient);
      await expect(tool.execute({ query: 'test', kind: 'general' })).rejects.toThrow(
        'No answer found in the knowledge base',
      );
    });

    it('passes query and limit=5 to the API', async () => {
      mocks.setResponse({
        knowledge_base_search: { answer: 'answer', raw_snippets: [] },
      });

      const tool = new GetMondayKnowledgeTool(mocks.mockApiClient);
      await tool.execute({ query: 'what is a board?', kind: 'general' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('knowledge_base_search'),
        { query: 'what is a board?', limit: 5 },
      );
    });
  });

  describe('kind=developer_docs', () => {
    it('returns a normalized answer with empty sources', async () => {
      mocks.setResponse({
        ask_developer_docs: {
          id: 'abc123',
          question: 'How do I use the monday SDK?',
          answer: 'Install it with npm install @mondaydotcomorg/sdk.',
          conversation_id: 'conv1',
        },
      });

      const tool = new GetMondayKnowledgeTool(mocks.mockApiClient);
      const result = await tool.execute({ query: 'How do I use the monday SDK?', kind: 'developer_docs' });

      expect(result.content).toEqual({
        answer: 'Install it with npm install @mondaydotcomorg/sdk.',
        sources: [],
        kind: 'developer_docs',
      });
    });

    it('throws when answer is missing', async () => {
      mocks.setResponse({ ask_developer_docs: null });

      const tool = new GetMondayKnowledgeTool(mocks.mockApiClient);
      await expect(tool.execute({ query: 'test', kind: 'developer_docs' })).rejects.toThrow(
        'No answer found in developer docs',
      );
    });

    it('passes only query to the ask_developer_docs API', async () => {
      mocks.setResponse({
        ask_developer_docs: { answer: 'answer', id: '1', question: 'q', conversation_id: 'c' },
      });

      const tool = new GetMondayKnowledgeTool(mocks.mockApiClient);
      await tool.execute({ query: 'how to deploy?', kind: 'developer_docs' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('ask_developer_docs'),
        { query: 'how to deploy?' },
      );
    });
  });
});
