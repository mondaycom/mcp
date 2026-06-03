import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../test-utils/mock-api-client';

describe('ConfigureAiColumnTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  describe('block_type=categorize', () => {
    it('should configure categorize block successfully', async () => {
      mocks.setResponseOnce({ configure_categorize_ai_column: { column_id: 'status_col' } });

      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'status_col',
        block_type: 'categorize',
        source_type: 'item_name',
      });
      const parsed = parseToolResult(result);

      expect(parsed.message).toContain('configured successfully');
      expect(parsed.column_id).toBe('status_col');
    });

    it('should pass versionOverride dev and correct variables', async () => {
      mocks.setResponseOnce({ configure_categorize_ai_column: { column_id: 'col1' } });

      await callToolByNameRawAsync('configure_ai_column', {
        board_id: 456,
        column_id: 'col1',
        block_type: 'categorize',
        source_type: 'column',
        source_column_id: 'text_col',
        additional_instructions: 'Use: Bug, Feature, Chore',
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('ConfigureCategorizeAiColumn'),
        expect.objectContaining({
          boardId: '456',
          columnId: 'col1',
          sourceType: 'column',
          sourceColumnId: 'text_col',
          additionalInstructions: 'Use: Bug, Feature, Chore',
        }),
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should error when source_type is missing', async () => {
      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'col1',
        block_type: 'categorize',
      });

      expect(result.content[0].text).toContain('source_type is required');
    });

    it('should error when source_type is column but source_column_id is missing', async () => {
      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'col1',
        block_type: 'categorize',
        source_type: 'column',
      });

      expect(result.content[0].text).toContain('source_column_id is required');
    });
  });

  describe('block_type=summarize', () => {
    it('should configure summarize block successfully', async () => {
      mocks.setResponseOnce({ configure_summarize_ai_column: { column_id: 'text_col' } });

      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'text_col',
        block_type: 'summarize',
        source_type: 'thread',
        additional_instructions: '3 bullet points max',
      });
      const parsed = parseToolResult(result);

      expect(parsed.message).toContain('configured successfully');
      expect(parsed.column_id).toBe('text_col');
    });
  });

  describe('block_type=translate', () => {
    it('should configure translate block successfully', async () => {
      mocks.setResponseOnce({ configure_translate_ai_column: { column_id: 'text_col' } });

      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'text_col',
        block_type: 'translate',
        source_type: 'item_name',
        target_language: 'spanish',
      });
      const parsed = parseToolResult(result);

      expect(parsed.message).toContain('configured successfully');
      expect(parsed.column_id).toBe('text_col');
    });

    it('should error when target_language is missing', async () => {
      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'col1',
        block_type: 'translate',
        source_type: 'item_name',
      });

      expect(result.content[0].text).toContain('target_language is required');
    });
  });

  describe('block_type=improve_text', () => {
    it('should configure improve_text block with optional fields', async () => {
      mocks.setResponseOnce({ configure_improve_text_ai_column: { column_id: 'text_col' } });

      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'text_col',
        block_type: 'improve_text',
        source_type: 'column',
        source_column_id: 'long_text_col',
        tone: 'professional',
        improver_length: 'shorter',
        refinement_type: 'minimal_changes',
      });
      const parsed = parseToolResult(result);

      expect(parsed.message).toContain('configured successfully');
    });

    it('should pass improver_length as length variable', async () => {
      mocks.setResponseOnce({ configure_improve_text_ai_column: { column_id: 'col1' } });

      await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'col1',
        block_type: 'improve_text',
        source_type: 'item_name',
        improver_length: 'longer',
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('ConfigureImproveTextAiColumn'),
        expect.objectContaining({ length: 'longer' }),
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });
  });

  describe('block_type=extract', () => {
    it('should configure extract block with preset entity_type', async () => {
      mocks.setResponseOnce({ configure_extract_ai_column: { column_id: 'text_col' } });

      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'text_col',
        block_type: 'extract',
        source_type: 'column',
        source_column_id: 'long_text_col',
        entity_type: 'email_address',
      });
      const parsed = parseToolResult(result);

      expect(parsed.message).toContain('configured successfully');
    });

    it('should error when entity_type is missing', async () => {
      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'col1',
        block_type: 'extract',
        source_type: 'item_name',
      });

      expect(result.content[0].text).toContain('entity_type is required');
    });

    it('should error when entity_type is custom but custom_instructions is missing', async () => {
      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'col1',
        block_type: 'extract',
        source_type: 'item_name',
        entity_type: 'custom',
      });

      expect(result.content[0].text).toContain('custom_instructions is required');
    });
  });

  describe('block_type=open_block', () => {
    it('should configure open_block without source_type', async () => {
      mocks.setResponseOnce({ configure_open_block_ai_column: { column_id: 'text_col' } });

      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'text_col',
        block_type: 'open_block',
        ai_query: 'Analyze {pulse.description_col} and rate complexity from 1-5',
      });
      const parsed = parseToolResult(result);

      expect(parsed.message).toContain('configured successfully');
    });

    it('should error when ai_query is missing', async () => {
      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'col1',
        block_type: 'open_block',
      });

      expect(result.content[0].text).toContain('ai_query is required');
    });
  });

  describe('block_type=write_me', () => {
    it('should configure write_me block successfully', async () => {
      mocks.setResponseOnce({ configure_write_me_ai_column: { column_id: 'text_col' } });

      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'text_col',
        block_type: 'write_me',
        ai_query: 'Write a professional follow-up email about {pulse.name}',
        tone: 'professional',
        output_length: 'paragraph',
      });
      const parsed = parseToolResult(result);

      expect(parsed.message).toContain('configured successfully');
    });

    it('should pass output_length as length variable', async () => {
      mocks.setResponseOnce({ configure_write_me_ai_column: { column_id: 'col1' } });

      await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'col1',
        block_type: 'write_me',
        ai_query: 'Write about {pulse.name}',
        tone: 'casual',
        output_length: 'sentence',
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('ConfigureWriteMeAiColumn'),
        expect.objectContaining({ length: 'sentence', tone: 'casual' }),
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should error when ai_query is missing', async () => {
      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'col1',
        block_type: 'write_me',
        tone: 'professional',
        output_length: 'paragraph',
      });

      expect(result.content[0].text).toContain('ai_query is required');
    });

    it('should error when tone is missing', async () => {
      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'col1',
        block_type: 'write_me',
        ai_query: 'Write about {pulse.name}',
        output_length: 'paragraph',
      });

      expect(result.content[0].text).toContain('tone is required');
    });

    it('should error when output_length is missing', async () => {
      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'col1',
        block_type: 'write_me',
        ai_query: 'Write about {pulse.name}',
        tone: 'professional',
      });

      expect(result.content[0].text).toContain('output_length is required');
    });
  });

  describe('block_type=person_assignment', () => {
    it('should configure person_assignment and pass groups array', async () => {
      mocks.setResponseOnce({ configure_person_assignment_ai_column: { column_id: 'person_col' } });

      const groups = [
        { user_ids: [1, 2], description: 'Frontend team' },
        { user_ids: [3], description: 'Backend lead' },
      ];

      await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'person_col',
        block_type: 'person_assignment',
        source_type: 'thread',
        groups,
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('ConfigurePersonAssignmentAiColumn'),
        expect.objectContaining({ groups }),
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should error when groups is missing', async () => {
      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'col1',
        block_type: 'person_assignment',
        source_type: 'item_name',
      });

      expect(result.content[0].text).toContain('groups is required');
    });
  });

  describe('extra_settings', () => {
    it('should pass run_backfill in extraSettings when specified', async () => {
      mocks.setResponseOnce({ configure_categorize_ai_column: { column_id: 'col1' } });

      await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'col1',
        block_type: 'categorize',
        source_type: 'item_name',
        run_backfill: false,
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ extraSettings: { run_backfill: false } }),
        expect.any(Object),
      );
    });

    it('should not pass extraSettings when run_backfill is not specified', async () => {
      mocks.setResponseOnce({ configure_categorize_ai_column: { column_id: 'col1' } });

      await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'col1',
        block_type: 'categorize',
        source_type: 'item_name',
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ extraSettings: undefined }),
        expect.any(Object),
      );
    });
  });

  describe('error propagation', () => {
    it('should propagate GraphQL errors', async () => {
      mocks.setError('Column "text_col" is of type "text", which is not supported as a target for categorize');

      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        column_id: 'text_col',
        block_type: 'categorize',
        source_type: 'item_name',
      });

      expect(result.content[0].text).toContain('not supported as a target for categorize');
    });
  });

  describe('validation', () => {
    it('should reject when board_id is missing', async () => {
      const result = await callToolByNameRawAsync('configure_ai_column', {
        column_id: 'col1',
        block_type: 'categorize',
        source_type: 'item_name',
      });

      expect(result.content[0].text).toContain('board_id');
    });

    it('should reject when column_id is missing', async () => {
      const result = await callToolByNameRawAsync('configure_ai_column', {
        board_id: 123,
        block_type: 'categorize',
        source_type: 'item_name',
      });

      expect(result.content[0].text).toContain('column_id');
    });
  });
});
