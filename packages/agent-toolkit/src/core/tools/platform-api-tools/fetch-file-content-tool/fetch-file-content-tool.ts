import { z } from 'zod';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import { getDocumentProxy, extractText } from 'unpdf';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getItemAssets } from './fetch-file-content-tool.graphql';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_TEXT_LENGTH = 50_000;

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico']);
const PDF_EXTENSIONS = new Set(['.pdf']);
const WORD_EXTENSIONS = new Set(['.docx']);
const EXCEL_EXTENSIONS = new Set(['.xlsx']);
const LEGACY_EXCEL_EXTENSIONS = new Set(['.xls']);
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.csv', '.json']);

interface Asset {
  public_url: string;
  name: string;
  file_extension: string;
}

interface GetItemAssetsResponse {
  items: Array<{
    assets: Asset[];
  }>;
}

export const fetchFileContentToolSchema = {
  item_id: z.string().describe('The ID of the item that contains the file. Obtained from get_board_items_page results.'),
  column_id: z
    .string()
    .describe('The ID of the files column containing the file. Obtained from the board schema.'),
  file_name: z
    .string()
    .optional()
    .describe(
      'Optional file name hint used to determine the file type when the asset name is ambiguous. Include the extension (e.g. "report.pdf").',
    ),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      'Character offset to start reading from. Use when a previous response indicated the content was truncated (has_more: true). Defaults to 0.',
    ),
};

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return '';
  return filename.slice(dot).toLowerCase();
}

function resolveExtension(asset: Asset, fileNameHint?: string): string {
  if (fileNameHint) {
    const ext = getExtension(fileNameHint);
    if (ext) return ext;
  }
  if (asset.file_extension) {
    return asset.file_extension.startsWith('.') ? asset.file_extension.toLowerCase() : `.${asset.file_extension.toLowerCase()}`;
  }
  return getExtension(asset.name);
}

const DOWNLOAD_TIMEOUT_MS = 30_000;

async function downloadWithSizeLimit(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Failed to download file: HTTP ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds the 10 MB size limit (Content-Length: ${contentLength} bytes)`);
  }

  if (!response.body) {
    throw new Error('Response body is empty');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    let readResult = await reader.read();
    while (!readResult.done) {
      const { value } = readResult;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_FILE_SIZE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error(`File exceeds the 10 MB size limit`);
      }
      chunks.push(value);
      readResult = await reader.read();
    }
  } catch (err) {
    await reader.cancel().catch(() => undefined);
    throw err;
  }

  return Buffer.concat(chunks);
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function extractTextFromWord(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('result' in value) return cellToString((value as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
    if ('richText' in value) return (value as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join('');
    if ('hyperlink' in value) return (value as ExcelJS.CellHyperlinkValue).text ?? '';
  }
  return '';
}

async function extractTextFromExcel(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const parts: string[] = [];
  workbook.eachSheet((sheet) => {
    const rows: string[] = [];
    sheet.eachRow((row) => {
      const values = (row.values as ExcelJS.CellValue[]).slice(1);
      rows.push(values.map(cellToString).join(','));
    });
    parts.push(`=== Sheet: ${sheet.name} ===\n${rows.join('\n')}`);
  });
  return parts.join('\n\n');
}

async function processAsset(asset: Asset, offset: number, fileNameHint?: string): Promise<Record<string, unknown>> {
  const ext = resolveExtension(asset, fileNameHint);
  try {
    if (IMAGE_EXTENSIONS.has(ext)) {
      return {
        file_name: asset.name,
        file_extension: ext,
        content_type: 'image',
        public_url: asset.public_url,
        message: 'Image file — use the public_url to view or analyze its content.',
      };
    }

    if (LEGACY_EXCEL_EXTENSIONS.has(ext)) {
      return {
        file_name: asset.name,
        file_extension: ext,
        message: 'Legacy .xls format is not supported. Please convert the file to .xlsx and re-upload.',
      };
    }

    const buffer = await downloadWithSizeLimit(asset.public_url);

    let text: string;
    let contentType: string;

    if (PDF_EXTENSIONS.has(ext)) {
      text = await extractTextFromPdf(buffer);
      contentType = 'pdf';
    } else if (WORD_EXTENSIONS.has(ext)) {
      text = await extractTextFromWord(buffer);
      contentType = 'word';
    } else if (EXCEL_EXTENSIONS.has(ext)) {
      text = await extractTextFromExcel(buffer);
      contentType = 'excel';
    } else if (TEXT_EXTENSIONS.has(ext)) {
      text = buffer.toString('utf-8');
      contentType = 'text';
    } else {
      text = buffer.toString('utf-8');
      contentType = 'unknown';
    }

    const chunk = text.slice(offset, offset + MAX_TEXT_LENGTH);
    const hasMore = text.length > offset + MAX_TEXT_LENGTH;

    return {
      file_name: asset.name,
      file_extension: ext,
      content_type: contentType,
      text: chunk,
      total_length: text.length,
      ...(PDF_EXTENSIONS.has(ext) && { public_url: asset.public_url }),
      ...(hasMore && { has_more: true, next_offset: offset + MAX_TEXT_LENGTH }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      message: `Failed to fetch file content: ${message}`,
      file_name: asset.name,
      file_extension: ext,
    };
  }
}

export class FetchFileContentTool extends BaseMondayApiTool<typeof fetchFileContentToolSchema, never> {
  name = 'fetch_file_content';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Fetch File Content',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Fetch and extract the text content from a file stored in a monday.com files column.

Use this tool when you need to read, summarize, or analyze the content of files attached to board items. Provide the item ID and column ID from the get_board_items_page response — the column value will be a URL like "https://monday.com/protected_static/..." indicating a file is present (null means no file).

PROACTIVE USE: If you retrieve board items and notice a files column with a non-null value (a URL), consider fetching its content if it could help answer the user's question — don't wait to be explicitly asked.

Supported file types and what is returned:
- Text files (.txt, .md, .csv, .json): raw text content
- Word documents (.docx): extracted text content
- PDF files (.pdf): extracted text content
- Excel files (.xlsx, .xls): extracted text content per sheet
- Images (.png, .jpg, .gif, .webp, .svg, .bmp, .ico): returns the public URL so you can view or analyze the image directly

Text responses include a total_length field. If has_more is true, the content was truncated — you can call this tool again with next_offset if you need the remaining content.

When to use:
- User asks to summarize, read, or analyze the content of a file in a files column
- User asks questions about what is inside a file (e.g., "what does the PDF say?")
- User wants to extract data from a CSV or Excel file attached to a board item
- A board item has a files column with a non-null value and the user's question may be answered by its content — even if the user didn't explicitly ask to read the file

When NOT to use:
- The files column value is null (no file uploaded for that item)`;
  }

  getInputSchema(): typeof fetchFileContentToolSchema {
    return fetchFileContentToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof fetchFileContentToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const { item_id, column_id, file_name, offset = 0 } = input;

    const response = await this.mondayApi.request<GetItemAssetsResponse>(getItemAssets, {
      itemId: [item_id],
      columnId: [column_id],
    });

    const assets = response?.items?.[0]?.assets;
    if (!assets || assets.length === 0) {
      return {
        content: {
          message: `No file found for item ${item_id} in column ${column_id}. The column may be empty or the column ID may be incorrect.`,
        },
      };
    }

    const files = await Promise.all(assets.map((asset) => processAsset(asset, offset, file_name)));

    return { content: { files } };
  }
}
