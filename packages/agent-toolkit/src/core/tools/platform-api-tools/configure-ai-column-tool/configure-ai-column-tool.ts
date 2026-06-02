import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { rethrowWithContext } from '../../../../utils';
import {
  ConfigureCategorizeAiColumnMutation,
  ConfigureSummarizeAiColumnMutation,
  ConfigureTranslateAiColumnMutation,
  ConfigureImproveTextAiColumnMutation,
  ConfigureExtractAiColumnMutation,
  ConfigureOpenBlockAiColumnMutation,
  ConfigureWriteMeAiColumnMutation,
  ConfigurePersonAssignmentAiColumnMutation,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import {
  configureCategorizeAiColumnMutation,
  configureSummarizeAiColumnMutation,
  configureTranslateAiColumnMutation,
  configureImproveTextAiColumnMutation,
  configureExtractAiColumnMutation,
  configureOpenBlockAiColumnMutation,
  configureWriteMeAiColumnMutation,
  configurePersonAssignmentAiColumnMutation,
} from './configure-ai-column-tool.graphql.dev';

const AI_BLOCK_TYPES = [
  'categorize',
  'summarize',
  'translate',
  'improve_text',
  'extract',
  'open_block',
  'write_me',
  'person_assignment',
] as const;

const SOURCE_TYPES = ['item_name', 'thread', 'column', 'emails_and_activities'] as const;

const TONES = ['empathic', 'promotional', 'confident', 'professional', 'natural', 'casual', 'friendly', 'same'] as const;

const OUTPUT_LENGTHS = ['sentence', 'paragraph', 'brief', 'in_depth'] as const;

const IMPROVER_LENGTHS = ['same', 'shorter', 'longer'] as const;

const REFINEMENT_LEVELS = ['minimal_changes', 'moderate_changes', 'high_creativity'] as const;

const LANGUAGES = [
  'english', 'spanish', 'french', 'german', 'hebrew', 'chinese', 'korean', 'arabic',
  'bengali', 'danish', 'dutch', 'hindi', 'indonesian', 'italian', 'japanese', 'norwegian',
  'polish', 'portuguese', 'russian', 'swedish', 'thai', 'turkish', 'vietnamese',
] as const;

const ENTITY_TYPES = [
  'email_address', 'first_name', 'last_name', 'phone_number', 'company_name',
  'domain_name', 'url', 'date', 'time', 'year', 'custom',
] as const;

export const configureAiColumnToolSchema = {
  column_id: z.string().describe('The ID of the column to configure with AI'),
  block_type: z.enum(AI_BLOCK_TYPES).describe(
    'The AI block type to configure. See tool description for which fields apply to each block.',
  ),
  source_type: z.enum(SOURCE_TYPES).optional().describe(
    'Where the AI reads input. Required for all blocks except open_block and write_me. Values: item_name (item name), thread (updates/comments), column (another column — requires source_column_id), emails_and_activities (categorize only).',
  ),
  source_column_id: z.string().optional().describe(
    'The ID of the source column. Required when source_type is "column".',
  ),
  additional_instructions: z.string().optional().describe(
    'Custom instructions for categorize/summarize/extract blocks (max 3000 chars).',
  ),
  target_language: z.enum(LANGUAGES).optional().describe(
    'Required for translate block. The target language to translate text into.',
  ),
  tone: z.enum(TONES).optional().describe(
    'Writing tone. Required for write_me, optional for improve_text.',
  ),
  output_length: z.enum(OUTPUT_LENGTHS).optional().describe(
    'Required for write_me block. Approximate desired output length.',
  ),
  improver_length: z.enum(IMPROVER_LENGTHS).optional().describe(
    'For improve_text only. Desired length relative to input text.',
  ),
  refinement_type: z.enum(REFINEMENT_LEVELS).optional().describe(
    'For improve_text only. Level of text refinement to apply.',
  ),
  entity_type: z.enum(ENTITY_TYPES).optional().describe(
    'Required for extract block. Type of entity to extract from text.',
  ),
  custom_instructions: z.string().optional().describe(
    'Required for extract when entity_type is "custom". Describes what to extract (max 3000 chars).',
  ),
  ai_query: z.string().optional().describe(
    'Required for open_block and write_me. Natural-language prompt. Reference columns via {pulse.column_id}, item name via {pulse.name}, subitems via {pulse.subitem.column_id}. Max 3000 chars.',
  ),
  groups: z.array(z.object({
    user_ids: z.array(z.number()).describe('Array of user IDs in this group'),
    description: z.string().describe('Description of this group (e.g., role, team name, or assignment criteria)'),
  })).optional().describe(
    'Required for person_assignment. Array of groups, each with user_ids and a description.',
  ),
  run_backfill: z.boolean().optional().describe(
    'Whether to immediately apply AI to existing items (up to 200). Defaults to true.',
  ),
};

export const configureAiColumnInBoardToolSchema = {
  board_id: z.number().describe('The ID of the board containing the column'),
  ...configureAiColumnToolSchema,
};

export type ConfigureAiColumnToolInput = typeof configureAiColumnToolSchema | typeof configureAiColumnInBoardToolSchema;

export class ConfigureAiColumnTool extends BaseMondayApiTool<ConfigureAiColumnToolInput> {
  name = 'configure_ai_column';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Configure AI Column',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Configure an AI block on an existing column in a monday.com board. AI columns automatically process item data using AI — categorize items, summarize text, translate content, extract entities, generate text, improve writing, or assign people.

The column must already exist on the board with a compatible type for the chosen block. To create a new AI column, first use create_column to create the column, then use this tool to add AI behavior.

BLOCK TYPES (only pass fields that apply to the chosen block_type):
- categorize:         { block_type, source_type, source_column_id?, additional_instructions? } — assigns labels from target column's existing status/dropdown options
- summarize:          { block_type, source_type, source_column_id?, additional_instructions? } — generates concise summaries
- translate:          { block_type, source_type, source_column_id?, target_language } — translates to target language
- improve_text:       { block_type, source_type, source_column_id?, tone?, improver_length?, refinement_type? } — rewrites/fixes text
- extract:            { block_type, source_type, source_column_id?, entity_type, custom_instructions?, additional_instructions? } — extracts structured info
- open_block:         { block_type, ai_query } — flexible custom prompt, reference columns via {pulse.column_id}
- write_me:           { block_type, ai_query, tone, output_length } — generates new text from prompt
- person_assignment:  { block_type, source_type, source_column_id?, groups } — assigns people based on context

SOURCE TYPES (required for all blocks except open_block and write_me):
- item_name: uses the item's name as input
- thread: uses the item's updates/comments as input
- column: uses another column's value (requires source_column_id)
- emails_and_activities: uses emails & activities (categorize only)

COLUMN REFERENCE SYNTAX (for open_block and write_me ai_query):
- {pulse.column_id} — regular board column
- {pulse.name} — the item name
- {pulse.subitem.column_id} — subitem column

RELATED TOOLS:
- create_column — create the target column first if it doesn't exist
- get_board_schema — discover existing columns and their types/IDs`;
  }

  getInputSchema(): ConfigureAiColumnToolInput {
    if (this.context?.boardId) {
      return configureAiColumnToolSchema;
    }
    return configureAiColumnInBoardToolSchema;
  }

  protected async executeInternal(input: ToolInputType<ConfigureAiColumnToolInput>): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof configureAiColumnInBoardToolSchema>).board_id;
    const extraSettings = input.run_backfill !== undefined ? { run_backfill: input.run_backfill } : undefined;

    try {
      switch (input.block_type) {
        case 'categorize':
          return this.handleCategorize(boardId, input, extraSettings);
        case 'summarize':
          return this.handleSummarize(boardId, input, extraSettings);
        case 'translate':
          return this.handleTranslate(boardId, input, extraSettings);
        case 'improve_text':
          return this.handleImproveText(boardId, input, extraSettings);
        case 'extract':
          return this.handleExtract(boardId, input, extraSettings);
        case 'open_block':
          return this.handleOpenBlock(boardId, input, extraSettings);
        case 'write_me':
          return this.handleWriteMe(boardId, input, extraSettings);
        case 'person_assignment':
          return this.handlePersonAssignment(boardId, input, extraSettings);
      }
    } catch (error) {
      rethrowWithContext(error, 'configure AI column');
    }
  }

  private validateSourceType(input: ToolInputType<ConfigureAiColumnToolInput>, blockType: string): void {
    if (!input.source_type) {
      throw new Error(`source_type is required for ${blockType} block`);
    }
    if (input.source_type === 'column' && !input.source_column_id) {
      throw new Error('source_column_id is required when source_type is "column"');
    }
  }

  private async handleCategorize(
    boardId: number,
    input: ToolInputType<ConfigureAiColumnToolInput>,
    extraSettings?: { run_backfill: boolean },
  ): Promise<ToolOutputType<never>> {
    this.validateSourceType(input, 'categorize');
    const res = await this.mondayApi.request<ConfigureCategorizeAiColumnMutation>(
      configureCategorizeAiColumnMutation,
      {
        boardId: boardId.toString(),
        columnId: input.column_id,
        sourceType: input.source_type,
        sourceColumnId: input.source_column_id,
        additionalInstructions: input.additional_instructions,
        extraSettings,
      },
      { versionOverride: 'dev' },
    );
    return {
      content: { message: 'AI column configured successfully', column_id: res.configure_categorize_ai_column?.column_id },
    };
  }

  private async handleSummarize(
    boardId: number,
    input: ToolInputType<ConfigureAiColumnToolInput>,
    extraSettings?: { run_backfill: boolean },
  ): Promise<ToolOutputType<never>> {
    this.validateSourceType(input, 'summarize');
    const res = await this.mondayApi.request<ConfigureSummarizeAiColumnMutation>(
      configureSummarizeAiColumnMutation,
      {
        boardId: boardId.toString(),
        columnId: input.column_id,
        sourceType: input.source_type,
        sourceColumnId: input.source_column_id,
        additionalInstructions: input.additional_instructions,
        extraSettings,
      },
      { versionOverride: 'dev' },
    );
    return {
      content: { message: 'AI column configured successfully', column_id: res.configure_summarize_ai_column?.column_id },
    };
  }

  private async handleTranslate(
    boardId: number,
    input: ToolInputType<ConfigureAiColumnToolInput>,
    extraSettings?: { run_backfill: boolean },
  ): Promise<ToolOutputType<never>> {
    this.validateSourceType(input, 'translate');
    if (!input.target_language) {
      throw new Error('target_language is required for translate block');
    }
    const res = await this.mondayApi.request<ConfigureTranslateAiColumnMutation>(
      configureTranslateAiColumnMutation,
      {
        boardId: boardId.toString(),
        columnId: input.column_id,
        sourceType: input.source_type,
        sourceColumnId: input.source_column_id,
        targetLanguage: input.target_language,
        extraSettings,
      },
      { versionOverride: 'dev' },
    );
    return {
      content: { message: 'AI column configured successfully', column_id: res.configure_translate_ai_column?.column_id },
    };
  }

  private async handleImproveText(
    boardId: number,
    input: ToolInputType<ConfigureAiColumnToolInput>,
    extraSettings?: { run_backfill: boolean },
  ): Promise<ToolOutputType<never>> {
    this.validateSourceType(input, 'improve_text');
    const res = await this.mondayApi.request<ConfigureImproveTextAiColumnMutation>(
      configureImproveTextAiColumnMutation,
      {
        boardId: boardId.toString(),
        columnId: input.column_id,
        sourceType: input.source_type,
        sourceColumnId: input.source_column_id,
        tone: input.tone,
        length: input.improver_length,
        refinementType: input.refinement_type,
        extraSettings,
      },
      { versionOverride: 'dev' },
    );
    return {
      content: { message: 'AI column configured successfully', column_id: res.configure_improve_text_ai_column?.column_id },
    };
  }

  private async handleExtract(
    boardId: number,
    input: ToolInputType<ConfigureAiColumnToolInput>,
    extraSettings?: { run_backfill: boolean },
  ): Promise<ToolOutputType<never>> {
    this.validateSourceType(input, 'extract');
    if (!input.entity_type) {
      throw new Error('entity_type is required for extract block');
    }
    if (input.entity_type === 'custom' && !input.custom_instructions) {
      throw new Error('custom_instructions is required for extract block when entity_type is "custom"');
    }
    const res = await this.mondayApi.request<ConfigureExtractAiColumnMutation>(
      configureExtractAiColumnMutation,
      {
        boardId: boardId.toString(),
        columnId: input.column_id,
        sourceType: input.source_type,
        sourceColumnId: input.source_column_id,
        entityType: input.entity_type,
        customInstructions: input.custom_instructions,
        additionalInstructions: input.additional_instructions,
        extraSettings,
      },
      { versionOverride: 'dev' },
    );
    return {
      content: { message: 'AI column configured successfully', column_id: res.configure_extract_ai_column?.column_id },
    };
  }

  private async handleOpenBlock(
    boardId: number,
    input: ToolInputType<ConfigureAiColumnToolInput>,
    extraSettings?: { run_backfill: boolean },
  ): Promise<ToolOutputType<never>> {
    if (!input.ai_query) {
      throw new Error('ai_query is required for open_block block');
    }
    const res = await this.mondayApi.request<ConfigureOpenBlockAiColumnMutation>(
      configureOpenBlockAiColumnMutation,
      {
        boardId: boardId.toString(),
        columnId: input.column_id,
        aiQuery: input.ai_query,
        extraSettings,
      },
      { versionOverride: 'dev' },
    );
    return {
      content: { message: 'AI column configured successfully', column_id: res.configure_open_block_ai_column?.column_id },
    };
  }

  private async handleWriteMe(
    boardId: number,
    input: ToolInputType<ConfigureAiColumnToolInput>,
    extraSettings?: { run_backfill: boolean },
  ): Promise<ToolOutputType<never>> {
    if (!input.ai_query) {
      throw new Error('ai_query is required for write_me block');
    }
    if (!input.tone) {
      throw new Error('tone is required for write_me block');
    }
    if (!input.output_length) {
      throw new Error('output_length is required for write_me block');
    }
    const res = await this.mondayApi.request<ConfigureWriteMeAiColumnMutation>(
      configureWriteMeAiColumnMutation,
      {
        boardId: boardId.toString(),
        columnId: input.column_id,
        aiQuery: input.ai_query,
        tone: input.tone,
        length: input.output_length,
        extraSettings,
      },
      { versionOverride: 'dev' },
    );
    return {
      content: { message: 'AI column configured successfully', column_id: res.configure_write_me_ai_column?.column_id },
    };
  }

  private async handlePersonAssignment(
    boardId: number,
    input: ToolInputType<ConfigureAiColumnToolInput>,
    extraSettings?: { run_backfill: boolean },
  ): Promise<ToolOutputType<never>> {
    this.validateSourceType(input, 'person_assignment');
    if (!input.groups || input.groups.length === 0) {
      throw new Error('groups is required for person_assignment block');
    }
    const res = await this.mondayApi.request<ConfigurePersonAssignmentAiColumnMutation>(
      configurePersonAssignmentAiColumnMutation,
      {
        boardId: boardId.toString(),
        columnId: input.column_id,
        sourceType: input.source_type,
        sourceColumnId: input.source_column_id,
        groups: input.groups,
        extraSettings,
      },
      { versionOverride: 'dev' },
    );
    return {
      content: { message: 'AI column configured successfully', column_id: res.configure_person_assignment_ai_column?.column_id },
    };
  }
}
