import { Readable } from 'stream';
import ExcelJS from 'exceljs';

const MAX_EXCEL_TEXT_LENGTH = 5_000_000;
export const EXCEL_PARSE_DEADLINE_MS = 20_000;

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

interface ExcelExtractionOptions {
  maxTextLength?: number;
  deadlineMs?: number;
  now?: () => number;
}

export interface ExcelExtractionResult {
  text: string;
  truncatedBy?: 'size' | 'time';
}

// WorksheetReader typings omit `name`, which the reader sets from the workbook's sheet list.
type NamedWorksheetReader = ExcelJS.stream.xlsx.WorksheetReader & { name: string };

function rowToLine(values: ExcelJS.CellValue[]): string {
  let end = values.length;
  while (end > 0 && cellToString(values[end - 1]) === '') end--;
  return values.slice(0, end).map(cellToString).join(',');
}

export async function extractTextFromExcel(
  buffer: Buffer,
  {
    maxTextLength = MAX_EXCEL_TEXT_LENGTH,
    deadlineMs = EXCEL_PARSE_DEADLINE_MS,
    now = Date.now,
  }: ExcelExtractionOptions = {},
): Promise<ExcelExtractionResult> {
  const startedAt = now();
  const input = Readable.from(buffer);
  // The streaming reader skips data validations and merged ranges, which the full-workbook loader expands
  // cell by cell (a full-column validation alone is over a million entries), and it yields to the event loop.
  // `styles: 'cache'` is needed so date cells come back as Date instead of serial numbers.
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(input, {
    worksheets: 'emit',
    sharedStrings: 'cache',
    styles: 'cache',
    hyperlinks: 'ignore',
    entries: 'ignore',
  });

  const parts: string[] = [];
  let length = 0;
  let truncatedBy: ExcelExtractionResult['truncatedBy'];

  try {
    for await (const worksheet of reader) {
      const sheet = worksheet as NamedWorksheetReader;
      const header = `=== Sheet: ${sheet.name} ===`;
      const rows: string[] = [];
      parts.push(header);
      length += header.length + 2;
      for await (const row of sheet) {
        if (now() - startedAt > deadlineMs) {
          truncatedBy = 'time';
          break;
        }
        const line = rowToLine((row.values as ExcelJS.CellValue[]).slice(1));
        rows.push(line);
        length += line.length + 1;
        if (length >= maxTextLength) {
          truncatedBy = 'size';
          break;
        }
      }
      parts[parts.length - 1] = `${header}\n${rows.join('\n')}`;
      if (truncatedBy) break;
    }
  } finally {
    input.destroy();
  }

  const text = parts.join('\n\n');
  if (!truncatedBy) return { text };
  return { text: text.slice(0, maxTextLength), truncatedBy };
}
