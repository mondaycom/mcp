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

function mapDeltaFormat(ops: DeltaOperation[]): OperationInput[] {
  return ops.map((op) => ({
    insert: { text: op.insert.text },
    attributes: op.attributes
      ? {
          bold: op.attributes.bold,
          italic: op.attributes.italic,
          underline: op.attributes.underline,
          strike: op.attributes.strike,
          code: op.attributes.code,
          link: op.attributes.link,
          color: op.attributes.color,
          background: op.attributes.background,
        }
      : undefined,
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
        deltaFormat: mapDeltaFormat(input.delta_format),
        alignment: input.alignment,
        direction: input.direction,
      };
    case 'code':
      return {
        deltaFormat: mapDeltaFormat(input.delta_format),
        language: input.language,
      };
    case 'list_item':
      return {
        deltaFormat: mapDeltaFormat(input.delta_format),
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
      if (!block.public_url && !block.asset_id) {
        throw new Error('Image block requires either public_url or asset_id.');
      }
      return {
        image_block: {
          ...(block.asset_id ? { asset_id: block.asset_id } : { public_url: block.public_url }),
          width: block.width,
        },
      };
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
