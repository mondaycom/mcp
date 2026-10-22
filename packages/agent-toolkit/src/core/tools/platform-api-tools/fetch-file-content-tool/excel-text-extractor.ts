import { Readable } from 'stream';
import ExcelJS from 'exceljs';
import { putWorkbookPartsFirst } from './xlsx-entry-order';

const MAX_EXCEL_TEXT_LENGTH = 5_000_000;
export const EXCEL_PARSE_DEADLINE_MS = 20_000;

// The streaming reader skips data validations and merged ranges, which the full-workbook loader expands
// cell by cell (a full-column validation alone is over a million entries), and it yields to the event loop.
// `styles: 'cache'` is needed so date cells come back as Date instead of serial numbers.
const READER_OPTIONS: Partial<ExcelJS.stream.xlsx.WorkbookStreamReaderOptions> = {
  worksheets: 'emit',
  sharedStrings: 'cache',
  styles: 'cache',
  hyperlinks: 'ignore',
  entries: 'ignore',
};

export function cellToString(value: ExcelJS.CellValue): string {
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

// Joins a row's cells with commas, without the empty cells at the end of the row.
function rowToLine(row: ExcelJS.Row): string {
  const values = (row.values as ExcelJS.CellValue[]).slice(1); // row.values is 1-based
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
  const lines: string[] = [];
  let length = 0;
  const addLine = (line: string) => {
    lines.push(line);
    length += line.length + 1;
  };

  const input = Readable.from(await putWorkbookPartsFirst(buffer));
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(input, READER_OPTIONS);
  let truncatedBy: ExcelExtractionResult['truncatedBy'];

  try {
    sheets: for await (const sheet of reader) {
      if (lines.length > 0) addLine('');
      addLine(`=== Sheet: ${(sheet as NamedWorksheetReader).name} ===`);
      for await (const row of sheet) {
        if (now() - startedAt > deadlineMs) {
          truncatedBy = 'time';
          break sheets;
        }
        const line = rowToLine(row);
        if (line === '') continue; // a row that only carries formatting
        addLine(line);
        if (length >= maxTextLength) {
          truncatedBy = 'size';
          break sheets;
        }
      }
    }
  } finally {
    input.destroy();
  }

  const text = lines.join('\n');
  return truncatedBy ? { text: text.slice(0, maxTextLength), truncatedBy } : { text };
}
