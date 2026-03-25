import {
  BlockAlignment,
  BlockDirection,
  CreateBlockInput,
  ListBlock,
  NoticeBoxTheme,
  OperationInput,
  TextBlock,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { DeltaOperation, UpdateBlockContent, CreateBlock } from './update-doc-tool.schema';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapAlignment(a?: string): BlockAlignment | undefined {
  if (!a) return undefined;
  return a as BlockAlignment;
}

function mapDirection(d?: string): BlockDirection | undefined {
  if (!d) return undefined;
  return d as BlockDirection;
}

function mapAttributes(attributes: DeltaOperation['attributes']) {
  if (!attributes) return undefined;
  return {
    bold: attributes.bold,
    italic: attributes.italic,
    underline: attributes.underline,
    strike: attributes.strike,
    code: attributes.code,
    link: attributes.link,
    color: attributes.color,
    background: attributes.background,
  };
}

function mapDeltaFormat(ops: DeltaOperation[]): OperationInput[] {
  return ops.map((op) => ({
    insert: { text: op.insert.text },
    attributes: mapAttributes(op.attributes),
  }));
}

/**
 * Maps delta ops to the server-internal format for the update_doc_block path (raw JSON).
 * Plain text inserts must be bare strings, not wrapped in an object.
 */
function mapDeltaFormatRaw(ops: DeltaOperation[]): Record<string, unknown>[] {
  return ops.map((op) => ({
    insert: op.insert.text,
    attributes: mapAttributes(op.attributes),
  }));
}

/**
 * Translates the typed UpdateBlockContent union to a raw JSON object
 * suitable for the update_doc_block `content` argument.
 */
export function buildUpdateBlockContent(input: UpdateBlockContent): Record<string, unknown> {
  switch (input.block_content_type) {
    case 'text':
      return {
        deltaFormat: mapDeltaFormatRaw(input.delta_format),
        alignment: input.alignment,
        direction: input.direction,
      };
    case 'code':
      return {
        deltaFormat: mapDeltaFormatRaw(input.delta_format),
        language: input.language,
      };
    case 'list_item':
      return {
        deltaFormat: mapDeltaFormatRaw(input.delta_format),
        checked: input.checked,
        indentation: input.indentation,
      };
    default: {
      const unhandled = (input as { block_content_type: string }).block_content_type;
      throw new Error(`Unsupported block_content_type: "${unhandled}"`);
    }
  }
}

/**
 * Translates the typed CreateBlock union to a GraphQL CreateBlockInput object.
 */
export function buildCreateBlockInput(block: CreateBlock): CreateBlockInput {
  switch (block.block_type) {
    case 'text':
      return {
        text_block: {
          delta_format: mapDeltaFormat(block.delta_format),
          text_block_type: block.text_block_type ? (block.text_block_type as TextBlock) : undefined,
          alignment: mapAlignment(block.alignment),
          direction: mapDirection(block.direction),
        },
      };
    case 'list_item':
      return {
        list_block: {
          delta_format: mapDeltaFormat(block.delta_format),
          list_block_type: block.list_block_type ? (block.list_block_type as ListBlock) : undefined,
          indentation: block.indentation,
        },
      };
    case 'code':
      return {
        text_block: {
          delta_format: mapDeltaFormat(block.delta_format),
          text_block_type: TextBlock.Code,
        },
      };
    case 'divider':
      return { divider_block: {} };
    case 'page_break':
      return { page_break_block: {} };
    case 'image': {
      if (block.asset_id == null && !block.public_url) {
        throw new Error('image block requires either asset_id or public_url');
      }
      const imageBlockInput = block.asset_id != null
        ? { asset_id: String(block.asset_id), width: block.width }
        : { public_url: block.public_url!, width: block.width };
      return { image_block: imageBlockInput };
    }
    case 'video':
      return {
        video_block: {
          raw_url: block.raw_url,
          width: block.width,
        },
      };
    case 'notice_box':
      return {
        notice_box_block: {
          theme: block.theme as NoticeBoxTheme, // schema values match enum: INFO/TIPS/WARNING/GENERAL
        },
      };
    case 'table':
      return {
        table_block: {
          row_count: block.row_count,
          column_count: block.column_count,
          width: block.width,
          column_style: block.column_style?.map((c) => ({ width: c.width })),
        },
      };
    case 'layout':
      return {
        layout_block: {
          column_count: block.column_count,
          column_style: block.column_style?.map((c) => ({ width: c.width })),
        },
      };
    default: {
      const unhandled = (block as { block_type: string }).block_type;
      throw new Error(`Unsupported block_type: "${unhandled}"`);
    }
  }
}
