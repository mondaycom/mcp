import { randomUUID } from 'crypto';
import {
  BlockAlignment,
  BlockDirection,
  CreateBlockInput,
  DocsMention,
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

/**
 * Maps delta ops to GraphQL OperationInput[] for the create_doc_blocks path.
 * Blot types (mention, column_value) use the BlotInput wrapper required by the typed GraphQL input.
 */
function mapDeltaFormat(ops: DeltaOperation[]): OperationInput[] {
  return ops.map((op) => {
    if ('mention' in op.insert) {
      const numericId = Number(op.insert.mention.id);
      if (Number.isNaN(numericId)) {
        throw new Error(`Invalid mention id: "${op.insert.mention.id}" is not a valid numeric ID`);
      }
      return {
        insert: {
          // GraphQL ID scalar expects a string — validated as numeric above, passed as string here
          blot: { mention: { id: String(numericId), type: op.insert.mention.type as DocsMention } },
        },
      };
    }
    if ('column_value' in op.insert) {
      return {
        insert: {
          // GraphQL ID scalar expects a string
          blot: { column_value: { item_id: String(op.insert.column_value.item_id), column_id: op.insert.column_value.column_id } },
        },
      };
    }
    return {
      insert: { text: op.insert.text },
      attributes: mapAttributes(op.attributes),
    };
  });
}

/**
 * Maps delta ops to the server-internal format for the update_doc_block path (raw JSON).
 * No BlotInput wrapper — blots are embedded directly in the insert value.
 */
function mapDeltaFormatRaw(ops: DeltaOperation[]): Record<string, unknown>[] {
  return ops.map((op) => {
    if ('mention' in op.insert) {
      const numericId = Number(op.insert.mention.id);
      if (Number.isNaN(numericId)) {
        throw new Error(`Invalid mention id: "${op.insert.mention.id}" is not a valid numeric ID`);
      }
      return { insert: { mention: { id: numericId, type: op.insert.mention.type } } };
    }
    if ('column_value' in op.insert) {
      return {
        insert: {
          macro: {
            type: 'COLUMN_VALUE',
            macroId: randomUUID(),
            // Raw JSON format expects a numeric itemId (unlike GraphQL ID scalar which uses string)
            macroData: { itemId: Number(op.insert.column_value.item_id), columnId: op.insert.column_value.column_id },
          },
        },
      };
    }
    return {
      insert: op.insert.text,
      attributes: mapAttributes(op.attributes),
    };
  });
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

function addCommentToOp(op: Record<string, unknown>, postId: string | number): Record<string, unknown> {
  const attrs = (op.attributes as Record<string, unknown>) || {};
  const prevComments = (attrs.comments as Array<string | number>) || [];
  return { ...op, attributes: { ...attrs, comments: [...prevComments, postId] } };
}

/**
 * Injects `postId` into the `comments` attribute of delta ops that overlap
 * the character range [from, from+length). Text ops are split at boundaries
 * so only the selected characters are annotated. Blot ops (non-string insert)
 * are treated as length 1 and annotated as a whole when inside the range.
 * Throws if an op has a null or missing insert — delta ops must have an insert value.
 */
export function applyCommentToDelta(
  deltaFormat: Record<string, unknown>[],
  postId: string | number,
  from: number,
  length: number,
): Record<string, unknown>[] {
  const selEnd = from + length;
  let cursor = 0;
  const result: Record<string, unknown>[] = [];

  for (const op of deltaFormat) {
    const insert = op.insert;
    if (insert == null) {
      throw new Error(
        `Unexpected delta op at position ${cursor}: op has no 'insert' field. ` +
          `Block content may be from an unsupported block type.`,
      );
    }
    const opLen = typeof insert === 'string' ? insert.length : 1;
    const opStart = cursor;
    const opEnd = opStart + opLen;
    const overlapStart = Math.max(opStart, from);
    const overlapEnd = Math.min(opEnd, selEnd);

    if (overlapStart >= overlapEnd) {
      result.push(op);
    } else if (typeof insert !== 'string') {
      result.push(addCommentToOp(op, postId));
    } else {
      if (overlapStart > opStart) {
        result.push({ ...op, insert: insert.slice(0, overlapStart - opStart) });
      }
      result.push(addCommentToOp({ ...op, insert: insert.slice(overlapStart - opStart, overlapEnd - opStart) }, postId));
      if (overlapEnd < opEnd) {
        result.push({ ...op, insert: insert.slice(overlapEnd - opStart) });
      }
    }

    cursor = opEnd;
  }

  return result;
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
      return {
        image_block: block.asset_id != null
          ? { asset_id: String(block.asset_id), width: block.width }
          : { public_url: block.public_url!, width: block.width },
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
