import { z } from 'zod';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { getDocumentProxy, extractText } from 'unpdf';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_TEXT_LENGTH = 50_000;

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico']);
const PDF_EXTENSIONS = new Set(['.pdf']);
const WORD_EXTENSIONS = new Set(['.doc', '.docx']);
const EXCEL_EXTENSIONS = new Set(['.xlsx', '.xls']);
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.csv', '.json']);

const GET_ITEM_ASSETS_QUERY = `
  query GetItemAssets($itemId: [ID!]!, $columnId: [String!]!) {
    items(ids: $itemId) {
      assets(column_ids: $columnId) {
        public_url
        name
        file_extension
      }
    }
  }
`;

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
};

function truncateText(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  return `${text.slice(0, MAX_TEXT_LENGTH)}[Content truncated — original length: ${text.length} characters]`;
}

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

async function downloadWithSizeLimit(url: string): Promise<Buffer> {
  const response = await fetch(url);
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

function extractTextFromExcel(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    parts.push(`=== Sheet: ${sheetName} ===\n${csv}`);
  }
  return parts.join('\n\n');
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
- Word documents (.doc, .docx): extracted text content
- PDF files (.pdf): extracted text content
- Excel files (.xlsx, .xls): extracted text content per sheet
- Images (.png, .jpg, .gif, .webp, .svg, .bmp, .ico): returns the public URL so you can view or analyze the image directly

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
    const { item_id, column_id, file_name } = input;

    const response = await this.mondayApi.request<GetItemAssetsResponse>(GET_ITEM_ASSETS_QUERY, {
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

    const asset = assets[0];
    const ext = resolveExtension(asset, file_name);

    try {
      if (IMAGE_EXTENSIONS.has(ext)) {
        return {
          content: {
            file_name: asset.name,
            file_extension: ext,
            content_type: 'image',
            public_url: asset.public_url,
            message: 'Image file — use the public_url to view or analyze its content.',
          },
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
        text = extractTextFromExcel(buffer);
        contentType = 'excel';
      } else if (TEXT_EXTENSIONS.has(ext)) {
        text = buffer.toString('utf-8');
        contentType = 'text';
      } else {
        // Unknown — attempt UTF-8 decoding
        text = buffer.toString('utf-8');
        contentType = 'unknown';
      }

      return {
        content: {
          file_name: asset.name,
          file_extension: ext,
          content_type: contentType,
          text: truncateText(text),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: {
          message: `Failed to fetch file content: ${message}`,
          file_name: asset.name,
          file_extension: ext,
        },
      };
    }
  }
}
